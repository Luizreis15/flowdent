import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RenegotiateRequest {
  clinic_id: string;
  patient_id: string;
  created_by: string;
  title_ids: string[];
  reason?: string;
  discount_amount: number;
  entry_amount: number;
  entry_method?: string;
  entry_due_date?: string;
  installments: number;
  installment_method?: string;
  first_due_date: string;
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims?.sub) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }
    const callerId: string = claimsData.claims.sub;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: callerClinic } = await supabase.rpc("get_user_clinic_id", { _user_id: callerId });
    if (!callerClinic) {
      return jsonResp({ error: "Usuário sem clínica associada" }, 403);
    }

    const body: RenegotiateRequest = await req.json();
    const {
      patient_id, title_ids, reason,
      discount_amount, entry_amount, entry_method, entry_due_date,
      installments, installment_method, first_due_date,
    } = body;
    const clinic_id = callerClinic; // ignora valor enviado pelo cliente
    const created_by = callerId; // ignora valor enviado pelo cliente

    if (!patient_id || !title_ids?.length || !first_due_date) {
      return jsonResp({ error: "Missing required fields" }, 400);
    }

    // 1. Fetch original titles
    const { data: originalTitles, error: fetchErr } = await supabase
      .from("receivable_titles")
      .select("*")
      .in("id", title_ids)
      .eq("clinic_id", clinic_id);

    if (fetchErr || !originalTitles?.length) {
      return jsonResp({ error: "Titles not found" }, 404);
    }

    // Only renegotiate open/partial titles
    const eligible = originalTitles.filter(
      (t: any) => t.status === "open" || t.status === "partial"
    );
    if (eligible.length === 0) {
      return jsonResp({ error: "No eligible titles to renegotiate" }, 400);
    }

    const originalTotal = eligible.reduce((s: number, t: any) => s + (t.balance || 0), 0);
    const newTotal = Math.max(0, originalTotal - (discount_amount || 0));

    if (newTotal <= 0) {
      return jsonResp({ error: "New total must be positive" }, 400);
    }

    // 2. Create renegotiation record
    const { data: renego, error: renegoErr } = await supabase
      .from("renegotiations")
      .insert({
        clinic_id,
        patient_id,
        created_by,
        reason: reason || null,
        original_total: originalTotal,
        new_total: newTotal,
        discount_amount: discount_amount || 0,
        new_installments: installments + (entry_amount > 0 ? 1 : 0),
        new_entry_amount: entry_amount || 0,
        new_entry_method: entry_method || null,
        new_installment_method: installment_method || null,
        status: "active",
      })
      .select()
      .single();

    if (renegoErr || !renego) {
      console.error("Error creating renegotiation:", renegoErr);
      return jsonResp({ error: "Failed to create renegotiation" }, 500);
    }

    // 3. Link original titles and mark them as renegotiated
    const linkInserts = eligible.map((t: any) => ({
      renegotiation_id: renego.id,
      original_title_id: t.id,
      original_balance: t.balance,
    }));

    await supabase.from("renegotiation_titles").insert(linkInserts);

    // Mark originals as renegotiated
    await supabase
      .from("receivable_titles")
      .update({
        status: "renegotiated",
        renegotiation_id: renego.id,
        updated_at: new Date().toISOString(),
      })
      .in("id", eligible.map((t: any) => t.id));

    // 4. Get next title_number
    const { data: maxTitle } = await supabase
      .from("receivable_titles")
      .select("title_number")
      .eq("clinic_id", clinic_id)
      .order("title_number", { ascending: false })
      .limit(1)
      .single();

    let nextTitleNumber = (maxTitle?.title_number || 0) + 1;

    // 5. Create new titles
    const newTitles: any[] = [];
    let totalNewInstallments = installments + (entry_amount > 0 ? 1 : 0);
    let installmentIdx = 1;

    // Entry title
    if (entry_amount > 0) {
      newTitles.push({
        clinic_id,
        patient_id,
        title_number: nextTitleNumber++,
        installment_number: installmentIdx++,
        total_installments: totalNewInstallments,
        installment_label: "Entrada (Renegociação)",
        due_date: entry_due_date || first_due_date,
        amount: entry_amount,
        balance: entry_amount,
        paid_amount: 0,
        status: "open",
        origin: "manual",
        payment_method: entry_method || null,
        notes: `Renegociação #${renego.id.slice(0, 8)} — Entrada`,
        renegotiation_id: renego.id,
      });
    }

    // Installment titles
    const installmentTotal = newTotal - (entry_amount || 0);
    const installmentValue = Math.round((installmentTotal / installments) * 100) / 100;
    const lastInstallmentAdj = installmentTotal - installmentValue * (installments - 1);

    for (let i = 0; i < installments; i++) {
      const dueDate = new Date(first_due_date + "T12:00:00");
      dueDate.setMonth(dueDate.getMonth() + i);
      const isLast = i === installments - 1;
      const value = isLast ? Math.round(lastInstallmentAdj * 100) / 100 : installmentValue;

      newTitles.push({
        clinic_id,
        patient_id,
        title_number: nextTitleNumber++,
        installment_number: installmentIdx++,
        total_installments: totalNewInstallments,
        installment_label: `Parcela ${i + 1}/${installments} (Renegociação)`,
        due_date: dueDate.toISOString().split("T")[0],
        amount: value,
        balance: value,
        paid_amount: 0,
        status: "open",
        origin: "manual",
        payment_method: installment_method || null,
        notes: `Renegociação #${renego.id.slice(0, 8)}`,
        renegotiation_id: renego.id,
      });
    }

    const { error: insertErr } = await supabase
      .from("receivable_titles")
      .insert(newTitles);

    if (insertErr) {
      console.error("Error creating new titles:", insertErr);
      return jsonResp({ error: "Failed to create new titles" }, 500);
    }

    // 6. Audit log
    await supabase.from("patient_financial_audit_logs").insert({
      clinic_id,
      patient_id,
      action_type: "renegotiate",
      entity_type: "renegotiation",
      entity_id: renego.id,
      before_json: {
        original_titles: eligible.map((t: any) => ({
          id: t.id,
          balance: t.balance,
          status: t.status,
        })),
      },
      after_json: {
        renegotiation_id: renego.id,
        new_titles_count: newTitles.length,
        discount: discount_amount,
        new_total: newTotal,
      },
      performed_by: created_by,
    });

    await supabase.from("audit_logs").insert({
      user_id: created_by,
      acao: "renegotiate_titles",
      modulo: "financeiro",
      detalhes: {
        renegotiation_id: renego.id,
        original_count: eligible.length,
        original_total: originalTotal,
        new_total: newTotal,
        discount: discount_amount,
        new_titles: newTitles.length,
      },
      resultado: "success",
    });

    return jsonResp({
      success: true,
      renegotiation_id: renego.id,
      original_titles_renegotiated: eligible.length,
      new_titles_created: newTitles.length,
      original_total: originalTotal,
      new_total: newTotal,
      discount_applied: discount_amount || 0,
    });
  } catch (error: unknown) {
    console.error("Error in renegotiate-titles:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonResp({ error: "Internal server error", details: msg }, 500);
  }
});
