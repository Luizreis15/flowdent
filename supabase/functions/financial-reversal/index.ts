import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReversalRequest {
  action: "reverse_payment" | "cancel_title";
  payment_id?: string;
  title_id?: string;
  reason: string;
  performed_by: string;
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims?.sub) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }
    const callerId: string = claimsData.claims.sub;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: callerClinic } = await supabase.rpc("get_user_clinic_id", { _user_id: callerId });
    if (!callerClinic) {
      return jsonResp({ error: "Usuário sem clínica associada" }, 403);
    }

    const body: ReversalRequest = await req.json();
    const { action, reason } = body;
    const performed_by = callerId; // ignora valor enviado pelo cliente

    if (!action || !reason) {
      return jsonResp({ error: "action and reason are required" }, 400);
    }

    // ====== REVERSE PAYMENT ======
    if (action === "reverse_payment") {
      const { payment_id } = body;
      if (!payment_id) return jsonResp({ error: "payment_id is required" }, 400);

      // Fetch payment
      const { data: payment, error: pErr } = await supabase
        .from("payments")
        .select("*")
        .eq("id", payment_id)
        .single();

      if (pErr || !payment) return jsonResp({ error: "Payment not found" }, 404);
      if (payment.status === "reversed") return jsonResp({ error: "Payment already reversed" }, 400);

      // Fetch the title
      const { data: title, error: tErr } = await supabase
        .from("receivable_titles")
        .select("*")
        .eq("id", payment.title_id)
        .single();

      if (tErr || !title) return jsonResp({ error: "Associated title not found" }, 404);
      if (title.clinic_id !== callerClinic) return jsonResp({ error: "Forbidden" }, 403);

      const beforeTitle = {
        balance: title.balance,
        paid_amount: title.paid_amount,
        status: title.status,
      };

      // Reverse payment status
      await supabase
        .from("payments")
        .update({
          status: "reversed",
          notes: `${payment.notes || ""} [ESTORNADO: ${reason}]`.trim(),
        })
        .eq("id", payment_id);

      // Restore title balance
      const newPaidAmount = Math.max(0, (title.paid_amount || 0) - payment.value);
      const newBalance = title.amount - newPaidAmount;
      const newStatus = newPaidAmount <= 0 ? "open" : "partial";

      await supabase
        .from("receivable_titles")
        .update({
          paid_amount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
          paid_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", title.id);

      // Void associated receipt
      await supabase
        .from("receipt_documents")
        .update({ status: "voided" })
        .eq("payment_id", payment_id)
        .eq("status", "issued");

      // Create reversal financial transaction (negative)
      await supabase.from("financial_transactions").insert({
        clinic_id: title.clinic_id,
        date: new Date().toISOString().split("T")[0],
        type: "despesa",
        value: payment.value,
        category: "Estorno de Recebimento",
        reference: `Estorno pagamento - Título #${title.title_number} — ${reason}`,
      });

      // If card payment had a fee, reverse the fee too
      if (title.taxa_adquirente && title.taxa_adquirente > 0) {
        await supabase.from("financial_transactions").insert({
          clinic_id: title.clinic_id,
          date: new Date().toISOString().split("T")[0],
          type: "receita",
          value: title.taxa_adquirente,
          category: "Estorno Taxa Financeira",
          reference: `Estorno taxa cartão - Título #${title.title_number}`,
        });
      }

      // Reverse commission if title was fully paid
      if (title.status === "paid" && title.budget_id) {
        await supabase
          .from("comissoes_provisoes")
          .update({ status: "provisao", updated_at: new Date().toISOString() })
          .eq("status", "a_pagar")
          .ilike("observacoes", `%${title.budget_id}%`);
      }

      // Audit log
      await supabase.from("patient_financial_audit_logs").insert({
        clinic_id: title.clinic_id,
        patient_id: title.patient_id,
        action_type: "reverse_payment",
        entity_type: "payment",
        entity_id: payment_id,
        before_json: { payment_status: payment.status, ...beforeTitle },
        after_json: {
          payment_status: "reversed",
          balance: newBalance,
          paid_amount: newPaidAmount,
          status: newStatus,
          reason,
        },
        performed_by,
      });

      await supabase.from("audit_logs").insert({
        user_id: performed_by,
        acao: "reverse_payment",
        modulo: "financeiro",
        detalhes: {
          payment_id,
          title_id: title.id,
          title_number: title.title_number,
          value: payment.value,
          reason,
        },
        resultado: "success",
      });

      return jsonResp({
        success: true,
        action: "reverse_payment",
        payment_id,
        reversed_amount: payment.value,
        title_new_status: newStatus,
        title_new_balance: newBalance,
      });
    }

    // ====== CANCEL TITLE ======
    if (action === "cancel_title") {
      const { title_id } = body;
      if (!title_id) return jsonResp({ error: "title_id is required" }, 400);

      const { data: title, error: tErr } = await supabase
        .from("receivable_titles")
        .select("*")
        .eq("id", title_id)
        .single();

      if (tErr || !title) return jsonResp({ error: "Title not found" }, 404);
      if (title.clinic_id !== callerClinic) return jsonResp({ error: "Forbidden" }, 403);
      if (title.status === "cancelled") return jsonResp({ error: "Title already cancelled" }, 400);
      if (title.status === "paid") return jsonResp({ error: "Cannot cancel a fully paid title. Reverse payments first." }, 400);

      const beforeState = {
        balance: title.balance,
        paid_amount: title.paid_amount,
        status: title.status,
      };

      // If there are partial payments, reverse them first
      const { data: payments } = await supabase
        .from("payments")
        .select("id, value, status")
        .eq("title_id", title_id)
        .eq("status", "completed");

      if (payments && payments.length > 0) {
        // Mark all payments as reversed
        await supabase
          .from("payments")
          .update({
            status: "reversed",
            notes: `[CANCELAMENTO DE TÍTULO: ${reason}]`,
          })
          .eq("title_id", title_id)
          .eq("status", "completed");

        const totalReversed = payments.reduce((s, p) => s + p.value, 0);

        // Void receipts
        const paymentIds = payments.map((p) => p.id);
        await supabase
          .from("receipt_documents")
          .update({ status: "voided" })
          .in("payment_id", paymentIds)
          .eq("status", "issued");

        // Reversal transaction
        if (totalReversed > 0) {
          await supabase.from("financial_transactions").insert({
            clinic_id: title.clinic_id,
            date: new Date().toISOString().split("T")[0],
            type: "despesa",
            value: totalReversed,
            category: "Estorno por Cancelamento",
            reference: `Cancelamento título #${title.title_number} — ${reason}`,
          });
        }
      }

      // Cancel the title
      await supabase
        .from("receivable_titles")
        .update({
          status: "cancelled",
          balance: 0,
          notes: `${title.notes || ""} [CANCELADO: ${reason}]`.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", title_id);

      // Audit
      await supabase.from("patient_financial_audit_logs").insert({
        clinic_id: title.clinic_id,
        patient_id: title.patient_id,
        action_type: "cancel_title",
        entity_type: "receivable_title",
        entity_id: title_id,
        before_json: beforeState,
        after_json: { status: "cancelled", reason, payments_reversed: payments?.length || 0 },
        performed_by,
      });

      await supabase.from("audit_logs").insert({
        user_id: performed_by,
        acao: "cancel_title",
        modulo: "financeiro",
        detalhes: {
          title_id,
          title_number: title.title_number,
          original_balance: title.balance,
          payments_reversed: payments?.length || 0,
          reason,
        },
        resultado: "success",
      });

      return jsonResp({
        success: true,
        action: "cancel_title",
        title_id,
        payments_reversed: payments?.length || 0,
      });
    }

    return jsonResp({ error: "Invalid action" }, 400);
  } catch (error: unknown) {
    console.error("Error in financial-reversal:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonResp({ error: "Internal server error", details: msg }, 500);
  }
});
