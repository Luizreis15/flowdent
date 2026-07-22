import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  corsHeaders,
  internalHeaders,
  jsonResp,
  requireInternalOrClinicUser,
} from "../_shared/auth.ts";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { campaignId } = await req.json();

    if (!campaignId) {
      return jsonResp({ error: "campaignId é obrigatório" }, 400);
    }

    // Auth preliminar: precisa carregar a campanha para saber a clínica
    // Usa service role só após validar JWT/secret
    const preAuth = await requireInternalOrClinicUser(req);
    if (preAuth instanceof Response) return preAuth;
    const { supabaseAdmin, mode, clinicId: callerClinicId } = preAuth;

    console.log("[SEND-CAMPAIGN] Starting campaign:", campaignId);

    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("whatsapp_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return jsonResp({ error: "Campanha não encontrada" }, 404);
    }

    if (mode === "user" && callerClinicId !== campaign.clinic_id) {
      return jsonResp({ error: "Clínica não autorizada" }, 403);
    }

    await supabaseAdmin
      .from("whatsapp_campaigns")
      .update({ status: "sending" })
      .eq("id", campaignId);

    const { data: recipients, error: recipError } = await supabaseAdmin
      .from("whatsapp_campaign_recipients")
      .select("*, patients:patient_id(full_name)")
      .eq("campaign_id", campaignId)
      .eq("status", "pending");

    if (recipError) {
      console.error("[SEND-CAMPAIGN] Error fetching recipients:", recipError);
      throw recipError;
    }

    let sentCount = 0;
    let failCount = 0;

    for (const recipient of recipients || []) {
      try {
        const patientName = (recipient as any).patients?.full_name || "Paciente";

        const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
          method: "POST",
          headers: internalHeaders(supabaseKey),
          body: JSON.stringify({
            clinicId: campaign.clinic_id,
            phone: recipient.phone,
            messageType: "campaign",
            customMessage: campaign.message_template,
            patientName,
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          await supabaseAdmin
            .from("whatsapp_campaign_recipients")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", recipient.id);
          sentCount++;
        } else {
          await supabaseAdmin
            .from("whatsapp_campaign_recipients")
            .update({
              status: "failed",
              error_message: result.error || "Erro desconhecido",
            })
            .eq("id", recipient.id);
          failCount++;
        }
      } catch (err) {
        await supabaseAdmin
          .from("whatsapp_campaign_recipients")
          .update({ status: "failed", error_message: String(err) })
          .eq("id", recipient.id);
        failCount++;
      }

      await sleep(1000);
    }

    await supabaseAdmin
      .from("whatsapp_campaigns")
      .update({
        status: "completed",
        sent_count: sentCount,
      })
      .eq("id", campaignId);

    console.log(`[SEND-CAMPAIGN] Done. Sent: ${sentCount}, Failed: ${failCount}`);

    return jsonResp({ success: true, sentCount, failCount });
  } catch (error) {
    console.error("[SEND-CAMPAIGN] Error:", error);
    return jsonResp(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
