import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import { z } from "zod";
import { criarPlanoPadrao } from "@/utils/criarPlanoPadrao";

const clinicSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  cnpj: z.string().trim().regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos").optional().or(z.literal("")),
  telefone: z.string().trim().regex(/^\d{10,11}$/, "Telefone deve ter 10 ou 11 dígitos").optional().or(z.literal("")),
});

const Clinica = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = clinicSchema.safeParse({ nome, cnpj: cnpj || undefined, telefone: telefone || undefined });

    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Erro de validação",
        description: validation.error.errors[0].message,
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Create clinic directly (Stripe data will be synced via check-subscription)
      const { data: clinicData, error: clinicError } = await (supabase as any)
        .from("clinicas")
        .insert({
          nome: validation.data.nome,
          cnpj: validation.data.cnpj || null,
          telefone: validation.data.telefone || null,
          tipo: "clinica",
          owner_user_id: user.id,
          onboarding_status: "in_progress",
          plano: "starter",
          status_assinatura: "trialing",
          current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (clinicError) throw clinicError;

      // Update user's clinic_id in profiles and usuarios
      await supabase.from("profiles").update({ clinic_id: (clinicData as any).id }).eq("id", user.id);
      
      await supabase
        .from("usuarios")
        .update({ clinica_id: (clinicData as any).id } as any)
        .eq("id", user.id);

      // Create default plan with all base procedures
      await criarPlanoPadrao((clinicData as any).id);

      toast({
        title: "Clínica criada com sucesso",
        description: "Agora vamos cadastrar o profissional responsável.",
      });

      navigate("/onboarding/profissional");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar clínica",
        description: error.message || "Ocorreu um erro inesperado.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto space-y-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/onboarding/tipo")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Dados da Clínica</CardTitle>
              <CardDescription>
                Preencha as informações básicas da sua clínica odontológica
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Clínica *</Label>
                  <Input
                    id="nome"
                    type="text"
                    placeholder="Clínica Odontológica Exemplo"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                  <Input
                    id="cnpj"
                    type="text"
                    placeholder="00000000000000"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value.replace(/\D/g, ""))}
                    maxLength={14}
                  />
                  <p className="text-sm text-muted-foreground">
                    Digite apenas números
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone (opcional)</Label>
                  <Input
                    id="telefone"
                    type="tel"
                    placeholder="11999999999"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ""))}
                    maxLength={11}
                  />
                  <p className="text-sm text-muted-foreground">
                    Digite apenas números (DDD + número)
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate("/onboarding/tipo")}
                    disabled={loading}
                  >
                    Voltar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Próximo: Cadastrar Dentista
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Clinica;
