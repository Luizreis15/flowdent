import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  corsHeaders,
  internalHeaders,
  jsonResp,
  requireInternalOnly,
} from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const denied = requireInternalOnly(req);
  if (denied) return denied;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[RUN-AUTOMATIONS] Starting daily automations check");

    const { data: scheduledCampaigns } = await supabase
      .from("whatsapp_campaigns")
      .select("id")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString());

    console.log(
      `[RUN-AUTOMATIONS] Found ${scheduledCampaigns?.length || 0} scheduled campaigns`,
    );

    for (const campaign of scheduledCampaigns || []) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-campaign-messages`, {
          method: "POST",
          headers: internalHeaders(supabaseKey),
          body: JSON.stringify({ campaignId: campaign.id }),
        });
        console.log(`[RUN-AUTOMATIONS] Triggered campaign: ${campaign.id}`);
      } catch (err) {
        console.error(
          `[RUN-AUTOMATIONS] Error triggering campaign ${campaign.id}:`,
          err,
        );
      }
    }

    const { data: automations } = await supabase
      .from("whatsapp_automations")
      .select("*, clinicas:clinic_id(id, google_review_link)")
      .eq("is_active", true)
      .in("trigger_type", ["recall", "birthday"]);

    console.log(
      `[RUN-AUTOMATIONS] Found ${automations?.length || 0} active automations`,
    );

    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    for (const auto of automations || []) {
      try {
        const clinicId = auto.clinic_id;

        if (auto.trigger_type === "birthday") {
          const { data: patients } = await supabase
            .from("patients")
            .select("id, full_name, phone, birth_date")
            .eq("clinic_id", clinicId)
            .not("phone", "is", null)
            .not("birth_date", "is", null);

          const birthdayPatients = (patients || []).filter((p: any) => {
            if (!p.birth_date) return false;
            const dob = new Date(p.birth_date);
            return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay;
          });

          console.log(
            `[RUN-AUTOMATIONS] Clinic ${clinicId}: ${birthdayPatients.length} birthdays today`,
          );

          for (const patient of birthdayPatients) {
            const todayStr = today.toISOString().split("T")[0];
            const { data: existing } = await supabase
              .from("whatsapp_message_log")
              .select("id")
              .eq("clinic_id", clinicId)
              .eq("phone", patient.phone)
              .eq("message_type", "campaign")
              .gte("created_at", todayStr)
              .maybeSingle();

            if (existing) continue;

            const msg = auto.message_template.replace(
              "{paciente}",
              patient.full_name,
            );

            await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
              method: "POST",
              headers: internalHeaders(supabaseKey),
              body: JSON.stringify({
                clinicId,
                phone: patient.phone,
                messageType: "campaign",
                customMessage: msg,
                patientName: patient.full_name,
              }),
            });

            await new Promise((r) => setTimeout(r, 1000));
          }
        }

        if (auto.trigger_type === "recall") {
          const monthsAfter = auto.trigger_config?.months_after || 6;
          const cutoffDate = new Date();
          cutoffDate.setMonth(cutoffDate.getMonth() - monthsAfter);
          const cutoffStr = cutoffDate.toISOString();

          const { data: patients } = await supabase
            .from("patients")
            .select("id, full_name, phone, updated_at")
            .eq("clinic_id", clinicId)
            .not("phone", "is", null)
            .lt("updated_at", cutoffStr)
            .limit(50);

          console.log(
            `[RUN-AUTOMATIONS] Clinic ${clinicId}: ${patients?.length || 0} recall patients`,
          );

          for (const patient of patients || []) {
            const todayStr = today.toISOString().split("T")[0];
            const { data: existing } = await supabase
              .from("whatsapp_message_log")
              .select("id")
              .eq("clinic_id", clinicId)
              .eq("phone", patient.phone)
              .eq("message_type", "campaign")
              .gte("created_at", todayStr)
              .maybeSingle();

            if (existing) continue;

            const msg = auto.message_template.replace(
              "{paciente}",
              patient.full_name,
            );

            await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
              method: "POST",
              headers: internalHeaders(supabaseKey),
              body: JSON.stringify({
                clinicId,
                phone: patient.phone,
                messageType: "campaign",
                customMessage: msg,
                patientName: patient.full_name,
              }),
            });

            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      } catch (err) {
        console.error(`[RUN-AUTOMATIONS] Error in automation ${auto.id}:`, err);
      }
    }

    console.log("[RUN-AUTOMATIONS] Done");
    return jsonResp({ success: true });
  } catch (error) {
    console.error("[RUN-AUTOMATIONS] Error:", error);
    return jsonResp(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
