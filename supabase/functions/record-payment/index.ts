import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SinglePayment {
  title_id: string;
  amount: number;
}

interface PaymentRequest {
  // Single title mode (backward compatible)
  title_id?: string;
  amount: number;
  paid_at?: string;
  method: string;
  cash_account_id?: string;
  notes?: string;
  created_by: string;
  taxa_adquirente?: number;
  valor_liquido?: number;
  data_repasse?: string;
  antecipado?: boolean;
  emit_receipt?: boolean;
  proof_file_url?: string;
  transaction_reference?: string;
  // Batch mode
  titles?: SinglePayment[];
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

    const body: PaymentRequest = await req.json();
    const {
      amount,
      paid_at,
      method,
      cash_account_id,
      notes,
      taxa_adquirente,
      valor_liquido,
      data_repasse,
      antecipado,
      emit_receipt,
      proof_file_url,
      transaction_reference,
    } = body;
    const created_by = callerId; // ignora valor enviado pelo cliente

    if (!amount || !method) {
      return jsonResp({ error: "amount and method are required" }, 400);
    }

    // Build list of titles to pay
    let titlePayments: SinglePayment[] = [];

    if (body.titles && body.titles.length > 0) {
      titlePayments = body.titles;
    } else if (body.title_id) {
      titlePayments = [{ title_id: body.title_id, amount }];
    } else {
      return jsonResp({ error: "title_id or titles[] is required" }, 400);
    }

    const paymentDate = paid_at || new Date().toISOString();
    const isCardPayment = method === "cartao_credito" || method === "cartao_debito";
    const results: any[] = [];
    let totalPaid = 0;

    for (const tp of titlePayments) {
      // Fetch title
      const { data: title, error: titleError } = await supabase
        .from("receivable_titles")
        .select("*")
        .eq("id", tp.title_id)
        .single();

      if (titleError || !title) {
        results.push({ title_id: tp.title_id, error: "Title not found" });
        continue;
      }

      if (title.clinic_id !== callerClinic) {
        results.push({ title_id: tp.title_id, error: "Forbidden" });
        continue;
      }

      if (tp.amount <= 0) {
        results.push({ title_id: tp.title_id, error: "Amount must be positive" });
        continue;
      }

      if (tp.amount > title.balance + 0.01) {
        results.push({ title_id: tp.title_id, error: `Amount (${tp.amount}) exceeds balance (${title.balance})` });
        continue;
      }

      if (title.status === "paid" || title.status === "cancelled") {
        results.push({ title_id: tp.title_id, error: `Title already ${title.status}` });
        continue;
      }

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          patient_id: title.patient_id,
          title_id: tp.title_id,
          payment_date: paymentDate,
          payment_method: method,
          value: tp.amount,
          cash_account_id: cash_account_id || null,
          notes: notes || null,
          created_by,
          status: "completed",
          proof_file_url: proof_file_url || null,
          transaction_reference: transaction_reference || null,
        })
        .select()
        .single();

      if (paymentError) {
        console.error("Error creating payment:", paymentError);
        results.push({ title_id: tp.title_id, error: "Failed to create payment" });
        continue;
      }

      // Update title
      const currentPaid = (title.paid_amount || 0) + tp.amount;
      const newBalance = title.balance - tp.amount;
      const newStatus = newBalance <= 0.01 ? "paid" : "partial";

      const updateData: Record<string, unknown> = {
        balance: Math.max(0, newBalance),
        paid_amount: currentPaid,
        status: newStatus,
        payment_method: method,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "paid") {
        updateData.paid_at = paymentDate;
      }

      if (isCardPayment) {
        updateData.taxa_adquirente = taxa_adquirente || 0;
        updateData.valor_liquido = valor_liquido || tp.amount;
        updateData.data_repasse = data_repasse || null;
        updateData.antecipado = antecipado || false;
      }

      await supabase
        .from("receivable_titles")
        .update(updateData)
        .eq("id", tp.title_id);

      // Financial transaction
      const txValue = isCardPayment && valor_liquido ? valor_liquido : tp.amount;
      await supabase.from("financial_transactions").insert({
        clinic_id: title.clinic_id,
        date: paymentDate.split("T")[0],
        type: "receita",
        value: txValue,
        category: "Recebimento de Tratamento",
        reference: `Pagamento título #${title.title_number} - ${title.installment_label || `Parcela ${title.installment_number}/${title.total_installments}`}`,
      });

      // Card fee expense
      if (isCardPayment && taxa_adquirente && taxa_adquirente > 0) {
        await supabase.from("payable_titles").insert({
          clinic_id: title.clinic_id,
          supplier_name: "Taxa de Cartão",
          due_date: data_repasse || paymentDate.split("T")[0],
          amount: taxa_adquirente,
          balance: taxa_adquirente,
          status: "paid",
          category: "Despesas Financeiras",
          notes: `Taxa ${method === "cartao_credito" ? "crédito" : "débito"} - Título #${title.title_number}`,
          paid_at: paymentDate,
          competencia: paymentDate.slice(0, 7) + "-01",
        });

        await supabase.from("financial_transactions").insert({
          clinic_id: title.clinic_id,
          date: paymentDate.split("T")[0],
          type: "despesa",
          value: taxa_adquirente,
          category: "Taxas Financeiras",
          reference: `Taxa cartão - Título #${title.title_number}`,
        });
      }

      // Create receipt_document if requested
      let receiptId = null;
      if (emit_receipt !== false) {
        const { data: receipt } = await supabase
          .from("receipt_documents")
          .insert({
            clinic_id: title.clinic_id,
            patient_id: title.patient_id,
            payment_id: payment.id,
            issue_date: paymentDate.split("T")[0],
            amount: tp.amount,
            description: `Pagamento ${title.installment_label || `Parcela ${title.installment_number}/${title.total_installments}`}`,
            status: "issued",
            generated_by: created_by,
          })
          .select()
          .single();

        receiptId = receipt?.id;
      }

      // Commission update if fully paid
      if (newStatus === "paid" && title.budget_id) {
        await supabase
          .from("comissoes_provisoes")
          .update({ status: "a_pagar", updated_at: new Date().toISOString() })
          .eq("status", "provisao")
          .ilike("observacoes", `%${title.budget_id}%`);
      }

      // Audit log
      await supabase.from("patient_financial_audit_logs").insert({
        clinic_id: title.clinic_id,
        patient_id: title.patient_id,
        action_type: "record_payment",
        entity_type: "receivable_title",
        entity_id: tp.title_id,
        before_json: { balance: title.balance, status: title.status, paid_amount: title.paid_amount },
        after_json: { balance: Math.max(0, newBalance), status: newStatus, paid_amount: currentPaid, payment_id: payment.id },
        performed_by: created_by,
      });

      totalPaid += tp.amount;
      results.push({
        title_id: tp.title_id,
        payment_id: payment.id,
        receipt_id: receiptId,
        new_status: newStatus,
        new_balance: Math.max(0, newBalance),
        success: true,
      });
    }

    // Legacy audit_logs
    await supabase.from("audit_logs").insert({
      user_id: created_by,
      acao: "record_payment",
      modulo: "financeiro",
      detalhes: {
        titles_paid: results.filter((r) => r.success).length,
        total_paid: totalPaid,
        method,
        results,
      },
      resultado: "success",
    });

    return jsonResp({
      success: true,
      total_paid: totalPaid,
      results,
      message: `${results.filter((r) => r.success).length} payment(s) recorded. Total: ${totalPaid}`,
    });
  } catch (error: unknown) {
    console.error("Error in record-payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonResp({ error: "Internal server error", details: errorMessage }, 500);
  }
});
