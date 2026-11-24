import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { CabecalhoPagina } from "@/components/sistema/CabecalhoPagina";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { CalendarDays, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PortalDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/portal/auth");
        return;
      }

      // Buscar dados do paciente
      const { data: portalAccess } = await supabase
        .from("patient_portal_access")
        .select(`
          *,
          patients (*)
        `)
        .eq("user_id", session.user.id)
        .eq("active", true)
        .single();

      if (!portalAccess) {
        await supabase.auth.signOut();
        navigate("/portal/auth");
        return;
      }

      setPatient(portalAccess.patients);
    } catch (error) {
      console.error("Error checking access:", error);
      navigate("/portal/auth");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até breve",
    });
    navigate("/portal/auth");
  };

  if (loading) return null;

  // Os cartões "Meus agendamentos", "Documentos", "Financeiro" e "Perfil" saíram: os botões
  // não levavam a lugar nenhum. Voltam quando cada área tiver conteúdo.
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Logo className="h-7" />
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-1.5 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <CabecalhoPagina titulo={`Olá, ${patient?.full_name?.split(" ")[0] ?? ""}`} subtitulo="Portal do paciente" />
        <Card>
          <CardContent className="p-0">
            <EstadoVazio
              icone={CalendarDays}
              titulo="Seu portal está sendo preparado"
              descricao="Em breve você verá aqui suas consultas, documentos e pagamentos com a clínica."
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PortalDashboard;
