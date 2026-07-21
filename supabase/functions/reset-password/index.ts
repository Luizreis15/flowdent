import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  email: string;
  isAdmin?: boolean;
}

// Template HTML premium para recuperação de senha
const generateResetPasswordEmailHtml = (
  name: string,
  clinicName: string,
  resetLink: string
) => `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperação de Senha - Flowdent</title>
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
                <!-- Ícone de Segurança -->
                <div style="text-align: center; margin-bottom: 24px;">
                  <div style="display: inline-block; background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border-radius: 50%; padding: 20px; border: 2px solid #99f6e4;">
                    <span style="font-size: 36px;">🔐</span>
                  </div>
                </div>
                
                <h2 style="color: #18181b; margin: 0 0 24px 0; font-size: 24px; font-weight: 700; text-align: center;">Redefinição de Senha</h2>
                
                <p style="color: #3f3f46; font-size: 16px; line-height: 1.7; margin: 0 0 20px 0;">
                  Olá${name ? ` <strong style="color: #0D9488;">${name}</strong>` : ''},
                </p>
                
                <p style="color: #3f3f46; font-size: 16px; line-height: 1.7; margin: 0 0 28px 0;">
                  Recebemos uma solicitação para redefinir a senha da sua conta${clinicName ? ` na <strong>${clinicName}</strong>` : ' no Flowdent'}.
                </p>
                
                <p style="color: #3f3f46; font-size: 16px; line-height: 1.7; margin: 0 0 32px 0;">
                  Para criar uma nova senha, clique no botão abaixo:
                </p>
                
                <!-- CTA Button Premium -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center" style="padding: 0 0 24px 0;">
                      <a href="${resetLink}" 
                         style="display: inline-block; background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%); color: #ffffff; padding: 18px 48px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 8px 24px rgba(13, 148, 136, 0.4); transition: all 0.2s;">
                        Redefinir Minha Senha
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
                <div style="background-color: #fef2f2; border-radius: 10px; padding: 20px; margin: 0 0 24px 0; border: 1px solid #fecaca;">
                  <p style="color: #991b1b; font-size: 14px; margin: 0; font-weight: 600;">
                    ⚠️ Não solicitou esta redefinição?
                  </p>
                  <p style="color: #7f1d1d; font-size: 13px; margin: 8px 0 0 0; line-height: 1.6;">
                    Ignore este email com segurança. Sua senha não será alterada a menos que você clique no link acima.
                  </p>
                </div>
                
                <!-- Dicas de Segurança -->
                <div style="border-top: 1px solid #e4e4e7; padding-top: 24px;">
                  <p style="color: #71717a; font-size: 13px; line-height: 1.6; margin: 0;">
                    🔒 <strong>Dicas de segurança:</strong> Use uma senha forte com pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas, números e símbolos.
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
    console.log("=== Reset Password Function Started ===");
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { email, isAdmin }: ResetPasswordRequest = await req.json();
    console.log("Reset password request for email:", email, "isAdmin:", isAdmin);

    // Verificar se o usuário existe
    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingAuthUsers?.users.find(u => u.email === email.toLowerCase());

    if (!userExists) {
      console.log("User not found, but returning success for security");
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Se o email existir, você receberá instruções de recuperação" 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Verificar se é super_admin
    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userExists.id)
      .eq("role", "super_admin")
      .maybeSingle();

    const isSuperAdmin = !!userRole;

    // Buscar dados do usuário
    const { data: usuario } = await supabaseAdmin
      .from("usuarios")
      .select("nome, clinica_id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    // Buscar dados do profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", userExists.id)
      .maybeSingle();

    const userName = usuario?.nome || profile?.full_name || "";

    let clinicName = "";
    if (usuario?.clinica_id) {
      const { data: clinic } = await supabaseAdmin
        .from("clinicas")
        .select("nome")
        .eq("id", usuario.clinica_id)
        .maybeSingle();
      
      if (clinic?.nome) {
        clinicName = clinic.nome;
      }
    }

    // Determinar URL de redirect baseado no tipo de usuário
    // /admin vive no domínio do site institucional; /auth vive no domínio do app
    const isAdminFlow = isAdmin || isSuperAdmin;
    const redirectUrl = isAdminFlow
      ? (Deno.env.get("SITE_URL") || "https://flowdent.com.br")
      : (Deno.env.get("APP_URL") || "https://app.flowdent.com.br");
    const redirectPath = isAdminFlow ? "/admin?reset=true" : "/auth?reset=true";

    console.log("Generating password reset link with redirect:", `${redirectUrl}${redirectPath}`);

    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase(),
      options: {
        redirectTo: `${redirectUrl}${redirectPath}`
      }
    });

    if (resetError) {
      console.error("Erro ao gerar link de reset:", resetError);
      throw new Error("Erro ao gerar link de recuperação");
    }

    console.log("Password reset link generated successfully");
    const resetLink = resetData?.properties?.action_link || '#';

    // Enviar email de recuperação premium
    console.log("Sending password reset email via Resend...");
    
    const emailResponse = await resend.emails.send({
      from: "Flowdent <noreply@flowdent.com.br>",
      to: [email.toLowerCase()],
      subject: "🔐 Recuperação de Senha - Flowdent",
      html: generateResetPasswordEmailHtml(userName, clinicName, resetLink),
    });

    console.log("Email sent successfully:", emailResponse);

    console.log("=== Reset Password Function Completed Successfully ===");
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Email de recuperação enviado com sucesso" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("=== ERROR in reset-password function ===");
    console.error("Error details:", error);
    console.error("Error message:", error.message);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro ao processar recuperação de senha" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
