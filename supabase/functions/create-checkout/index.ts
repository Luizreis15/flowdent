import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Map plan names to Stripe price IDs
const PLAN_PRICES: Record<string, { monthly: string; annual: string }> = {
  teste: {
    monthly: "price_1T9SR303E2WqXSt0CYW94sUW",
    annual: "price_1T9SR303E2WqXSt0CYW94sUW",
  },
  solo: {
    monthly: "price_1T9QiY03E2WqXSt0Zs3NFwx7",
    annual: "price_1T9QiZ03E2WqXSt0jATFe7uj",
  },
  crescimento: {
    monthly: "price_1T9Qia03E2WqXSt0rmkx2ZqT",
    annual: "price_1T9Qic03E2WqXSt0zPBEBxWe",
  },
  premium: {
    monthly: "price_1T9Qid03E2WqXSt0h2oXpC50",
    annual: "price_1T9Qie03E2WqXSt0eMBO1cT9",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const { plan, billingPeriod } = await req.json();
    if (!plan || !PLAN_PRICES[plan]) {
      throw new Error("Invalid plan specified");
    }

    const period = billingPeriod === "annual" ? "annual" : "monthly";
    const priceId = PLAN_PRICES[plan][period];

    if (priceId.includes("_ID")) {
      throw new Error(`Stripe price ID not configured for plan: ${plan} (${period}). Update PLAN_PRICES in create-checkout function.`);
    }

    logStep("Plan selected", { plan, period, priceId });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    }

    const origin = req.headers.get("origin") || "https://app.flowdent.com.br";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard/assinatura?checkout=cancel`,
      metadata: {
        user_id: user.id,
        plan: plan,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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
