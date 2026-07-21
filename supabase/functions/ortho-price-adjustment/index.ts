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

    const body = await req.json();
    const { mode, ortho_case_id, percentual_reajuste, valor_fixo_novo } = body;

    if (!mode || (mode !== "individual" && mode !== "bulk")) {
      return new Response(JSON.stringify({ error: "mode must be 'individual' or 'bulk'" }), {
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
    const clinic_id = callerClinic; // ignora valor enviado pelo cliente (usado no modo bulk)

    const today = new Date().toISOString().split("T")[0];
    let casesUpdated = 0;
    let titulosUpdated = 0;

    if (mode === "individual") {
      if (!ortho_case_id) {
        return new Response(JSON.stringify({ error: "ortho_case_id required for individual mode" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: caso } = await supabase
        .from("ortho_cases")
        .select("valor_mensalidade, clinic_id")
        .eq("id", ortho_case_id)
        .single();

      if (!caso) {
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

      let novoValor: number;
      if (valor_fixo_novo) {
        novoValor = Number(valor_fixo_novo);
      } else if (percentual_reajuste) {
        novoValor = Number(caso.valor_mensalidade) * (1 + Number(percentual_reajuste) / 100);
      } else {
        return new Response(JSON.stringify({ error: "percentual_reajuste or valor_fixo_novo required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      novoValor = Math.round(novoValor * 100) / 100;

      // Update pending titles with future due_date
      const { data: updated, error: updateErr } = await supabase
        .from("receivable_titles")
        .update({ amount: novoValor, balance: novoValor })
        .eq("ortho_case_id", ortho_case_id)
        .neq("status", "paid")
        .gte("due_date", today)
        .select("id");

      if (updateErr) throw updateErr;
      titulosUpdated = updated?.length || 0;

      // Update case
      await supabase
        .from("ortho_cases")
        .update({ valor_mensalidade: novoValor })
        .eq("id", ortho_case_id);

      casesUpdated = 1;

      // Audit log
      await supabase.from("audit_logs").insert({
        user_id: callerId,
        acao: "ortho_reajuste_individual",
        modulo: "ortodontia",
        detalhes: {
          ortho_case_id,
          valor_anterior: caso.valor_mensalidade,
          valor_novo: novoValor,
          percentual: percentual_reajuste || null,
          titulos_atualizados: titulosUpdated,
        },
      });

    } else {
      // Bulk mode (sempre restrito à clínica do usuário autenticado)
      if (!percentual_reajuste) {
        return new Response(JSON.stringify({ error: "percentual_reajuste required for bulk mode" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get active cases
      const { data: casos } = await supabase
        .from("ortho_cases")
        .select("id, valor_mensalidade")
        .eq("clinic_id", clinic_id)
        .eq("status", "ativo");

      if (!casos || casos.length === 0) {
        return new Response(JSON.stringify({ success: true, casesUpdated: 0, titulosUpdated: 0, message: "Nenhum caso ativo encontrado" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (const caso of casos) {
        const novoValor = Math.round(Number(caso.valor_mensalidade) * (1 + Number(percentual_reajuste) / 100) * 100) / 100;

        const { data: updated } = await supabase
          .from("receivable_titles")
          .update({ amount: novoValor, balance: novoValor })
          .eq("ortho_case_id", caso.id)
          .neq("status", "paid")
          .gte("due_date", today)
          .select("id");

        titulosUpdated += updated?.length || 0;

        await supabase
          .from("ortho_cases")
          .update({ valor_mensalidade: novoValor })
          .eq("id", caso.id);

        casesUpdated++;
      }

      // Audit log
      await supabase.from("audit_logs").insert({
        user_id: callerId,
        acao: "ortho_reajuste_massa",
        modulo: "ortodontia",
        detalhes: {
          clinic_id,
          percentual: percentual_reajuste,
          casos_atualizados: casesUpdated,
          titulos_atualizados: titulosUpdated,
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true, casesUpdated, titulosUpdated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
