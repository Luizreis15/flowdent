import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId: string = claimsData.claims.sub;

    const { ortho_case_id } = await req.json();
    if (!ortho_case_id) {
      return new Response(JSON.stringify({ error: "ortho_case_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: callerClinic } = await supabase.rpc("get_user_clinic_id", { _user_id: callerId });
    if (!callerClinic) {
      return new Response(JSON.stringify({ error: "Usuário sem clínica associada" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch ortho case
    const { data: caso, error: casoError } = await supabase
      .from("ortho_cases")
      .select("*")
      .eq("id", ortho_case_id)
      .single();

    if (casoError || !caso) {
      return new Response(JSON.stringify({ error: "Caso não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (caso.clinic_id !== callerClinic) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing installments
    const { data: existing } = await supabase
      .from("receivable_titles")
      .select("id")
      .eq("ortho_case_id", ortho_case_id)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: "Parcelas já foram geradas para este caso" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      clinic_id,
      patient_id,
      valor_total,
      valor_entrada,
      valor_mensalidade,
      dia_vencimento,
      total_meses,
      data_inicio,
    } = caso;

    if (!valor_mensalidade || !total_meses) {
      return new Response(JSON.stringify({ error: "Dados financeiros incompletos no caso (mensalidade e meses são obrigatórios)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default dia_vencimento to 10 if not set
    const diaVenc = dia_vencimento || 10;

    const titulos: any[] = [];
    const today = new Date();

    // Entry title if applicable
    if (valor_entrada && Number(valor_entrada) > 0) {
      titulos.push({
        clinic_id,
        patient_id,
        ortho_case_id,
        notes: "Entrada - Tratamento Ortodôntico",
        amount: Number(valor_entrada),
        balance: Number(valor_entrada),
        due_date: today.toISOString().split("T")[0],
        status: "open",
        origin: "ortodontia",
        installment_number: 0,
        total_installments: total_meses,
      });
    }

    // Monthly installments
    const startDate = new Date(data_inicio);
    for (let i = 0; i < total_meses; i++) {
      const month = startDate.getMonth() + 1 + i;
      const year = startDate.getFullYear() + Math.floor(month / 12);
      const adjustedMonth = month % 12 || 12;
      
      // Handle day overflow (e.g., day 31 in February)
      const lastDayOfMonth = new Date(year, adjustedMonth, 0).getDate();
      const day = Math.min(diaVenc, lastDayOfMonth);
      
      const dueDate = `${year}-${String(adjustedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      titulos.push({
        clinic_id,
        patient_id,
        ortho_case_id,
        notes: `Mensalidade Ortodontia ${i + 1}/${total_meses}`,
        amount: Number(valor_mensalidade),
        balance: Number(valor_mensalidade),
        due_date: dueDate,
        status: "open",
        origin: "ortodontia",
        installment_number: i + 1,
        total_installments: total_meses,
      });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("receivable_titles")
      .insert(titulos)
      .select("id");

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, count: inserted?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
