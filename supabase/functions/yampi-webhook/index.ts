import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[YAMPI-WEBHOOK] ${step}${detailsStr}`);
};

// Map Yampi order status to internal subscription status
const STATUS_MAP: Record<string, string> = {
  paid: "active",
  approved: "active",
  pending: "trialing",
  cancelled: "canceled",
  refunded: "canceled",
  chargeback: "canceled",
  expired: "expired",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    // Shared-secret check: configure the same value as YAMPI_WEBHOOK_SECRET here
    // and as a custom header ("x-webhook-secret") on the webhook URL in the Yampi dashboard.
    const expectedSecret = Deno.env.get("YAMPI_WEBHOOK_SECRET");
    if (!expectedSecret) {
      logStep("YAMPI_WEBHOOK_SECRET not configured, rejecting (fail closed)");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    const receivedSecret = req.headers.get("x-webhook-secret");
    if (receivedSecret !== expectedSecret) {
      logStep("Invalid or missing webhook secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const body = await req.json();
    logStep("Payload", body);

    // Yampi sends events with event type and resource data
    const event = body.event || body.type;
    const resource = body.resource || body.data;

    if (!resource) {
      throw new Error("No resource data in webhook payload");
    }

    // Extract user identification from metadata or customer data
    const metadata = resource.metadata || {};
    const userId = metadata.user_id;
    const userEmail = metadata.user_email || resource.customer?.email;
    const plan = metadata.plan;
    const orderStatus = resource.status?.data?.alias || resource.status || "";

    logStep("Parsed event", { event, userId, userEmail, plan, orderStatus });

    if (!userId && !userEmail) {
      logStep("No user identification found, skipping");
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Find the clinic for this user
    let clinicId: string | null = null;

    if (userId) {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("clinic_id")
        .eq("id", userId)
        .single();
      clinicId = profile?.clinic_id || null;
    }

    if (!clinicId && userEmail) {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("clinic_id")
        .eq("email", userEmail)
        .single();
      clinicId = profile?.clinic_id || null;
    }

    if (!clinicId) {
      logStep("No clinic found for user, skipping");
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Map the status
    const internalStatus = STATUS_MAP[orderStatus] || "no_subscription";

    // Calculate period end (30 days from now for monthly, 365 for annual)
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30); // Default monthly

    // Update clinica subscription data
    const updateData: Record<string, any> = {
      status_assinatura: internalStatus,
    };

    if (plan) {
      updateData.plano = plan;
    }

    if (internalStatus === "active") {
      updateData.current_period_end = periodEnd.toISOString();
    }

    const { error: updateError } = await supabaseClient
      .from("clinicas")
      .update(updateData)
      .eq("id", clinicId);

    if (updateError) {
      throw new Error(`Failed to update clinica: ${updateError.message}`);
    }

    logStep("Clinica updated", { clinicId, ...updateData });

    // Log the event
    if (userId) {
      await supabaseClient.from("audit_logs").insert({
        user_id: userId,
        acao: `webhook_yampi_${event || "unknown"}`,
        modulo: "assinatura",
        detalhes: {
          plan,
          status: internalStatus,
          order_status: orderStatus,
          clinic_id: clinicId,
        },
      });
    }

    return new Response(JSON.stringify({ received: true, processed: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
