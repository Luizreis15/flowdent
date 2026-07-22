import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import logoFlowdent from "@/assets/logo-flowdent.png";
import { PASSWORD_HINT, PASSWORD_MIN_LENGTH, passwordSchema } from "@/lib/password";

const PortalAuth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(
    searchParams.get("reset") === "true",
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteToken] = useState(searchParams.get("token") || "");

  useEffect(() => {
    if (searchParams.get("reset") === "true") {
      setIsResetPassword(true);
    }
  }, [searchParams]);

  // Se o Supabase processar um token de recovery na URL, força o formulário
  // de nova senha — senão o link vira login mágico (mesmo bug do AdminAuth).
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsResetPassword(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    checkExistingSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkExistingSession = async () => {
    try {
      // Não redirecionar em fluxo de recovery: a sessão existe, mas o usuário
      // ainda precisa definir a nova senha.
      if (searchParams.get("reset") === "true" || isResetPassword) {
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const { data: portalAccess } = await supabase
          .from("patient_portal_access")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("active", true)
          .maybeSingle();

        if (portalAccess) {
          navigate("/portal/dashboard");
        }
      }
    } catch (error) {
      console.error("Error checking session:", error);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a nova senha e a confirmação.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "As senhas devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    const validation = passwordSchema.safeParse(newPassword);
    if (!validation.success) {
      toast({
        title: "Senha inválida",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      toast({
        title: "Erro ao redefinir senha",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Senha redefinida!",
      description: "Sua senha foi alterada com sucesso.",
    });
    setIsResetPassword(false);
    setNewPassword("");
    setConfirmPassword("");

    // Após recovery, verifica se tem acesso ao portal; senão fica no login
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const { data: portalAccess } = await supabase
        .from("patient_portal_access")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("active", true)
        .maybeSingle();
      if (portalAccess) {
        navigate("/portal/dashboard");
        return;
      }
      await supabase.auth.signOut();
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const { data: portalAccess, error: accessError } = await supabase
          .from("patient_portal_access")
          .select("*")
          .eq("user_id", data.user.id)
          .eq("active", true)
          .maybeSingle();

        if (accessError || !portalAccess) {
          await supabase.auth.signOut();
          toast({
            title: "Acesso negado",
            description: "Você não tem permissão para acessar o portal do paciente.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Login realizado!",
          description: "Bem-vindo ao portal do paciente.",
        });

        navigate("/portal/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteToken) {
      toast({
        title: "Token inválido",
        description: "Você precisa de um convite para criar uma conta.",
        variant: "destructive",
      });
      return;
    }

    const validation = passwordSchema.safeParse(password);
    if (!validation.success) {
      toast({
        title: "Senha inválida",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: invite, error: inviteError } = await supabase
        .from("patient_portal_invites")
        .select("*, patients(*)")
        .eq("token", inviteToken)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (inviteError || !invite) {
        toast({
          title: "Convite inválido",
          description: "Este convite expirou ou já foi usado.",
          variant: "destructive",
        });
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/portal/dashboard`,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: accessError } = await supabase
          .from("patient_portal_access")
          .insert({
            patient_id: invite.patient_id,
            user_id: authData.user.id,
            active: true,
          });

        if (accessError) throw accessError;

        await supabase
          .from("patient_portal_invites")
          .update({ used_at: new Date().toISOString() })
          .eq("id", invite.id);

        toast({
          title: "Conta criada!",
          description: "Sua conta foi criada com sucesso. Faça login para continuar.",
        });

        setEmail(invite.email);
        setPassword("");
      }
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth && !isResetPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoFlowdent} alt="Flowdent" className="h-14 w-auto" />
          </div>
          <CardTitle className="text-2xl">
            {isResetPassword ? "Redefinir Senha" : "Portal do Paciente"}
          </CardTitle>
          <CardDescription>
            {isResetPassword
              ? "Defina uma nova senha para continuar"
              : "Acesse seus agendamentos, documentos e informações"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isResetPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                />
                <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={PASSWORD_MIN_LENGTH}
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
          ) : (
            <Tabs defaultValue={inviteToken ? "signup" : "signin"}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup" disabled={!inviteToken}>
                  Criar Conta
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">E-mail</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Senha</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {inviteToken ? (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nome Completo</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Seu nome"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Senha</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder={PASSWORD_HINT}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={PASSWORD_MIN_LENGTH}
                      />
                      <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        "Criar Conta"
                      )}
                    </Button>
                  </form>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Você precisa de um convite para criar uma conta.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalAuth;
