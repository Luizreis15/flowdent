import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResp, requireUserClinic } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireUserClinic(req);
    if (auth instanceof Response) return auth;
    const { clinicId: callerClinicId, supabaseAdmin } = auth;

    const { clinica_id } = await req.json();

    if (!clinica_id) {
      return jsonResp({ error: "clinica_id é obrigatório" }, 400);
    }

    if (clinica_id !== callerClinicId) {
      return jsonResp({ error: "Clínica não autorizada" }, 403);
    }

    const { data: existingConfig } = await supabaseAdmin
      .from("whatsapp_configs")
      .select("*")
      .eq("clinica_id", clinica_id)
      .eq("connection_type", "web_qrcode")
      .maybeSingle();

    if (existingConfig && (existingConfig as any).connected_at) {
      return jsonResp({
        success: true,
        message: "Já conectado",
        connected: true,
      });
    }

    // QR de demonstração — não resetar conexão de clínica alheia (já bloqueado acima)
    const qrData =
      `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=WHATSAPP_CONNECT_${clinica_id}_${Date.now()}`;

    await supabaseAdmin.from("whatsapp_configs").upsert(
      {
        clinica_id: clinica_id,
        connection_type: "web_qrcode",
        qr_code: qrData,
        is_active: false,
      },
      { onConflict: "clinica_id" },
    );

    // Nota: setTimeout em edge function é frágil; mantido só como comportamento legado.
    setTimeout(async () => {
      await supabaseAdmin
        .from("whatsapp_configs")
        .update({
          connected_at: new Date().toISOString(),
          is_active: true,
          qr_code: null,
        })
        .eq("clinica_id", clinica_id);
    }, 10000);

    return jsonResp({
      success: true,
      qr_code: qrData,
      message: "QR Code gerado. Escaneie com seu WhatsApp.",
    });
  } catch (error) {
    console.error("Erro:", error);
    return jsonResp(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      400,
    );
  }
});
