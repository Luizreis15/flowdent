import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Chamadas de cron / edge→edge com secret compartilhado. */
export function isInternalCall(req: Request): boolean {
  const expected = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  if (!expected) return false;
  const provided = req.headers.get("x-internal-secret");
  if (!provided) return false;
  return timingSafeEqual(provided, expected);
}

export function internalHeaders(serviceRoleKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${serviceRoleKey}`,
    "x-internal-secret": Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "",
  };
}

export type AuthedCaller = {
  callerId: string;
  clinicId: string;
  supabaseAdmin: SupabaseClient;
};

/**
 * Exige JWT de usuário real e retorna clinic_id do caller.
 * Retorna Response (401/403) em falha.
 */
export async function requireUserClinic(
  req: Request,
): Promise<AuthedCaller | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResp({ error: "Não autenticado" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(
    authHeader.replace("Bearer ", ""),
  );
  if (claimsError || !claimsData?.claims?.sub) {
    return jsonResp({ error: "Não autenticado" }, 401);
  }
  const callerId: string = claimsData.claims.sub;

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: callerClinic } = await supabaseAdmin.rpc("get_user_clinic_id", {
    _user_id: callerId,
  });
  if (!callerClinic) {
    return jsonResp({ error: "Usuário sem clínica associada" }, 403);
  }

  return { callerId, clinicId: callerClinic as string, supabaseAdmin };
}

/**
 * Internal secret OU usuário autenticado da clínica.
 * Se `expectedClinicId` for passado, o clinic_id do usuário deve coincidir.
 */
export async function requireInternalOrClinicUser(
  req: Request,
  expectedClinicId?: string | null,
): Promise<{ mode: "internal" | "user"; callerId?: string; clinicId?: string; supabaseAdmin: SupabaseClient } | Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  if (isInternalCall(req)) {
    return { mode: "internal", supabaseAdmin };
  }

  const user = await requireUserClinic(req);
  if (user instanceof Response) return user;

  if (expectedClinicId && user.clinicId !== expectedClinicId) {
    return jsonResp({ error: "Clínica não autorizada" }, 403);
  }

  return {
    mode: "user",
    callerId: user.callerId,
    clinicId: user.clinicId,
    supabaseAdmin,
  };
}

/** Apenas secret interno (funções de cron). */
export function requireInternalOnly(req: Request): Response | null {
  if (isInternalCall(req)) return null;
  return jsonResp({ error: "Não autenticado" }, 401);
}
