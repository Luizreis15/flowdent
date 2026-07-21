import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResendInviteRequest {
  userId: string;
  clinicaId: string;
}

// Template HTML premium para reenvio de convite
const generateResendInviteEmailHtml = (
  name: string,
  email: string,
  roleName: string,
  clinicName: string,
  resetLink: string
) => `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reenvio de Convite - Flowdent</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
      <tr>
        <td align="center" style="padding: 40px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);">
            <!-- Header Premium -->
            <tr>
              <td style="background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                <div style="font-size: 40px; margin-bottom: 8px;">🦷</div>
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">FLOWDENT</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px; font-weight: 500;">Sistema de Gestão Odontológica</p>
              </td>
            </tr>
            
            <!-- Content -->
            <tr>
              <td style="padding: 40px 30px;">
                <h2 style="color: #18181b; margin: 0 0 24px 0; font-size: 24px; font-weight: 700;">Seu convite foi reenviado! 📬</h2>
                
                <p style="color: #3f3f46; font-size: 16px; line-height: 1.7; margin: 0 0 20px 0;">
                  Olá <strong style="color: #0D9488;">${name}</strong>,
                </p>
                
                <p style="color: #3f3f46; font-size: 16px; line-height: 1.7; margin: 0 0 28px 0;">
                  Estamos reenviando seu convite para acessar o sistema da <strong>${clinicName}</strong>. Se você ainda não configurou sua senha, use o botão abaixo.
                </p>
                
                <!-- Card de Informações -->
                <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border-radius: 12px; padding: 24px; margin: 0 0 28px 0; border: 1px solid #99f6e4;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="padding-bottom: 16px;">
                        <table role="presentation" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="vertical-align: top; padding-right: 12px;">
                              <span style="font-size: 20px;">👤</span>
                            </td>
                            <td>
                              <p style="color: #0F766E; font-size: 12px; font-weight: 600; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">SEU PERFIL DE ACESSO</p>
                              <p style="color: #0D9488; font-size: 18px; font-weight: 700; margin: 0;">${roleName}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="border-top: 1px solid #99f6e4; padding-top: 16px;">
                        <table role="presentation" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="vertical-align: top; padding-right: 12px;">
                              <span style="font-size: 20px;">📧</span>
                            </td>
                            <td>
                              <p style="color: #0F766E; font-size: 12px; font-weight: 600; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">SEU EMAIL</p>
                              <p style="color: #0D9488; font-size: 16px; font-weight: 600; margin: 0;">${email}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </div>
                
                <p style="color: #3f3f46; font-size: 16px; line-height: 1.7; margin: 0 0 32px 0;">
                  Clique no botão abaixo para definir sua senha e começar a usar o sistema:
                </p>
                
                <!-- CTA Button Premium -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center" style="padding: 0 0 24px 0;">
                      <a href="${resetLink}" 
                         style="display: inline-block; background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%); color: #ffffff; padding: 18px 48px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 8px 24px rgba(13, 148, 136, 0.4);">
                        Definir Minha Senha
                      </a>
                    </td>
                  </tr>
                </table>
                
                <!-- Aviso de Expiração -->
                <div style="background-color: #fef3c7; border-radius: 10px; padding: 16px 20px; margin: 0 0 28px 0; border-left: 4px solid #f59e0b;">
                  <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 600;">
                    ⏰ Atenção: Este link expira em 1 hora
                  </p>
                </div>
                
                <!-- Link Alternativo -->
                <p style="color: #71717a; font-size: 13px; line-height: 1.6; margin: 0 0 12px 0;">
                  Se o botão não funcionar, copie e cole este link no navegador:
                </p>
                <p style="background-color: #f4f4f5; padding: 12px 16px; border-radius: 8px; font-size: 12px; line-height: 1.5; margin: 0 0 28px 0; word-break: break-all;">
                  <a href="${resetLink}" style="color: #0D9488; text-decoration: none;">
                    ${resetLink}
                  </a>
                </p>
                
                <!-- Aviso de Segurança -->
                <div style="border-top: 1px solid #e4e4e7; padding-top: 24px;">
                  <p style="color: #71717a; font-size: 13px; line-height: 1.6; margin: 0;">
                    🔒 Se você não esperava este email ou já configurou sua senha, pode ignorá-lo com segurança.
                  </p>
                </div>
              </td>
            </tr>
            
            <!-- Footer Premium -->
            <tr>
              <td style="background: linear-gradient(135deg, #f4f4f5 0%, #e4e4e7 100%); padding: 28px 30px; border-radius: 0 0 16px 16px; text-align: center;">
                <p style="color: #71717a; font-size: 14px; margin: 0 0 8px 0; font-weight: 500;">
                  © ${new Date().getFullYear()} Flowdent. Todos os direitos reservados.
                </p>
                <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                  <a href="https://flowdent.com.br" style="color: #0D9488; text-decoration: none; font-weight: 500;">flowdent.com.br</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const callerId = userData.user.id;

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { userId, clinicaId, email: requestEmail } = await req.json() as { userId?: string; clinicaId: string; email?: string };

    if (!clinicaId) {
      return new Response(
        JSON.stringify({ error: "clinicaId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Só admin da própria clínica pode reenviar convites dessa clínica
    const { data: callerUsuario } = await supabaseAdmin
      .from("usuarios")
      .select("clinica_id, perfil")
      .eq("id", callerId)
      .maybeSingle();

    if (!callerUsuario || callerUsuario.perfil !== "admin" || callerUsuario.clinica_id !== clinicaId) {
      return new Response(
        JSON.stringify({ error: "Sem permissão para reenviar convites desta clínica" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userId && !requestEmail) {
      return new Response(
        JSON.stringify({ error: "userId ou email são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Buscar dados do usuário - priorizar email se fornecido
    let usuario: { nome: string; email: string; perfil: string; id: string } | null = null;
    
    // Estratégia 1: Buscar por email (mais confiável, nunca muda)
    if (requestEmail) {
      console.log("Buscando usuário por email:", requestEmail);
      const { data: usuarioByEmail } = await supabaseAdmin
        .from("usuarios")
        .select("id, nome, email, perfil")
        .eq("email", requestEmail.toLowerCase())
        .eq("clinica_id", clinicaId)
        .maybeSingle();
      
      if (usuarioByEmail) {
        usuario = usuarioByEmail;
        console.log("Usuário encontrado por email:", usuario.id);
      }
    }
    
    // Estratégia 2: Buscar por ID (fallback)
    if (!usuario && userId) {
      console.log("Buscando usuário por ID:", userId);
      const { data: usuarioById } = await supabaseAdmin
        .from("usuarios")
        .select("id, nome, email, perfil")
        .eq("id", userId)
        .eq("clinica_id", clinicaId)
        .maybeSingle();

      if (usuarioById) {
        usuario = usuarioById;
        console.log("Usuário encontrado por ID:", usuario.id);
      }
    }
    
    // Estratégia 3: Buscar email via Auth ID (último recurso)
    if (!usuario && userId) {
      console.log("Usuário não encontrado, buscando por email via Auth...");
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (authUser?.user?.email) {
        const { data: usuarioByAuthEmail } = await supabaseAdmin
          .from("usuarios")
          .select("id, nome, email, perfil")
          .eq("email", authUser.user.email.toLowerCase())
          .eq("clinica_id", clinicaId)
          .maybeSingle();
        
        if (usuarioByAuthEmail) {
          usuario = usuarioByAuthEmail;
          console.log("Usuário encontrado via Auth email:", usuario.id);
        }
      }
    }

    if (!usuario) {
      // Log para debug
      const { data: allUsers } = await supabaseAdmin
        .from("usuarios")
        .select("id, email")
        .eq("clinica_id", clinicaId);
      
      console.error("Usuário não encontrado. Usuários da clínica:", allUsers);
      console.error("ID solicitado:", userId, "Email solicitado:", requestEmail);
      
      return new Response(
        JSON.stringify({ 
          error: "Usuário não encontrado. Recarregue a página e tente novamente.",
          debug: { requestedId: userId, requestedEmail: requestEmail }
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar nome da clínica
    const { data: clinica } = await supabaseAdmin
      .from("clinicas")
      .select("nome")
      .eq("id", clinicaId)
      .single();

    const clinicName = clinica?.nome || "Flowdent";

    // Verificar se usuário existe no Supabase Auth
    const normalizedEmail = usuario.email.toLowerCase();
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Erro ao listar usuários do auth:", listError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar usuário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authUserExists = authUsers?.users.find(u => u.email?.toLowerCase() === normalizedEmail);
    let authUserId: string;

    if (!authUserExists) {
      // Usuário não existe no Auth - criar com senha temporária
      console.log("Usuário não existe no Auth, criando...", normalizedEmail);
      
      const tempPassword = crypto.randomUUID();
      
      const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: usuario.nome }
      });

      if (createError || !newAuthUser.user) {
        console.error("Erro ao criar usuário no auth:", createError);
        return new Response(
          JSON.stringify({ error: "Erro ao criar usuário: " + (createError?.message || "Falha desconhecida") }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      authUserId = newAuthUser.user.id;
      console.log("Usuário criado no Auth com ID:", authUserId);

      // Atualizar o ID na tabela usuarios para corresponder ao Auth
      const { error: updateError } = await supabaseAdmin
        .from("usuarios")
        .update({ id: authUserId })
        .eq("id", userId)
        .eq("clinica_id", clinicaId);

      if (updateError) {
        console.error("Erro ao atualizar ID do usuário:", updateError);
        // Continua mesmo com erro, pois o usuário foi criado no Auth
      }

      // Criar profile para o novo usuário
      await supabaseAdmin
        .from("profiles")
        .upsert({
          id: authUserId,
          full_name: usuario.nome,
          email: normalizedEmail,
          clinic_id: clinicaId
        }, { onConflict: "id" });

    } else {
      authUserId = authUserExists.id;
      console.log("Usuário já existe no Auth com ID:", authUserId);
    }

    // Gerar link de recuperação de senha
    const origin = Deno.env.get("APP_URL") || "https://flowdent.com.br";
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: {
        redirectTo: `${origin}/auth?reset=true`
      }
    });

    if (linkError || !linkData) {
      console.error("Erro ao gerar link:", linkError);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar link de acesso: " + (linkError?.message || "Falha desconhecida") }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // O action_link do Supabase já inclui o redirect correto
    const resetLink = linkData.properties?.action_link;
    
    if (!resetLink) {
      console.error("Link de ação não gerado:", linkData);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar link de acesso" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Link de recuperação gerado:", resetLink);

    // Mapeamento de perfis para português
    const roleLabels: Record<string, string> = {
      admin: "Administrador",
      recepcionista: "Recepcionista",
      asb: "ASB",
      cirurgiao_dentista: "Cirurgião-Dentista",
      dentista: "Cirurgião-Dentista",
      recepcao: "Recepcionista",
      assistente: "Assistente"
    };

    const roleLabel = roleLabels[usuario.perfil] || usuario.perfil;

    // Enviar email via Resend API com template premium
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Flowdent <noreply@flowdent.com.br>",
        to: [usuario.email],
        subject: `🦷 Reenvio de Convite - ${clinicName}`,
        html: generateResendInviteEmailHtml(
          usuario.nome,
          usuario.email,
          roleLabel,
          clinicName,
          resetLink
        ),
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Erro ao enviar email:", emailResult);
      return new Response(
        JSON.stringify({ error: "Erro ao enviar email: " + (emailResult.message || "Falha no envio") }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email de convite reenviado com sucesso:", emailResult);

    return new Response(
      JSON.stringify({ success: true, message: "Convite reenviado com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro ao reenviar convite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
