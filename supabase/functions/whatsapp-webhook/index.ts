import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// npm: em vez de esm.sh: o esm.sh passou a resolver @supabase/storage-js@2.99.1, que
// não existe, e a função não sobe mais (BOOT_ERROR) num deploy novo.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === 'GET') {
      // Z-API pode fazer health check via GET
      return new Response('OK', { status: 200 });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      console.log('[WHATSAPP-WEBHOOK] Received:', JSON.stringify(body));

      // Z-API payload format:
      // {
      //   "instanceId": "3EF19...",
      //   "phone": "5511999999999",
      //   "fromMe": false,
      //   "text": { "message": "texto" },
      //   "type": "ReceivedCallback",
      //   "messageId": "...",
      //   "senderName": "Nome",
      //   "connectedPhone": "554499999999",
      //   "momment": 1234567890000
      // }

      const instanceId = body.instanceId;
      const isFromMe = body.fromMe === true;

      if (!instanceId) {
        console.log('[WHATSAPP-WEBHOOK] No instanceId in payload');
        return new Response(JSON.stringify({ error: 'Missing instanceId' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // Buscar configuração da clínica pelo instance_id
      const { data: config } = await supabase
        .from('whatsapp_configs')
        .select('clinica_id, webhook_verify_token')
        .eq('instance_id', instanceId)
        .eq('is_active', true)
        .maybeSingle();

      if (!config) {
        console.log('[WHATSAPP-WEBHOOK] No config for instanceId:', instanceId);
        return new Response(JSON.stringify({ error: 'Instance not configured' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }

      // O segredo vai na URL registrada na Z-API (?token=...); sem ele, qualquer um que
      // conhecesse o instanceId poderia injetar mensagens no CRM da clínica.
      const providedToken = new URL(req.url).searchParams.get('token') ?? '';
      const expectedToken = config.webhook_verify_token ?? '';
      if (!expectedToken || !timingSafeEqual(providedToken, expectedToken)) {
        console.log('[WHATSAPP-WEBHOOK] Invalid webhook token for instanceId:', instanceId);
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        });
      }

      const clinicaId = config.clinica_id;

      // Ignorar mensagens enviadas por nós mesmos
      if (isFromMe) {
        console.log('[WHATSAPP-WEBHOOK] Ignoring own message');
        return new Response(JSON.stringify({ success: true, ignored: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Ignorar callbacks que não são mensagens recebidas
      if (body.type && body.type !== 'ReceivedCallback') {
        // Pode ser StatusCallback, MessageStatusCallback, etc.
        console.log('[WHATSAPP-WEBHOOK] Non-message callback:', body.type);

        // Se for status update, atualizar status da mensagem (só em conversas desta clínica)
        if (body.type === 'MessageStatusCallback' && body.messageId && body.status) {
          const { data: conversations } = await supabase
            .from('crm_conversations')
            .select('id')
            .eq('clinica_id', clinicaId);

          const conversationIds = (conversations || []).map((c: { id: string }) => c.id);
          if (conversationIds.length > 0) {
            await supabase
              .from('crm_messages')
              .update({ status: mapZApiStatus(body.status) })
              .eq('whatsapp_message_id', body.messageId)
              .in('conversation_id', conversationIds);
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      const phone = (body.phone || '').replace(/\D/g, '');
      const senderName = body.senderName || phone;
      const messageContent = body.text?.message || body.image?.caption || body.document?.caption || '[Mídia]';
      const messageId = body.messageId || null;
      const messageType = body.image ? 'image' : body.document ? 'document' : body.audio ? 'audio' : 'text';

      if (!phone) {
        console.log('[WHATSAPP-WEBHOOK] No phone in payload');
        return new Response(JSON.stringify({ error: 'Missing phone' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // 1. Criar ou buscar contato
      let { data: contact } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('clinica_id', clinicaId)
        .eq('phone', phone)
        .maybeSingle();

      if (!contact) {
        const { data: newContact, error: contactErr } = await supabase
          .from('crm_contacts')
          .insert({
            clinica_id: clinicaId,
            phone: phone,
            name: senderName,
          })
          .select()
          .single();

        if (contactErr) {
          console.error('[WHATSAPP-WEBHOOK] Error creating contact:', contactErr);
          throw contactErr;
        }
        contact = newContact;
      }

      // 2. Buscar ou criar conversa ativa
      let { data: conversation } = await supabase
        .from('crm_conversations')
        .select('*')
        .eq('contact_id', contact.id)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!conversation) {
        const { data: newConv, error: convErr } = await supabase
          .from('crm_conversations')
          .insert({
            clinica_id: clinicaId,
            contact_id: contact.id,
            status: 'pending',
            last_message_at: new Date().toISOString(),
            unread_count: 1,
            kanban_stage: 'novo',
          })
          .select()
          .single();

        if (convErr) {
          console.error('[WHATSAPP-WEBHOOK] Error creating conversation:', convErr);
          throw convErr;
        }
        conversation = newConv;
      } else {
        await supabase
          .from('crm_conversations')
          .update({
            last_message_at: new Date().toISOString(),
            unread_count: (conversation.unread_count || 0) + 1,
            status: 'active',
          })
          .eq('id', conversation.id);
      }

      // 3. Salvar mensagem
      const { error: msgErr } = await supabase
        .from('crm_messages')
        .insert({
          conversation_id: conversation.id,
          whatsapp_message_id: messageId,
          content: messageContent,
          is_from_me: false,
          message_type: messageType,
          media_url: body.image?.imageUrl || body.document?.documentUrl || body.audio?.audioUrl || null,
          status: 'received',
        });

      if (msgErr) {
        console.error('[WHATSAPP-WEBHOOK] Error saving message:', msgErr);
        throw msgErr;
      }

      console.log('[WHATSAPP-WEBHOOK] Message processed successfully for clinic:', clinicaId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    console.error('[WHATSAPP-WEBHOOK] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

function mapZApiStatus(status: string): string {
  const map: Record<string, string> = {
    'PENDING': 'pending',
    'SENT': 'sent',
    'RECEIVED': 'delivered',
    'READ': 'read',
    'PLAYED': 'read',
    'FAILED': 'failed',
  };
  return map[status] || status.toLowerCase();
}
