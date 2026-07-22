import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import TestimonialCarousel from "@/components/auth/TestimonialCarousel";
import logoFlowdent from '@/assets/logo-flowdent.png';
import { PASSWORD_HINT, PASSWORD_MIN_LENGTH, passwordSchema } from "@/lib/password";

const signupSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email deve ter menos de 255 caracteres"),
  password: passwordSchema,
  fullName: z.string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter menos de 100 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome pode conter apenas letras e espaços")
});

const Cadastro = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [signupStep, setSignupStep] = useState(1);
  
  // Signup fields - Step 1
  const [signupEmail, setSignupEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  
  // Signup fields - Step 2
  const [clinicName, setClinicName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [userRole, setUserRole] = useState("");
  const [howDidYouKnow, setHowDidYouKnow] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('clinic_id')
          .eq('id', session.user.id)
          .single();
        
        if (!profile?.clinic_id) {
          navigate("/onboarding/welcome");
          return;
        }

        const { data: clinica } = await (supabase as any)
          .from('clinicas')
          .select('onboarding_status')
          .eq('id', profile.clinic_id)
          .single();

        if (clinica?.onboarding_status !== 'completed') {
          navigate("/onboarding/welcome");
          return;
        }

        navigate("/dashboard");
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setTimeout(async () => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('clinic_id')
              .eq('id', session.user.id)
              .single();
            
            if (!profile?.clinic_id) {
              navigate("/onboarding/welcome");
              return;
            }

            const { data: clinica } = await (supabase as any)
              .from('clinicas')
              .select('onboarding_status')
              .eq('id', profile.clinic_id)
              .single();

            if (clinica?.onboarding_status !== 'completed') {
              navigate("/onboarding/welcome");
              return;
            }

            navigate("/dashboard");
          } catch (error) {
            console.error("Error checking user data:", error);
          }
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleContinueStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupEmail.trim() || !fullName.trim() || !clinicPhone.trim()) {
      toast({
        variant: "destructive",
        title: "Erro de Validação",
        description: "Por favor, preencha todos os campos obrigatórios",
      });
      return;
    }

    const emailValidation = z.string().email("Email inválido").safeParse(signupEmail);
    if (!emailValidation.success) {
      toast({
        variant: "destructive",
        title: "Erro de Validação",
        description: "Por favor, insira um email válido",
      });
      return;
    }

    setSignupStep(2);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double-submit
    
    const validation = signupSchema.safeParse({ 
      email: signupEmail, 
      password: signupPassword, 
      fullName 
    });
    
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Erro de Validação",
        description: validation.error.errors[0].message,
      });
      return;
    }

    if (!clinicName.trim()) {
      toast({
        variant: "destructive",
        title: "Erro de Validação",
        description: "Nome da clínica é obrigatório",
      });
      return;
    }

    if (!userRole) {
      toast({
        variant: "destructive",
        title: "Erro de Validação",
        description: "Por favor, selecione sua função/atuação",
      });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: validation.data.email,
      password: validation.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding/welcome`,
        data: {
          full_name: validation.data.fullName,
          clinic_name: clinicName,
          clinic_phone: clinicPhone,
          user_role: userRole,
          how_did_you_know: howDidYouKnow,
        },
      },
    });

    if (error) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: error.message,
      });
      return;
    }

    // Enviar email de boas-vindas para o dono da clínica
    if (data.user) {
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: {
            name: validation.data.fullName,
            email: validation.data.email,
            clinicName: clinicName,
            isOwner: true,
          }
        });
      } catch (emailError) {
        console.error("Erro ao enviar email de boas-vindas:", emailError);
        // Não bloquear o cadastro se o email falhar
      }
    }

    setLoading(false);
    toast({
      title: "Conta criada com sucesso!",
      description: "Você será redirecionado para o onboarding.",
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white">
        {/* Header */}
        <div className="p-6 border-b">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoFlowdent} alt="Flowdent" className="h-14 lg:h-16 w-auto" />
          </Link>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-[hsl(var(--flowdent-blue))] mb-2">
                Crie sua conta
              </h1>
              <p className="text-[hsl(var(--slate-gray))] mb-6">
                {signupStep === 1 
                  ? "Teste de graça por 7 dias. Não é necessário informar um cartão de crédito para começar, pague somente se gostar."
                  : "Quase lá! Precisamos de mais algumas informações para personalizar sua experiência."
                }
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  signupStep === 1
                    ? "bg-[hsl(var(--flowdent-blue)/0.1)] text-[hsl(var(--flowdent-blue))]"
                    : "bg-gray-100 text-gray-400"
                }`}
                onClick={() => setSignupStep(1)}
              >
                Suas informações
              </button>
              <button
                type="button"
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  signupStep === 2
                    ? "bg-[hsl(var(--flowdent-blue)/0.1)] text-[hsl(var(--flowdent-blue))]"
                    : "bg-gray-100 text-gray-400"
                }`}
                disabled={signupStep === 1}
              >
                Dados da clínica
              </button>
            </div>

            {signupStep === 1 ? (
              // STEP 1 - Suas informações
              <form onSubmit={handleContinueStep1} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="email@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Seu nome</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Ex: Leandro Martins"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic-phone">WhatsApp ou Celular da clínica</Label>
                  <Input
                    id="clinic-phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={clinicPhone}
                    onChange={(e) => setClinicPhone(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-[hsl(var(--flowdent-blue))] hover:bg-[hsl(var(--flow-turquoise))]"
                >
                  Continuar
                </Button>

                <div className="text-center">
                  <p className="text-sm text-[hsl(var(--slate-gray))]">
                    Já tem uma conta?{" "}
                    <Link
                      to="/auth"
                      className="text-[hsl(var(--flowdent-blue))] font-semibold hover:underline"
                    >
                      Entrar
                    </Link>
                  </p>
                </div>
              </form>
            ) : (
              // STEP 2 - Dados da clínica
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clinic-name">Nome da clínica</Label>
                  <Input
                    id="clinic-name"
                    type="text"
                    placeholder="Ex: Clínica Odonto Sorrir"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder={PASSWORD_HINT}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-role">Selecione sua função/atuação</Label>
                  <Select value={userRole} onValueChange={setUserRole} required>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dentista">Dentista</SelectItem>
                      <SelectItem value="secretaria">Secretária(o)</SelectItem>
                      <SelectItem value="administrador">Administrador(a)</SelectItem>
                      <SelectItem value="auxiliar">Auxiliar / ASB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="how-did-you-know">Como conheceu o Flowdent?</Label>
                  <Select value={howDidYouKnow} onValueChange={setHowDidYouKnow}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="indicacao">Indicação</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-xs text-center text-[hsl(var(--slate-gray))]">
                  Ao clicar em "Iniciar teste" você está concordando com nossos{" "}
                  <Link to="/termos" target="_blank" className="text-[hsl(var(--flowdent-blue))] hover:underline">
                    termos de uso
                  </Link>{" "}
                  e{" "}
                  <Link to="/privacidade" target="_blank" className="text-[hsl(var(--flowdent-blue))] hover:underline">
                    política de privacidade
                  </Link>.
                </p>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-[hsl(var(--flowdent-blue))] hover:bg-[hsl(var(--flow-turquoise))]" 
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Iniciar teste grátis
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12"
                  onClick={() => setSignupStep(1)}
                >
                  Voltar
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Right Side - Testimonials */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[hsl(var(--flowdent-blue))] to-[hsl(var(--flow-turquoise))] relative overflow-hidden">
        <TestimonialCarousel />
      </div>
    </div>
  );
};

export default Cadastro;
