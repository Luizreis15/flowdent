import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

const PRODUCT_MAP: Record<string, string> = {
  "prod_U7hqxLZdpDnGHN": "teste",
  "prod_U7g4hLtt0H3XvC": "solo",
  "prod_U7g4RZJUZ2coRl": "solo",
  "prod_U7g4zFoakbOVu8": "crescimento",
  "prod_U7g4zw0JYOWCMm": "crescimento",
  "prod_U7g4gvgzDEs6Ob": "premium",
  "prod_U7g4yGk6WwWwx4": "premium",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) {
      logStep("ERROR: STRIPE_SECRET_KEY not set");
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500 });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.text();
    
    let event: Stripe.Event;

    // Signature verification is mandatory — never trust an unsigned payload
    if (!webhookSecret) {
      logStep("ERROR: STRIPE_WEBHOOK_SECRET not set, rejecting (fail closed)");
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500 });
    }
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR: No stripe-signature header");
      return new Response(JSON.stringify({ error: "No signature" }), { status: 400 });
    }
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logStep("ERROR: Signature verification failed", { error: err.message });
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
    }

    logStep("Event received", { type: event.type, id: event.id });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Handle relevant events
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        logStep("Checkout session completed", { sessionId: session.id, customerId: session.customer, subscriptionId: session.subscription });
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          await handleSubscriptionChange(stripe, supabase, subscription);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(stripe, supabase, subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await handleSubscriptionChange(stripe, supabase, subscription);
          logStep("Payment succeeded, subscription updated", { customerId: invoice.customer });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await handleSubscriptionChange(stripe, supabase, subscription);
          logStep("Payment failed, subscription updated", { customerId: invoice.customer });
        }
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Trial ending soon", { 
          customerId: subscription.customer, 
          trialEnd: subscription.trial_end 
        });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function handleSubscriptionChange(
  stripe: Stripe,
  supabase: any,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const customer = await stripe.customers.retrieve(customerId);
  
  if ((customer as any).deleted) {
    logStep("Customer deleted, skipping");
    return;
  }

  const email = (customer as Stripe.Customer).email;
  if (!email) {
    logStep("No email on customer, skipping", { customerId });
    return;
  }

  // Find the profile by email
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, clinic_id")
    .eq("email", email)
    .limit(1);

  if (!profiles || profiles.length === 0) {
    logStep("No profile found for email", { email });
    return;
  }

  const clinicId = profiles[0].clinic_id;
  if (!clinicId) {
    logStep("Profile has no clinic_id", { email });
    return;
  }

  // Determine plan from product
  const productId = subscription.items.data[0]?.price?.product as string;
  const planName = PRODUCT_MAP[productId] || "starter";
  logStep("Subscription details", { productId, planName, currentPeriodEnd: subscription.current_period_end, status: subscription.status });
  const subscriptionEnd = subscription.current_period_end 
    ? new Date(subscription.current_period_end * 1000).toISOString() 
    : null;

  // Map Stripe status to our status
  let statusAssinatura = subscription.status;
  if (subscription.status === "canceled" || subscription.status === "unpaid") {
    statusAssinatura = "canceled";
  }

  const updateData: Record<string, any> = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    plano: planName,
    status_assinatura: statusAssinatura,
    current_period_end: subscriptionEnd,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("clinicas")
    .update(updateData)
    .eq("id", clinicId);

  if (error) {
    logStep("ERROR updating clinica", { clinicId, error: error.message });
  } else {
    logStep("Clinica updated", { clinicId, status: statusAssinatura, plan: planName });
  }
}
