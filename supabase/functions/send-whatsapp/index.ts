import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  corsHeaders,
  isInternalCall,
  jsonResp,
  requireUserClinic,
} from "../_shared/auth.ts";

interface WhatsAppRequest {
  clinicId: string;
  phone: string;
  messageType: "confirmation" | "reminder" | "review" | "campaign" | "custom";
  appointmentData?: {
    patientName: string;
    date: string;
    time: string;
    procedure?: string;
    dentistName?: string;
  };
  customMessage?: string;
  googleReviewLink?: string;
  patientName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: WhatsAppRequest = await req.json();
    const {
      clinicId,
      phone,
      messageType,
      appointmentData,
      customMessage,
      googleReviewLink,
      patientName,
    } = body;

    if (!clinicId || !phone || !messageType) {
      return jsonResp({ error: "clinicId, phone e messageType são obrigatórios" }, 400);
    }

    const internal = isInternalCall(req);
    if (!internal) {
      const auth = await requireUserClinic(req);
      if (auth instanceof Response) return auth;
      if (auth.clinicId !== clinicId) {
        return jsonResp({ error: "Clínica não autorizada" }, 403);
      }
    }

    console.log("[SEND-WHATSAPP] Request received:", {
      clinicId,
      phone,
      messageType,
      auth: internal ? "internal" : "user",
    });

    const { data: config, error: configError } = await supabase
      .from("whatsapp_configs")
      .select("*")
      .eq("clinica_id", clinicId)
      .eq("is_active", true)
      .maybeSingle();

    if (configError || !config) {
      console.error("[SEND-WHATSAPP] Config not found:", configError);
      return jsonResp({ error: "WhatsApp não configurado para esta clínica" }, 400);
    }

    if (!config.instance_id || !config.instance_token) {
      console.error("[SEND-WHATSAPP] Missing Z-API credentials");
      return jsonResp({ error: "Credenciais Z-API não configuradas" }, 400);
    }

    let formattedPhone = phone.replace(/\D/g, "");
    if (formattedPhone.length === 11 || formattedPhone.length === 10) {
      formattedPhone = "55" + formattedPhone;
    }

    let message = "";

    if (messageType === "confirmation" && appointmentData) {
      message =
        config.mensagem_confirmacao ||
        `Olá ${appointmentData.patientName}! 🦷\n\nSua consulta está confirmada:\n📅 Data: ${appointmentData.date}\n⏰ Horário: ${appointmentData.time}\n${appointmentData.procedure ? `📋 Procedimento: ${appointmentData.procedure}\n` : ""}${appointmentData.dentistName ? `👨‍⚕️ Profissional: ${appointmentData.dentistName}\n` : ""}\nPor favor, chegue com 10 minutos de antecedência.\n\nResponda SIM para confirmar ou NÃO para reagendar.`;

      message = message
        .replace("{paciente}", appointmentData.patientName)
        .replace("{data}", appointmentData.date)
        .replace("{hora}", appointmentData.time)
        .replace("{procedimento}", appointmentData.procedure || "")
        .replace("{profissional}", appointmentData.dentistName || "");
    } else if (messageType === "reminder" && appointmentData) {
      message =
        config.mensagem_lembrete ||
        `Olá ${appointmentData.patientName}! 🦷\n\nLembramos que você tem uma consulta amanhã:\n📅 Data: ${appointmentData.date}\n⏰ Horário: ${appointmentData.time}\n\nConfirme sua presença respondendo SIM.\n\nCaso precise reagendar, entre em contato conosco.`;

      message = message
        .replace("{paciente}", appointmentData.patientName)
        .replace("{data}", appointmentData.date)
        .replace("{hora}", appointmentData.time)
        .replace("{procedimento}", appointmentData.procedure || "")
        .replace("{profissional}", appointmentData.dentistName || "");
    } else if (messageType === "review") {
      const name = patientName || appointmentData?.patientName || "Paciente";
      const link = googleReviewLink || "";
      message = `Olá ${name}! 😊\n\nObrigado por confiar em nós! Seu feedback é muito importante.\n\n⭐ Avalie nossa clínica no Google:\n${link}\n\nSua opinião nos ajuda a melhorar cada vez mais! 🙏`;
    } else if (messageType === "campaign" && customMessage) {
      message = customMessage;
      if (patientName) {
        message = message.replace("{paciente}", patientName);
      }
      if (googleReviewLink) {
        message = message.replace("{link_review}", googleReviewLink);
      }
    } else if (messageType === "custom" && customMessage) {
      message = customMessage;
    } else {
      return jsonResp({ error: "Tipo de mensagem inválido ou dados insuficientes" }, 400);
    }

    const zapiUrl = `https://api.z-api.io/instances/${config.instance_id}/token/${config.instance_token}/send-text`;

    console.log("[SEND-WHATSAPP] Sending to Z-API:", { phone: formattedPhone, messageType });

    const zapiHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (config.client_token) {
      zapiHeaders["Client-Token"] = config.client_token;
    }

    const zapiResponse = await fetch(zapiUrl, {
      method: "POST",
      headers: zapiHeaders,
      body: JSON.stringify({ phone: formattedPhone, message }),
    });

    const zapiResult = await zapiResponse.json();
    console.log("[SEND-WHATSAPP] Z-API response:", zapiResult);

    if (!zapiResponse.ok) {
      console.error("[SEND-WHATSAPP] Z-API error:", zapiResult);

      await supabase.from("whatsapp_message_log").insert({
        clinic_id: clinicId,
        phone: formattedPhone,
        message_type: messageType,
        status: "failed",
        error_message: JSON.stringify(zapiResult),
      });

      return jsonResp({ error: "Erro ao enviar mensagem", details: zapiResult }, 500);
    }

    await supabase.from("whatsapp_message_log").insert({
      clinic_id: clinicId,
      phone: formattedPhone,
      message_type: messageType,
      status: "sent",
      zapi_message_id: zapiResult.messageId,
    });

    console.log("[SEND-WHATSAPP] Message sent successfully");

    return jsonResp({
      success: true,
      messageId: zapiResult.messageId,
      phone: formattedPhone,
    });
  } catch (error) {
    console.error("[SEND-WHATSAPP] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonResp({ error: errorMessage }, 500);
  }
});
