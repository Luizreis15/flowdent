import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteUserRequest {
  name: string;
  email: string;
  role: string;
  clinicaId: string;
  clinicName: string;
}

const ALLOWED_ROLES = ["admin", "dentista", "recepcao", "assistente"];

// Template HTML premium para convite
const generateInviteEmailHtml = (
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
    <title>Convite Flowdent</title>
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
                <h2 style="color: #18181b; margin: 0 0 24px 0; font-size: 24px; font-weight: 700;">Você foi convidado! 🎉</h2>
                
                <p style="color: #3f3f46; font-size: 16px; line-height: 1.7; margin: 0 0 20px 0;">
                  Olá <strong style="color: #0D9488;">${name}</strong>,
                </p>
                
                <p style="color: #3f3f46; font-size: 16px; line-height: 1.7; margin: 0 0 28px 0;">
                  Você foi convidado para fazer parte da equipe da <strong>${clinicName}</strong> no Flowdent.
                </p>
                
                <!-- Card de Informações -->
                <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border-radius: 12px; padding: 24px; margin: 0 0 28px 0; border: 1px solid #99f6e4;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="padding-bottom: 16px;">
                        <div style="display: flex; align-items: center;">
                          <span style="font-size: 20px; margin-right: 12px;">👤</span>
                          <div>
                            <p style="color: #0F766E; font-size: 12px; font-weight: 600; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">SEU PERFIL DE ACESSO</p>
                            <p style="color: #0D9488; font-size: 18px; font-weight: 700; margin: 0;">${roleName}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="border-top: 1px solid #99f6e4; padding-top: 16px;">
                        <div style="display: flex; align-items: center;">
                          <span style="font-size: 20px; margin-right: 12px;">📧</span>
                          <div>
                            <p style="color: #0F766E; font-size: 12px; font-weight: 600; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">SEU EMAIL</p>
                            <p style="color: #0D9488; font-size: 16px; font-weight: 600; margin: 0;">${email}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </table>
                </div>
                
                <p style="color: #3f3f46; font-size: 16px; line-height: 1.7; margin: 0 0 32px 0;">
                  Para começar a usar o sistema, clique no botão abaixo e defina sua senha de acesso:
                </p>
                
                <!-- CTA Button Premium -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center" style="padding: 0 0 24px 0;">
                      <a href="${resetLink}" 
                         style="display: inline-block; background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%); color: #ffffff; padding: 18px 48px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 8px 24px rgba(13, 148, 136, 0.4); transition: all 0.2s;">
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
                    🔒 Se você não esperava este convite ou não conhece a clínica mencionada, pode ignorar este email com segurança.
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
    console.log("=== Invite User Function Started ===");

    // Autenticar o chamador: exige um JWT real de usuário logado, não apenas a anon key
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    const callerId = userData.user.id;

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Só admins podem convidar, e só para a própria clínica — nunca confiar no clinicaId do body
    const { data: callerUsuario, error: callerError } = await supabaseAdmin
      .from("usuarios")
      .select("clinica_id, perfil")
      .eq("id", callerId)
      .maybeSingle();

    if (callerError || !callerUsuario || callerUsuario.perfil !== "admin") {
      return new Response(
        JSON.stringify({ error: "Apenas administradores da clínica podem convidar usuários" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { name, email, role, clinicName }: InviteUserRequest = await req.json();
    const clinicaId = callerUsuario.clinica_id; // ignora o valor enviado pelo cliente
    console.log("Request data:", { name, email, role, clinicaId, clinicName, callerId });

    if (!ALLOWED_ROLES.includes(role)) {
      return new Response(
        JSON.stringify({ error: "Perfil inválido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verificar se o email já existe no auth E na tabela usuarios
    console.log("Checking if email exists in auth...");
    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUserExists = existingAuthUsers?.users.some(u => u.email === email.toLowerCase());
    
    console.log("Checking if email exists in usuarios table...");
    const { data: existingUsuario } = await supabaseAdmin
      .from("usuarios")
      .select("id, email")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    console.log("Auth user exists:", authUserExists, "Usuario exists:", !!existingUsuario);

    if (authUserExists || existingUsuario) {
      console.log("Email already exists, returning error");
      return new Response(
        JSON.stringify({ error: "Este email já está cadastrado" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Gerar senha temporária aleatória
    const tempPassword = crypto.randomUUID();
    console.log("Creating user in auth with email:", email.toLowerCase());

    // Criar usuário no Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name,
      },
    });

    if (authError || !authUser.user) {
      console.error("Erro ao criar usuário no auth:", authError);
      throw new Error("Erro ao criar usuário: " + authError?.message);
    }
    
    console.log("User created in auth successfully:", authUser.user.id);

    // Criar registro na tabela usuarios
    console.log("Creating user in usuarios table...");
    const { error: usuarioError } = await supabaseAdmin
      .from("usuarios")
      .insert({
        id: authUser.user.id,
        clinica_id: clinicaId,
        nome: name,
        email: email.toLowerCase(),
        perfil: role,
      });

    if (usuarioError) {
      console.error("Erro ao criar registro em usuarios:", usuarioError);
      console.log("Rolling back: deleting user from auth");
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw new Error("Erro ao criar registro: " + usuarioError.message);
    }
    
    console.log("User created in usuarios table successfully");

    // Criar role
    console.log("Creating user role...");
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: authUser.user.id,
        role: role,
      });

    if (roleError) {
      console.error("Erro ao criar role:", roleError);
    } else {
      console.log("Role created successfully");
    }

    // Gerar link de redefinição de senha
    console.log("Generating password reset link...");
    
    const redirectUrl = Deno.env.get("APP_URL") || "https://flowdent.com.br";
    
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase(),
      options: {
        redirectTo: `${redirectUrl}/auth?reset=true`
      }
    });

    if (resetError) {
      console.error("Erro ao gerar link de reset:", resetError);
    } else {
      console.log("Password reset link generated successfully");
    }

    // Mapear perfis para nomes amigáveis
    const roleNames: { [key: string]: string } = {
      admin: "Administrador",
      dentista: "Cirurgião-Dentista",
      recepcao: "Recepcionista",
      assistente: "Assistente",
    };

    const roleName = roleNames[role] || role;
    const resetLink = resetData?.properties?.action_link || '#';

    // Enviar email de convite premium
    console.log("Sending invite email via Resend...");
    
    const emailResponse = await resend.emails.send({
      from: "Flowdent <noreply@flowdent.com.br>",
      to: [email.toLowerCase()],
      subject: `🦷 Convite para ${clinicName} - Flowdent`,
      html: generateInviteEmailHtml(name, email.toLowerCase(), roleName, clinicName, resetLink),
    });

    console.log("Email enviado com sucesso:", emailResponse);

    console.log("=== Invite User Function Completed Successfully ===");
    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: authUser.user.id,
        message: "Usuário criado com sucesso" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("=== ERROR in invite-user function ===");
    console.error("Error details:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({ error: error.message || "Erro desconhecido ao criar usuário" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
