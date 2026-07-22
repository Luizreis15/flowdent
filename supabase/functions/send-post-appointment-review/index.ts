import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  corsHeaders,
  internalHeaders,
  jsonResp,
  requireInternalOrClinicUser,
} from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { appointmentId, clinicId, patientId } = await req.json();

    console.log("[POST-REVIEW] Request:", { appointmentId, clinicId, patientId });

    if (!clinicId || !patientId) {
      return jsonResp({ error: "clinicId e patientId são obrigatórios" }, 400);
    }

    const auth = await requireInternalOrClinicUser(req, clinicId);
    if (auth instanceof Response) return auth;
    const { supabaseAdmin } = auth;

    // Vínculo paciente ↔ clínica (não confiar só no body)
    const { data: patient, error: patientError } = await supabaseAdmin
      .from("patients")
      .select("full_name, phone, clinic_id")
      .eq("id", patientId)
      .maybeSingle();

    if (patientError || !patient) {
      console.log("[POST-REVIEW] Patient not found:", patientError);
      return jsonResp({ skipped: true, reason: "Paciente não encontrado" });
    }

    if (patient.clinic_id !== clinicId) {
      return jsonResp({ error: "Paciente não pertence a esta clínica" }, 403);
    }

    if (!patient.phone) {
      return jsonResp({ skipped: true, reason: "Paciente sem telefone" });
    }

    const { data: clinic, error: clinicError } = await supabaseAdmin
      .from("clinicas")
      .select("google_review_link, nome")
      .eq("id", clinicId)
      .single();

    if (clinicError || !clinic?.google_review_link) {
      console.log("[POST-REVIEW] No Google Review link configured");
      return jsonResp({ skipped: true, reason: "Google Review link não configurado" });
    }

    const { data: automation } = await supabaseAdmin
      .from("whatsapp_automations")
      .select("is_active")
      .eq("clinic_id", clinicId)
      .eq("trigger_type", "post_appointment")
      .maybeSingle();

    if (automation && !automation.is_active) {
      console.log("[POST-REVIEW] Automation disabled");
      return jsonResp({ skipped: true, reason: "Automação desativada" });
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
      method: "POST",
      headers: internalHeaders(supabaseKey),
      body: JSON.stringify({
        clinicId,
        phone: patient.phone,
        messageType: "review",
        patientName: patient.full_name,
        googleReviewLink: clinic.google_review_link,
      }),
    });

    const result = await response.json();
    console.log("[POST-REVIEW] Result:", result);

    return jsonResp(result, response.status);
  } catch (error) {
    console.error("[POST-REVIEW] Error:", error);
    return jsonResp(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
