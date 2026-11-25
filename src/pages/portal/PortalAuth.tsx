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
import { Logo } from "@/components/brand/Logo";
import { PASSWORD_HINT, PASSWORD_MIN_LENGTH, passwordSchema } from "@/lib/password";
import {
  mensagemVinculo,
  temAcessoAtivo,
  validarConvite,
  vincularConvite,
  type ConvitePortal,
} from "@/lib/portalConvite";

type SituacaoConvite = "sem_token" | "validando" | "valido" | "invalido";

const erroMsg = (e: unknown) => (e instanceof Error ? e.message : "Tente de novo.");

const PortalAuth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(searchParams.get("reset") === "true");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteToken] = useState(searchParams.get("token") || "");
  const [convite, setConvite] = useState<ConvitePortal | null>(null);
  const [situacaoConvite, setSituacaoConvite] = useState<SituacaoConvite>(inviteToken ? "validando" : "sem_token");
  const [aba, setAba] = useState(inviteToken ? "signup" : "signin");
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);

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
    if (!inviteToken) return;
    validarConvite(inviteToken).then((encontrado) => {
      if (encontrado) {
        setConvite(encontrado);
        setEmail(encontrado.email);
        setSituacaoConvite("valido");
      } else {
        setSituacaoConvite("invalido");
        setAba("signin");
      }
    });
  }, [inviteToken]);

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
      if (!session) return;

      // Voltando do link de confirmação de e-mail (ou já logado ao abrir o convite): aceita o convite.
      let erroVinculo: string | null = null;
      if (inviteToken) erroVinculo = await vincularConvite(inviteToken);

      if (await temAcessoAtivo(session.user.id)) {
        navigate("/portal/dashboard");
      } else if (erroVinculo && erroVinculo !== "convite_invalido") {
        toast({ title: "Acesso não liberado", description: mensagemVinculo(erroVinculo), variant: "destructive" });
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
      title: "Senha redefinida",
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
      if (await temAcessoAtivo(session.user.id)) {
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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        // Quem já tinha conta e recebeu um convite aceita ao entrar.
        const erroVinculo = situacaoConvite === "valido" ? await vincularConvite(inviteToken) : null;

        if (!(await temAcessoAtivo(data.user.id))) {
          await supabase.auth.signOut();
          toast({
            title: "Acesso negado",
            description: erroVinculo
              ? mensagemVinculo(erroVinculo)
              : "Esta conta não tem acesso ao portal do paciente. Use o link de convite enviado pela clínica.",
            variant: "destructive",
          });
          return;
        }

        navigate("/portal/dashboard");
      }
    } catch (error) {
      toast({
        title: "Erro ao entrar",
        description: erroMsg(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convite) return;

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
      const { data, error } = await supabase.auth.signUp({
        email: convite.email,
        password,
        options: {
          data: { full_name: fullName },
          // Se o projeto exigir confirmação de e-mail, o link volta para cá com o token e o acesso é liberado.
          emailRedirectTo: `${window.location.origin}/portal/auth?token=${encodeURIComponent(inviteToken)}`,
        },
      });

      // E-mail já cadastrado: com confirmação ligada o Supabase não devolve erro, só identities vazio.
      const jaExiste =
        error?.message?.toLowerCase().includes("already registered") || data?.user?.identities?.length === 0;
      if (jaExiste) {
        setAba("signin");
        setPassword("");
        toast({
          title: "Este e-mail já tem conta",
          description: "Entre com sua senha para aceitar o convite.",
        });
        return;
      }
      if (error) throw error;

      if (!data.session) {
        setAguardandoConfirmacao(true);
        return;
      }

      const erroVinculo = await vincularConvite(inviteToken);
      if (erroVinculo) {
        await supabase.auth.signOut();
        toast({ title: "Acesso não liberado", description: mensagemVinculo(erroVinculo), variant: "destructive" });
        return;
      }

      navigate("/portal/dashboard");
    } catch (error) {
      toast({
        title: "Erro ao criar conta",
        description: erroMsg(error),
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

  const descricao = isResetPassword
    ? "Defina uma nova senha para continuar"
    : convite
      ? `Olá, ${convite.primeiro_nome}. Crie sua senha para acessar o portal${convite.clinica ? ` da ${convite.clinica}` : ""}.`
      : "Entre com o e-mail e a senha que você criou pelo convite da clínica";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo className="h-10" />
          </div>
          <CardTitle className="text-h2">{isResetPassword ? "Redefinir senha" : "Portal do paciente"}</CardTitle>
          <CardDescription>{descricao}</CardDescription>
        </CardHeader>
        <CardContent>
          {isResetPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
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
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
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
                  "Redefinir senha"
                )}
              </Button>
            </form>
          ) : aguardandoConfirmacao ? (
            <div className="space-y-2 py-4 text-center">
              <p className="text-sm font-medium text-foreground">Confirme seu e-mail</p>
              <p className="text-sm text-muted-foreground">
                Enviamos um link para {convite?.email}. Ao abrir o link, seu acesso ao portal é liberado.
              </p>
            </div>
          ) : (
            <>
              {situacaoConvite === "invalido" && (
                <div className="mb-4 rounded-lg border-l-[3px] border-l-sinal-alerta bg-sinal-alerta-tenue px-4 py-3">
                  <p className="text-sm text-foreground">
                    Este convite expirou ou já foi usado. Se você já criou sua conta, entre abaixo. Senão, peça um novo
                    link à clínica.
                  </p>
                </div>
              )}
              <Tabs value={aba} onValueChange={setAba}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Entrar</TabsTrigger>
                  <TabsTrigger value="signup" disabled={situacaoConvite !== "valido"}>
                    Criar conta
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
                  {situacaoConvite === "validando" ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : convite ? (
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">E-mail</Label>
                        <Input id="signup-email" type="email" value={convite.email} disabled readOnly />
                        <p className="text-xs text-muted-foreground">É o e-mail do convite. Você entra com ele.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Nome completo</Label>
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
                          "Criar conta"
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalAuth;
