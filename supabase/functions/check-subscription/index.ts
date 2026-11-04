import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's clinic
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("clinic_id")
      .eq("id", user.id)
      .single();

    if (!profile?.clinic_id) {
      logStep("No clinic found for user");
      return new Response(
        JSON.stringify({ subscribed: false, status: "no_subscription" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Read subscription state from clinicas table
    const { data: clinica, error: clinicaError } = await supabaseClient
      .from("clinicas")
      .select("plano, status_assinatura, current_period_end")
      .eq("id", profile.clinic_id)
      .single();

    if (clinicaError || !clinica) {
      logStep("Clinic not found", { error: clinicaError?.message });
      return new Response(
        JSON.stringify({ subscribed: false, status: "no_subscription" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const status = clinica.status_assinatura || "no_subscription";
    const plan = clinica.plano || "starter";
    const isActive = ["active", "trialing"].includes(status);

    // Check if trial/subscription has expired
    const now = new Date();
    const periodEnd = clinica.current_period_end ? new Date(clinica.current_period_end) : null;
    const isExpired = periodEnd && periodEnd < now && status === "trialing";

    if (isExpired) {
      logStep("Trial expired", { periodEnd: clinica.current_period_end });
      return new Response(
        JSON.stringify({
          subscribed: false,
          status: "expired",
          plan,
          subscription_end: clinica.current_period_end,
          trial_end: clinica.current_period_end,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // If no period end set, treat trialing as active (grace period)
    if (!periodEnd && status === "trialing") {
      logStep("Trialing without period end - granting access");
      return new Response(
        JSON.stringify({
          subscribed: true,
          status: "trialing",
          plan,
          subscription_end: null,
          trial_end: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Subscription state from DB", { status, plan, periodEnd: clinica.current_period_end });

    return new Response(
      JSON.stringify({
        subscribed: isActive,
        status,
        plan,
        subscription_end: clinica.current_period_end,
        trial_end: status === "trialing" ? clinica.current_period_end : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
