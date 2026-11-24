import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, CreditCard, User, LogOut } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      {/* Header */}
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Portal do Paciente</h1>
            <p className="text-sm text-muted-foreground">
              Olá, {patient?.full_name}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Meus Agendamentos */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <Calendar className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Meus Agendamentos</CardTitle>
              <CardDescription>
                Veja suas consultas marcadas e histórico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                Ver Agendamentos
              </Button>
            </CardContent>
          </Card>

          {/* Meus Documentos */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <FileText className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Meus Documentos</CardTitle>
              <CardDescription>
                Acesse contratos, atestados e receituários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                Ver Documentos
              </Button>
            </CardContent>
          </Card>

          {/* Financeiro */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CreditCard className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Financeiro</CardTitle>
              <CardDescription>
                Orçamentos, pagamentos e faturas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                Ver Financeiro
              </Button>
            </CardContent>
          </Card>

          {/* Meu Perfil */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <User className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Meu Perfil</CardTitle>
              <CardDescription>
                Gerencie seus dados pessoais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                Ver Perfil
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Avisos */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Avisos Importantes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Não há avisos no momento.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PortalDashboard;
