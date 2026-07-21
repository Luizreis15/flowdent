import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Loader2, ArrowLeft } from "lucide-react";
import { z } from "zod";

const AdminAuth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(searchParams.get('reset') === 'true');
  
  // Reset password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (searchParams.get('reset') === 'true') {
      setIsResetPassword(true);
      setIsForgotPassword(false);
    }
  }, [searchParams]);

  useEffect(() => {
    checkExistingSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Camada extra: se o Supabase processar um token de recovery da URL a qualquer
  // momento (mesmo sem ?reset=true), força o formulário de nova senha.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetPassword(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkExistingSession = async () => {
    try {
      // Não pular direto pro dashboard em fluxo de reset de senha: uma sessão de
      // recovery (criada automaticamente pelo Supabase ao processar o token da URL)
      // é uma sessão válida, mas o usuário ainda precisa definir a nova senha antes
      // de ganhar acesso — senão o link de recuperação vira um login mágico.
      if (searchParams.get('reset') === 'true') return;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const isSuperAdmin = await verifySuperAdmin(session.user.id);
        if (isSuperAdmin) {
          navigate("/admin/dashboard");
        }
      }
    } finally {
      setCheckingSession(false);
    }
  };

  const verifySuperAdmin = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .maybeSingle();
    
    return !!data;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Digite seu email primeiro");
      return;
    }

    const emailValidation = z.string().email("Email inválido").safeParse(email);
    if (!emailValidation.success) {
      toast.error("Por favor, insira um email válido");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('reset-password', {
        body: { email, isAdmin: true }
      });
      
      if (error) throw error;
      
      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
      setIsForgotPassword(false);
      setEmail("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar email de recuperação");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    const passwordValidation = z.string()
      .min(8, "A senha deve ter pelo menos 8 caracteres")
      .max(128, "A senha deve ter no máximo 128 caracteres")
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "A senha deve conter letra maiúscula, minúscula e número")
      .safeParse(newPassword);
    
    if (!passwordValidation.success) {
      toast.error(passwordValidation.error.errors[0].message);
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    setLoading(false);

    if (error) {
      toast.error(error.message || "Erro ao redefinir senha");
    } else {
      toast.success("Senha redefinida com sucesso!");
      setIsResetPassword(false);
      setNewPassword("");
      setConfirmPassword("");
      navigate("/admin");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const isSuperAdmin = await verifySuperAdmin(data.user.id);
        
        if (!isSuperAdmin) {
          await supabase.auth.signOut();
          toast.error("Acesso negado. Esta área é exclusiva para administradores.");
          return;
        }

        toast.success("Bem-vindo ao painel administrativo!");
        navigate("/admin/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white">Flowdent Admin</h1>
          <p className="text-slate-400 mt-2">Área exclusiva para administradores</p>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">
              {isResetPassword 
                ? "Redefinir Senha" 
                : isForgotPassword 
                  ? "Recuperar Senha" 
                  : "Login Administrativo"}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {isResetPassword 
                ? "Digite sua nova senha" 
                : isForgotPassword 
                  ? "Digite seu email para receber o link de recuperação" 
                  : "Entre com suas credenciais de super administrador"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isResetPassword ? (
              // RESET PASSWORD FORM
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-slate-200">Nova Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                  <p className="text-xs text-slate-400">
                    Mínimo 8 caracteres, com letra maiúscula, minúscula e número
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-slate-200">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redefinindo...
                    </>
                  ) : (
                    "Redefinir Senha"
                  )}
                </Button>
              </form>
            ) : isForgotPassword ? (
              // FORGOT PASSWORD FORM
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-200">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@flowdent.com.br"
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Link de Recuperação"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-white"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setEmail("");
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao login
                </Button>
              </form>
            ) : (
              // LOGIN FORM
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-200">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@flowdent.com.br"
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-200">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-slate-400 hover:text-white"
                  onClick={() => setIsForgotPassword(true)}
                  disabled={loading}
                >
                  Esqueci minha senha
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-slate-500 text-sm mt-6">
          Área restrita. Tentativas não autorizadas serão registradas.
        </p>
      </div>
    </div>
  );
};

export default AdminAuth;