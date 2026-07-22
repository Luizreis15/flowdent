import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  corsHeaders,
  internalHeaders,
  jsonResp,
  requireInternalOnly,
} from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const denied = requireInternalOnly(req);
  if (denied) return denied;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];

    // Window: titles due in 3 days, 1 day, or already overdue up to 7 days
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7);

    const { data: titles, error: titlesErr } = await supabase
      .from('receivable_titles')
      .select(`
        id, title_number, amount, balance, due_date, status,
        installment_label, notes, patient_id, clinic_id,
        patient:patients(full_name, phone, email, clinic_id)
      `)
      .in('status', ['open', 'partial'])
      .gte('due_date', pastDate.toISOString().split('T')[0])
      .lte('due_date', futureDate.toISOString().split('T')[0])
      .gt('balance', 0);

    if (titlesErr) {
      console.error('[DUE-ALERTS] Error fetching titles:', titlesErr);
      throw titlesErr;
    }

    console.log(`[DUE-ALERTS] Found ${titles?.length || 0} titles in alert window`);

    let whatsappSent = 0;
    let emailSent = 0;
    let skipped = 0;

    for (const title of (titles || [])) {
      const patient = title.patient as any;
      if (!patient) { skipped++; continue; }

      const dueDate = new Date(title.due_date + 'T12:00:00');
      const todayDate = new Date(today + 'T12:00:00');
      const diffDays = Math.round((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

      // Determine alert type
      let alertType: string;
      if (diffDays > 0) {
        alertType = `pre_${diffDays}d`; // pre_1d, pre_2d, pre_3d
      } else if (diffDays === 0) {
        alertType = 'due_today';
      } else {
        alertType = `overdue_${Math.abs(diffDays)}d`;
      }

      // Dedup: check if already sent today for this title+type
      const { data: existing } = await supabase
        .from('whatsapp_message_log')
        .select('id')
        .eq('patient_id', title.patient_id)
        .eq('message_type', `payment_${alertType}`)
        .gte('created_at', `${today}T00:00:00`)
        .maybeSingle();

      if (existing) { skipped++; continue; }

      const dueDateStr = dueDate.toLocaleDateString('pt-BR');
      const balanceStr = (title.balance / 1).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const description = title.installment_label || title.notes || `Parcela #${title.title_number}`;

      // Build message
      let message: string;
      if (diffDays > 0) {
        message = `Olá ${patient.full_name}! 🦷\n\nLembramos que você tem um pagamento próximo do vencimento:\n\n📋 ${description}\n📅 Vencimento: ${dueDateStr}\n💰 Valor: ${balanceStr}\n\nEvite juros e multas pagando até a data. Qualquer dúvida, entre em contato conosco! 😊`;
      } else if (diffDays === 0) {
        message = `Olá ${patient.full_name}! 🦷\n\nSeu pagamento vence hoje:\n\n📋 ${description}\n📅 Vencimento: ${dueDateStr}\n💰 Valor: ${balanceStr}\n\nNão esqueça de efetuar o pagamento. Estamos à disposição! 🙏`;
      } else {
        message = `Olá ${patient.full_name}! 🦷\n\nIdentificamos um pagamento em atraso:\n\n📋 ${description}\n📅 Vencimento: ${dueDateStr}\n💰 Valor pendente: ${balanceStr}\n⚠️ Atraso: ${Math.abs(diffDays)} dia(s)\n\nEntre em contato para regularizar sua situação. Estamos aqui para ajudar! 🤝`;
      }

      // Send WhatsApp if phone available
      if (patient.phone) {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
            method: 'POST',
            headers: internalHeaders(supabaseKey),
            body: JSON.stringify({
              clinicId: title.clinic_id,
              phone: patient.phone,
              messageType: 'custom',
              customMessage: message,
            }),
          });

          await supabase.from('whatsapp_message_log').insert({
            clinic_id: title.clinic_id,
            patient_id: title.patient_id,
            phone: patient.phone,
            message_type: `payment_${alertType}`,
            status: response.ok ? 'sent' : 'failed',
          });

          if (response.ok) whatsappSent++;
        } catch (err) {
          console.error(`[DUE-ALERTS] WhatsApp error for ${patient.full_name}:`, err);
        }
      }

      // Send email if available and Resend is configured
      if (patient.email && resendKey) {
        try {
          const emailSubject = diffDays > 0
            ? `Lembrete de pagamento - vencimento em ${dueDateStr}`
            : diffDays === 0
              ? `Seu pagamento vence hoje - ${dueDateStr}`
              : `Pagamento em atraso - ${description}`;

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1e40af;">Lembrete de Pagamento</h2>
              <p>Olá <strong>${patient.full_name}</strong>,</p>
              ${diffDays > 0 
                ? `<p>Lembramos que você tem um pagamento próximo do vencimento:</p>`
                : diffDays === 0
                  ? `<p>Seu pagamento vence <strong>hoje</strong>:</p>`
                  : `<p>Identificamos um pagamento em atraso:</p>`
              }
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Descrição</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${description}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Vencimento</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${dueDateStr}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Valor</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: ${diffDays < 0 ? '#dc2626' : '#1e40af'};">${balanceStr}</td></tr>
                ${diffDays < 0 ? `<tr><td style="padding: 8px; color: #6b7280;">Atraso</td><td style="padding: 8px; color: #dc2626; font-weight: bold;">${Math.abs(diffDays)} dia(s)</td></tr>` : ''}
              </table>
              <p style="color: #6b7280; font-size: 14px;">Em caso de dúvidas, entre em contato com a clínica.</p>
            </div>
          `;

          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: 'noreply@flowdent.com.br',
              to: patient.email,
              subject: emailSubject,
              html: emailHtml,
            }),
          });

          if (emailRes.ok) emailSent++;
        } catch (err) {
          console.error(`[DUE-ALERTS] Email error for ${patient.full_name}:`, err);
        }
      }
    }

    const summary = { total: titles?.length || 0, whatsappSent, emailSent, skipped };
    console.log('[DUE-ALERTS] Summary:', summary);

    return jsonResp({ success: true, ...summary });
  } catch (error) {
    console.error('[DUE-ALERTS] Fatal error:', error);
    return jsonResp(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500,
    );
  }
});
