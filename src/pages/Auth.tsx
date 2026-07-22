import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, DollarSign, ClipboardList, Shield, Clock } from "lucide-react";
import { z } from "zod";
import logoFlowdent from '@/assets/logo-flowdent.png';
import { PASSWORD_HINT, passwordSchema } from "@/lib/password";

const signinSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email must be less than 255 characters"),
  password: z.string().min(1, "Password is required").max(128, "Password must be less than 128 characters")
});

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isSuperAdmin, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(searchParams.get('reset') === 'true');
  
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (searchParams.get('reset') === 'true') {
      setIsResetPassword(true);
      setIsForgotPassword(false);
    }
  }, [searchParams]);

  // Redirect authenticated users — AuthContext already loaded profile/roles
  useEffect(() => {
    if (authLoading || isResetPassword) return;
    if (!isAuthenticated) return;

    if (isSuperAdmin) {
      navigate("/super-admin");
    } else {
      // AuthContext already handles onboarding redirects in loadUserData,
      // so if we reach here the user is fully onboarded
      navigate("/dashboard");
    }
  }, [isAuthenticated, isSuperAdmin, authLoading, isResetPassword, navigate]);

  // Handle PASSWORD_RECOVERY event only
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetPassword(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return; // Prevent double-submit

    const validation = signinSchema.safeParse({ 
      email: loginEmail, 
      password: loginPassword 
    });
    
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Erro de Validação",
        description: validation.error.errors[0].message,
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: validation.data.email,
      password: validation.data.password,
    });

    if (error) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: error.message,
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail.trim()) {
      toast({
        variant: "destructive",
        title: "Email obrigatório",
        description: "Por favor, insira seu email",
      });
      return;
    }

    const emailValidation = z.string().email("Email inválido").safeParse(resetEmail);
    if (!emailValidation.success) {
      toast({
        variant: "destructive",
        title: "Email inválido",
        description: "Por favor, insira um email válido",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('reset-password', {
        body: { email: resetEmail }
      });

      setLoading(false);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao enviar email",
          description: error.message,
        });
      } else {
        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir sua senha.",
        });
        setIsForgotPassword(false);
        setResetEmail("");
      }
    } catch (err) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Erro ao enviar email",
        description: "Ocorreu um erro ao processar sua solicitação.",
      });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Senhas não coincidem",
        description: "As senhas devem ser iguais",
      });
      return;
    }

    const passwordValidation = passwordSchema.safeParse(newPassword);
    
    if (!passwordValidation.success) {
      toast({
        variant: "destructive",
        title: "Senha inválida",
        description: passwordValidation.error.errors[0].message,
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    setLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao redefinir senha",
        description: error.message,
      });
    } else {
      toast({
        title: "Senha redefinida!",
        description: "Sua senha foi alterada com sucesso.",
      });
      
      setIsResetPassword(false);
      navigate("/dashboard");
    }
  };

  const pillars = [
    { icon: Calendar, label: "Agenda inteligente" },
    { icon: DollarSign, label: "Gestão financeira integrada" },
    { icon: ClipboardList, label: "Controle clínico completo" },
  ];

  const renderForm = () => {
    if (isResetPassword) {
      return (
        <>
          <div className="space-y-2">
            <h1 className="text-[28px] font-bold text-[hsl(var(--flowdent-blue))]">
              Redefinir senha
            </h1>
            <p className="text-base text-[hsl(var(--slate-gray))]">
              Digite sua nova senha
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-sm font-medium">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="h-12 rounded-xl border-gray-200 focus:border-[hsl(var(--flowdent-blue))] focus:ring-[hsl(var(--flowdent-blue))]/20"
              />
              <p className="text-xs text-[hsl(var(--slate-gray))]">
                {PASSWORD_HINT}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-sm font-medium">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-12 rounded-xl border-gray-200 focus:border-[hsl(var(--flowdent-blue))] focus:ring-[hsl(var(--flowdent-blue))]/20"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-[hsl(var(--flowdent-blue))] hover:bg-[hsl(var(--flowdent-blue))]/90 text-[15px] font-medium" 
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Redefinir senha
            </Button>
          </form>
        </>
      );
    }

    if (isForgotPassword) {
      return (
        <>
          <div className="space-y-2">
            <h1 className="text-[28px] font-bold text-[hsl(var(--flowdent-blue))]">
              Recuperar senha
            </h1>
            <p className="text-base text-[hsl(var(--slate-gray))]">
              Digite seu email para receber o link de recuperação
            </p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email" className="text-sm font-medium">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="seu@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                className="h-12 rounded-xl border-gray-200 focus:border-[hsl(var(--flowdent-blue))] focus:ring-[hsl(var(--flowdent-blue))]/20"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-[hsl(var(--flowdent-blue))] hover:bg-[hsl(var(--flowdent-blue))]/90 text-[15px] font-medium" 
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar link de recuperação
            </Button>
          </form>

          <p className="text-sm text-center text-[hsl(var(--slate-gray))]">
            Lembrou a senha?{" "}
            <button
              onClick={() => { setIsForgotPassword(false); setResetEmail(""); }}
              className="text-[hsl(var(--flowdent-blue))] font-semibold hover:underline"
            >
              Voltar ao login
            </button>
          </p>
        </>
      );
    }

    return (
      <>
        <div className="space-y-2">
          <h1 className="text-[28px] font-bold text-[hsl(var(--flowdent-blue))]">
            Acessar sua conta
          </h1>
          <p className="text-base text-[hsl(var(--slate-gray))]">
            Entre para continuar
          </p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="seu@email.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
              className="h-12 rounded-xl border-gray-200 focus:border-[hsl(var(--flowdent-blue))] focus:ring-[hsl(var(--flowdent-blue))]/20"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password" className="text-sm font-medium">Senha</Label>
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-sm text-[hsl(var(--flowdent-blue))] hover:underline"
              >
                Esqueceu a senha?
              </button>
            </div>
            <Input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              className="h-12 rounded-xl border-gray-200 focus:border-[hsl(var(--flowdent-blue))] focus:ring-[hsl(var(--flowdent-blue))]/20"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl bg-[hsl(var(--flowdent-blue))] hover:bg-[hsl(var(--flowdent-blue))]/90 text-[15px] font-medium" 
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entrar
          </Button>
        </form>

        <p className="text-sm text-center text-[hsl(var(--slate-gray))]">
          Não tem uma conta?{" "}
          <Link
            to="/cadastro"
            className="text-[hsl(var(--flowdent-blue))] font-semibold hover:underline"
          >
            Criar conta
          </Link>
        </p>
      </>
    );
  };

  return (
    <div className="min-h-screen flex">
      {/* Coluna Institucional — Esquerda */}
      <div className="hidden md:flex w-[60%] lg:w-[60%] xl:w-[60%] relative bg-gradient-to-br from-[hsl(var(--flowdent-blue))] to-[hsl(var(--flow-turquoise))]">
        {/* Overlay escuro */}
        <div className="absolute inset-0 bg-black/[0.15]" />

        <div className="relative z-10 flex flex-col justify-between w-full h-full p-12 xl:p-16">
          {/* Logo + Headline */}
          <div>
            <Link to="/">
              <img 
                src={logoFlowdent} 
                alt="Flowdent" 
                className="h-14 xl:h-16 w-auto brightness-0 invert"
              />
            </Link>
          </div>

          {/* Conteúdo central */}
          <div className="space-y-10 max-w-lg">
            <div className="space-y-4">
              <h2 className="text-[28px] xl:text-[32px] font-bold text-white leading-tight">
                Gestão Odontológica Inteligente
              </h2>
              <p className="text-base xl:text-lg text-white/80 leading-relaxed">
                Controle clínico, financeiro e operacional em um único sistema.
              </p>
            </div>

            <div className="space-y-5">
              {pillars.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-white/90" />
                  </div>
                  <span className="text-white/90 text-[15px] font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rodapé */}
          <div className="flex items-center gap-6 text-white/50 text-xs">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Ambiente seguro e criptografado
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Disponível 24h
            </span>
          </div>
        </div>
      </div>

      {/* Coluna Login — Direita */}
      <div className="w-full md:w-[40%] flex flex-col bg-[#F5F7FA] relative">
        {/* Versão */}
        <div className="absolute top-4 right-5 text-xs text-gray-400 font-mono">
          Flowdent v3.2
        </div>

        {/* Mobile header */}
        <div className="md:hidden bg-gradient-to-r from-[hsl(var(--flowdent-blue))] to-[hsl(var(--flow-turquoise))] p-5">
          <Link to="/">
            <img src={logoFlowdent} alt="Flowdent" className="h-10 w-auto brightness-0 invert" />
          </Link>
          <p className="text-white/70 text-sm mt-2">Gestão Odontológica Inteligente</p>
        </div>

        {/* Card de login */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-8">
          <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-8 space-y-6">
            {renderForm()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
