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
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate tomorrow's date range
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = `${tomorrow.toISOString().split('T')[0]}T00:00:00`;
    const tomorrowEnd = `${tomorrow.toISOString().split('T')[0]}T23:59:59`;

    console.log(`[REMINDERS] Checking appointments for ${tomorrow.toISOString().split('T')[0]}`);

    // Fetch tomorrow's scheduled appointments with patient phone
    const { data: appointments, error: apptError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        title,
        duration_minutes,
        patient_id,
        dentist_id,
        patient:patients(full_name, phone, clinic_id),
        dentist:profissionais(nome)
      `)
      .gte('appointment_date', tomorrowStart)
      .lte('appointment_date', tomorrowEnd)
      .eq('status', 'scheduled');

    if (apptError) {
      console.error('[REMINDERS] Error fetching appointments:', apptError);
      throw apptError;
    }

    console.log(`[REMINDERS] Found ${appointments?.length || 0} appointments for tomorrow`);

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const appt of (appointments || [])) {
      const patient = appt.patient as any;
      const dentist = appt.dentist as any;

      // Skip if no phone
      if (!patient?.phone) {
        console.log(`[REMINDERS] Skipping ${patient?.full_name}: no phone`);
        skipped++;
        continue;
      }

      // Check if already sent today (dedup)
      const todayStart = `${now.toISOString().split('T')[0]}T00:00:00`;
      const { data: existing } = await supabase
        .from('whatsapp_message_log')
        .select('id')
        .eq('appointment_id', appt.id)
        .eq('message_type', 'reminder')
        .gte('created_at', todayStart)
        .maybeSingle();

      if (existing) {
        console.log(`[REMINDERS] Skipping ${patient.full_name}: already sent`);
        skipped++;
        continue;
      }

      // Parse appointment datetime
      const apptDate = new Date(appt.appointment_date);
      const dateStr = apptDate.toLocaleDateString('pt-BR');
      const timeStr = apptDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Call send-whatsapp function
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
          method: 'POST',
          headers: internalHeaders(supabaseKey),
          body: JSON.stringify({
            clinicId: patient.clinic_id,
            phone: patient.phone,
            messageType: 'reminder',
            appointmentData: {
              patientName: patient.full_name,
              date: dateStr,
              time: timeStr,
              procedure: appt.title,
              dentistName: dentist?.nome,
            },
          }),
        });

        const result = await response.json();

        // Log the message
        await supabase.from('whatsapp_message_log').insert({
          clinic_id: patient.clinic_id,
          appointment_id: appt.id,
          patient_id: appt.patient_id,
          phone: patient.phone,
          message_type: 'reminder',
          status: response.ok ? 'sent' : 'failed',
          error_message: response.ok ? null : JSON.stringify(result),
        });

        if (response.ok) {
          sent++;
          console.log(`[REMINDERS] Sent to ${patient.full_name}`);
        } else {
          failed++;
          console.error(`[REMINDERS] Failed for ${patient.full_name}:`, result);
        }
      } catch (err) {
        failed++;
        console.error(`[REMINDERS] Error sending to ${patient.full_name}:`, err);

        await supabase.from('whatsapp_message_log').insert({
          clinic_id: patient.clinic_id,
          appointment_id: appt.id,
          patient_id: appt.patient_id,
          phone: patient.phone,
          message_type: 'reminder',
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const summary = { total: appointments?.length || 0, sent, skipped, failed };
    console.log('[REMINDERS] Summary:', summary);

    return jsonResp({ success: true, ...summary });
  } catch (error) {
    console.error('[REMINDERS] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonResp({ error: errorMessage }, 500);
  }
});
