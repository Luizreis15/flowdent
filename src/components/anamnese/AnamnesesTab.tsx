import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Eye, Copy, FileDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import NovaAnamneseModal from "./NovaAnamneseModal";
import VisualizarAnamneseModal from "./VisualizarAnamneseModal";

interface Anamnese {
  id: string;
  data: string;
  status: string;
  alerta_clinico: boolean;
  alerta_descricao: string | null;
  finalizada_em: string | null;
  anamnese_modelos: {
    nome: string;
  };
  profissionais: {
    nome: string;
  };
}

interface AnamnesesTabProps {
  patientId: string;
}

export default function AnamnesesTab({ patientId }: AnamnesesTabProps) {
  const [anamneses, setAnamneses] = useState<Anamnese[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovaAnamnese, setShowNovaAnamnese] = useState(false);
  const [showVisualizar, setShowVisualizar] = useState(false);
  const [selectedAnamneseId, setSelectedAnamneseId] = useState<string | null>(null);
  const [duplicateFromId, setDuplicateFromId] = useState<string | null>(null);

  const loadAnamneses = async () => {
    try {
      const { data, error } = await supabase
        .from("anamneses")
        .select(`
          *,
          anamnese_modelos(nome),
          profissionais(nome)
        `)
        .eq("paciente_id", patientId)
        .order("data", { ascending: false });

      if (error) throw error;
      setAnamneses(data || []);
    } catch (error) {
      console.error("Erro ao carregar anamneses:", error);
      toast.error("Erro ao carregar anamneses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnamneses();
  }, [patientId]);

  const handleDuplicate = (anamneseId: string) => {
    setDuplicateFromId(anamneseId);
    setShowNovaAnamnese(true);
  };

  const handleVisualizar = (anamneseId: string) => {
    setSelectedAnamneseId(anamneseId);
    setShowVisualizar(true);
  };

  const handleGerarPDF = async (anamneseId: string) => {
    toast.info("Funcionalidade de PDF em desenvolvimento");
  };

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Anamneses</h2>
          <p className="text-muted-foreground">
            Histórico de anamneses do paciente
          </p>
        </div>
        <Button onClick={() => setShowNovaAnamnese(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Anamnese
        </Button>
      </div>

      {/* Lista de Anamneses */}
      {anamneses.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma anamnese registrada</h3>
          <p className="text-muted-foreground mb-6">
            Comece criando a primeira anamnese deste paciente
          </p>
          <Button onClick={() => setShowNovaAnamnese(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeira Anamnese
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {anamneses.map((anamnese) => (
            <Card key={anamnese.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">
                      {anamnese.anamnese_modelos.nome}
                    </h3>
                    <Badge
                      variant={
                        anamnese.status === "finalizada"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {anamnese.status === "finalizada"
                        ? "Finalizada"
                        : "Rascunho"}
                    </Badge>
                    {anamnese.alerta_clinico && (
                      <Badge variant="destructive">Alerta Clínico</Badge>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      Data:{" "}
                      {format(new Date(anamnese.data), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                    <p>Responsável: {anamnese.profissionais.nome}</p>
                    {anamnese.finalizada_em && (
                      <p>
                        Finalizada em:{" "}
                        {format(
                          new Date(anamnese.finalizada_em),
                          "dd/MM/yyyy 'às' HH:mm",
                          { locale: ptBR }
                        )}
                      </p>
                    )}
                    {anamnese.alerta_descricao && (
                      <p className="text-destructive font-medium mt-2">
                        {anamnese.alerta_descricao}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVisualizar(anamnese.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(anamnese.id)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {anamnese.status === "finalizada" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGerarPDF(anamnese.id)}
                    >
                      <FileDown className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      {showNovaAnamnese && (
        <NovaAnamneseModal
          open={showNovaAnamnese}
          onClose={() => {
            setShowNovaAnamnese(false);
            setDuplicateFromId(null);
          }}
          patientId={patientId}
          duplicateFromId={duplicateFromId}
          onSuccess={loadAnamneses}
        />
      )}

      {showVisualizar && selectedAnamneseId && (
        <VisualizarAnamneseModal
          open={showVisualizar}
          onClose={() => {
            setShowVisualizar(false);
            setSelectedAnamneseId(null);
          }}
          anamneseId={selectedAnamneseId}
        />
      )}
    </div>
  );
}
