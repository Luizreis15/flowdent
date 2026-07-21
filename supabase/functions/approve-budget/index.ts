import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AllocationInput {
  sequence: number;
  payment_method_planned: string;
  amount: number;
  installments_count: number;
  first_due_date: string;
  is_immediate?: boolean;
}

interface ApproveRequest {
  budget_id: string;
  approved_by: string;
  financial_responsible_id?: string | null;
  allocations?: AllocationInput[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonError("Unauthorized", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims?.sub) {
      return jsonError("Unauthorized", 401);
    }
    const callerId: string = claimsData.claims.sub;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve caller's own clinic; never trust a clinic/ownership claim from the request body
    const { data: callerClinic } = await supabase
      .rpc("get_user_clinic_id", { _user_id: callerId });
    if (!callerClinic) {
      return jsonError("Usuário sem clínica associada", 403);
    }

    const body: ApproveRequest = await req.json();
    const { budget_id, financial_responsible_id, allocations } = body;
    const approved_by = callerId; // ignora valor enviado pelo cliente

    if (!budget_id) {
      return jsonError("budget_id is required", 400);
    }

    // 1. Fetch budget with items
    const { data: budget, error: budgetError } = await supabase
      .from("budgets")
      .select(`*, budget_items(*), patients(id, full_name, clinic_id)`)
      .eq("id", budget_id)
      .single();

    if (budgetError || !budget) {
      return jsonError("Budget not found", 404);
    }

    if (budget.clinic_id !== callerClinic) {
      return jsonError("Forbidden", 403);
    }

    if (budget.status === "approved" || budget.status === "converted") {
      return jsonError("Budget already approved or converted", 400);
    }

    if (!budget.budget_items || budget.budget_items.length === 0) {
      return jsonError("Budget has no items", 400);
    }

    const totalValue = budget.final_value || budget.total_value || 0;
    const clinicId = budget.clinic_id;
    const patientId = budget.patient_id;

    // Validate professional exists on at least one item
    const defaultProfessionalId = budget.budget_items.find(
      (item: any) => item.professional_id
    )?.professional_id || null;

    if (!defaultProfessionalId) {
      return jsonError("Pelo menos um item deve ter um profissional responsável", 400);
    }

    // 2. Determine allocations — use provided or build from legacy payment_plan
    let finalAllocations: AllocationInput[] = [];

    if (allocations && allocations.length > 0) {
      // Validate total matches
      const allocTotal = allocations.reduce((s, a) => s + a.amount, 0);
      if (Math.abs(allocTotal - totalValue) > 0.01) {
        return jsonError(
          `Soma das alocações (${allocTotal}) não bate com o total do orçamento (${totalValue})`,
          400
        );
      }
      finalAllocations = allocations;
    } else {
      // Legacy: build from budget.payment_plan JSON
      const pp = budget.payment_plan as any || { parcelas: 1, entrada: 0, metodo: "pix", vencimentos: [] };
      const entrada = pp.entrada || 0;
      const parcelas = pp.parcelas || 1;
      const saldo = totalValue - entrada;

      if (entrada > 0) {
        finalAllocations.push({
          sequence: 1,
          payment_method_planned: pp.metodo || "pix",
          amount: entrada,
          installments_count: 1,
          first_due_date: new Date().toISOString().split("T")[0],
          is_immediate: true,
        });
      }

      if (saldo > 0) {
        const firstDue = pp.vencimentos?.[0] || new Date().toISOString().split("T")[0];
        finalAllocations.push({
          sequence: entrada > 0 ? 2 : 1,
          payment_method_planned: pp.metodo || "pix",
          amount: saldo,
          installments_count: parcelas,
          first_due_date: firstDue,
        });
      }
    }

    // 3. Create payment_plan
    const { data: paymentPlan, error: ppError } = await supabase
      .from("payment_plans")
      .insert({
        clinic_id: clinicId,
        patient_id: patientId,
        budget_id: budget_id,
        total_amount: totalValue,
        immediate_amount: finalAllocations
          .filter((a) => a.is_immediate)
          .reduce((s, a) => s + a.amount, 0),
        financed_amount: finalAllocations
          .filter((a) => !a.is_immediate)
          .reduce((s, a) => s + a.amount, 0),
        status: "active",
        created_by: approved_by,
      })
      .select()
      .single();

    if (ppError) {
      console.error("Error creating payment_plan:", ppError);
      return jsonError("Failed to create payment plan", 500);
    }

    // 4. Create allocations
    const allocInserts = finalAllocations.map((a) => ({
      payment_plan_id: paymentPlan.id,
      sequence: a.sequence,
      payment_method_planned: a.payment_method_planned,
      amount: a.amount,
      installments_count: a.installments_count,
      first_due_date: a.first_due_date,
      notes: a.is_immediate ? "Entrada" : null,
    }));

    const { data: savedAllocations, error: allocError } = await supabase
      .from("payment_plan_allocations")
      .insert(allocInserts)
      .select();

    if (allocError) {
      console.error("Error creating allocations:", allocError);
    }

    // 5. Generate receivable_titles (parcelas) from allocations
    const titlesToCreate: any[] = [];
    let globalInstallment = 0;

    for (let aIdx = 0; aIdx < finalAllocations.length; aIdx++) {
      const alloc = finalAllocations[aIdx];
      const allocId = savedAllocations?.[aIdx]?.id || null;
      const parcelaValue = alloc.amount / alloc.installments_count;

      for (let i = 0; i < alloc.installments_count; i++) {
        globalInstallment++;
        const dueDate = addMonths(alloc.first_due_date, i);

        const isEntrada = alloc.is_immediate && alloc.installments_count === 1;
        const label = isEntrada
          ? "Entrada"
          : alloc.installments_count === 1
          ? `Pagamento (${alloc.payment_method_planned})`
          : `Parcela ${i + 1}/${alloc.installments_count}`;

        titlesToCreate.push({
          clinic_id: clinicId,
          patient_id: patientId,
          budget_id: budget_id,
          payment_plan_id: paymentPlan.id,
          allocation_id: allocId,
          installment_number: globalInstallment,
          total_installments: 0, // Will be updated after
          due_date: dueDate,
          amount: parcelaValue,
          balance: parcelaValue,
          paid_amount: 0,
          status: "open",
          origin: "budget",
          payment_method: alloc.payment_method_planned,
          installment_label: label,
          financial_responsible_id:
            financial_responsible_id && financial_responsible_id !== "proprio"
              ? financial_responsible_id
              : null,
          notes: label,
        });
      }
    }

    // Set total_installments on all
    const totalInstallments = titlesToCreate.length;
    titlesToCreate.forEach((t) => (t.total_installments = totalInstallments));

    const { data: titles, error: titlesError } = await supabase
      .from("receivable_titles")
      .insert(titlesToCreate)
      .select();

    if (titlesError) {
      console.error("Error creating titles:", titlesError);
      return jsonError("Failed to create payment titles", 500);
    }

    // 6. Create treatment
    const { data: treatment, error: treatmentError } = await supabase
      .from("treatments")
      .insert({
        patient_id: patientId,
        clinic_id: clinicId,
        budget_id: budget_id,
        professional_id: defaultProfessionalId,
        name: budget.title || "Tratamento",
        value: totalValue,
        status: "planned",
        observations: budget.notes,
      })
      .select()
      .single();

    if (treatmentError) {
      console.error("Error creating treatment:", treatmentError);
    }

    // 7. Create treatment_items
    if (treatment) {
      const treatmentItems = budget.budget_items.map((item: any) => ({
        treatment_id: treatment.id,
        budget_item_id: item.id,
        procedure_id: item.procedure_id || null,
        professional_id: item.professional_id,
        tooth_number: item.tooth_number ? parseInt(item.tooth_number) : null,
        tooth_region: item.tooth_region,
        tooth_faces: item.tooth_faces,
        status: "planned",
        price: item.total_price,
        notes: item.notes,
      }));

      await supabase.from("treatment_items").insert(treatmentItems);
    }

    // 8. Create commission entries using rules
    await createCommissions(supabase, budget, clinicId, budget_id);

    // 9. Update budget status
    const budgetUpdateData: Record<string, unknown> = {
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: approved_by,
    };
    if (financial_responsible_id && financial_responsible_id !== "proprio") {
      budgetUpdateData.financial_responsible_contact_id = financial_responsible_id;
    }

    await supabase.from("budgets").update(budgetUpdateData).eq("id", budget_id);

    // 10. Log audit
    await supabase.from("patient_financial_audit_logs").insert({
      clinic_id: clinicId,
      patient_id: patientId,
      action_type: "approve_budget",
      entity_type: "budget",
      entity_id: budget_id,
      after_json: {
        payment_plan_id: paymentPlan.id,
        treatment_id: treatment?.id,
        titles_count: titles?.length || 0,
        total_value: totalValue,
        allocations: finalAllocations,
      },
      performed_by: approved_by,
    });

    // Legacy audit_logs
    await supabase.from("audit_logs").insert({
      user_id: approved_by,
      acao: "approve_budget",
      modulo: "budgets",
      detalhes: {
        budget_id,
        treatment_id: treatment?.id,
        payment_plan_id: paymentPlan.id,
        titles_created: titles?.length || 0,
        total_value: totalValue,
      },
      resultado: "success",
    });

    return new Response(
      JSON.stringify({
        success: true,
        payment_plan_id: paymentPlan.id,
        treatment_id: treatment?.id,
        titles_created: titles?.length || 0,
        titles: titles || [],
        message: `Budget approved. ${titles?.length || 0} installments created.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in approve-budget:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonError(errorMessage, 500);
  }
});

// === Helpers ===

function jsonError(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

async function createCommissions(supabase: any, budget: any, clinicId: string, budgetId: string) {
  const commissionEntries = [];

  for (const item of budget.budget_items) {
    if (!item.professional_id) continue;

    let rule = null;

    const { data: specificRule } = await supabase
      .from("commission_rules")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("profissional_id", item.professional_id)
      .eq("procedure_id", item.procedure_id)
      .eq("ativo", true)
      .eq("gatilho", "aprovacao")
      .single();

    if (specificRule) {
      rule = specificRule;
    } else {
      const { data: profRule } = await supabase
        .from("commission_rules")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("profissional_id", item.professional_id)
        .is("procedure_id", null)
        .eq("ativo", true)
        .eq("gatilho", "aprovacao")
        .single();

      if (profRule) {
        rule = profRule;
      } else {
        const { data: generalRule } = await supabase
          .from("commission_rules")
          .select("*")
          .eq("clinic_id", clinicId)
          .is("profissional_id", null)
          .is("procedure_id", null)
          .eq("ativo", true)
          .eq("gatilho", "aprovacao")
          .single();

        if (generalRule) rule = generalRule;
      }
    }

    let commissionAmount = 0;
    const baseValue = item.total_price || 0;

    if (rule) {
      commissionAmount =
        rule.tipo_calculo === "percentual"
          ? baseValue * ((rule.percentual || 30) / 100)
          : rule.valor_fixo || 0;

      if (rule.minimo_garantido && commissionAmount < rule.minimo_garantido) {
        commissionAmount = rule.minimo_garantido;
      }
      if (rule.teto && commissionAmount > rule.teto) {
        commissionAmount = rule.teto;
      }
    } else {
      commissionAmount = baseValue * 0.3;
    }

    if (commissionAmount > 0) {
      commissionEntries.push({
        clinic_id: clinicId,
        profissional_id: item.professional_id,
        competencia: new Date().toISOString().slice(0, 7),
        valor_provisionado: commissionAmount,
        valor_devido: commissionAmount,
        status: "provisao",
        observacoes: `Orçamento ${budget.title || budgetId} - ${item.procedure_name}`,
      });
    }
  }

  if (commissionEntries.length > 0) {
    const { error } = await supabase.from("comissoes_provisoes").insert(commissionEntries);
    if (error) console.error("Error creating commissions:", error);
  }
}
