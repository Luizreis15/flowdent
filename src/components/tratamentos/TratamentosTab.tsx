import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Odontograma } from "@/components/orcamentos/Odontograma";
import { AdicionarEvolucaoModal } from "./AdicionarEvolucaoModal";

interface Treatment {
  id: string;
  procedure_name: string;
  procedure_code: string;
  tooth_region: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  treatment_status: 'pending' | 'in_progress' | 'completed';
  updated_at: string;
  budget_id: string;
}

interface Evolution {
  id: string;
  description: string;
  evolution_date: string;
  professional_id: string;
  status: string;
  profissionais: {
    nome: string;
  };
}

interface TratamentosTabProps {
  patientId: string;
}

export const TratamentosTab = ({ patientId }: TratamentosTabProps) => {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEvolucaoModal, setShowEvolucaoModal] = useState(false);
  const [selectedDentes, setSelectedDentes] = useState<string[]>([]);
  const [evolutions, setEvolutions] = useState<Record<string, Evolution[]>>({});
  const [expandedTreatment, setExpandedTreatment] = useState<string | null>(null);

  useEffect(() => {
    loadTreatments();
  }, [patientId]);

  const loadTreatments = async () => {
    try {
      setLoading(true);
      
      // Buscar procedimentos de orçamentos aprovados
      const { data: budgetsData, error: budgetsError } = await supabase
        .from("budgets")
        .select("id")
        .eq("patient_id", patientId)
        .eq("status", "approved");

      if (budgetsError) throw budgetsError;

      if (budgetsData && budgetsData.length > 0) {
        const budgetIds = budgetsData.map(b => b.id);
        
        const { data: itemsData, error: itemsError } = await supabase
          .from("budget_items")
          .select("*")
          .in("budget_id", budgetIds)
          .order("created_at", { ascending: false });

        if (itemsError) throw itemsError;
        setTreatments((itemsData || []) as Treatment[]);

        // Carregar evoluções para cada tratamento
        if (itemsData && itemsData.length > 0) {
          const itemIds = itemsData.map(item => item.id);
          const { data: evolutionsData } = await supabase
            .from("treatment_evolutions")
            .select(`
              *,
              profissionais (nome)
            `)
            .in("budget_item_id", itemIds)
            .order("evolution_date", { ascending: false });

          if (evolutionsData) {
            const evolutionsByTreatment: Record<string, Evolution[]> = {};
            evolutionsData.forEach((evo: any) => {
              if (!evolutionsByTreatment[evo.budget_item_id]) {
                evolutionsByTreatment[evo.budget_item_id] = [];
              }
              evolutionsByTreatment[evo.budget_item_id].push(evo);
            });
            setEvolutions(evolutionsByTreatment);
          }
        }
      }
    } catch (error: any) {
      console.error("Erro ao carregar tratamentos:", error);
      toast.error("Erro ao carregar tratamentos");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTreatment = (treatmentId: string) => {
    setSelectedTreatments(prev =>
      prev.includes(treatmentId)
        ? prev.filter(id => id !== treatmentId)
        : [...prev, treatmentId]
    );
  };

  const handleUpdateToothRegion = async (treatmentId: string) => {
    if (selectedDentes.length === 0) {
      toast.error("Selecione pelo menos um dente ou região");
      return;
    }

    try {
      const { error } = await supabase
        .from("budget_items")
        .update({ tooth_region: selectedDentes.join(", ") })
        .eq("id", treatmentId);

      if (error) throw error;

      toast.success("Dentes associados com sucesso");
      setSelectedDentes([]);
      loadTreatments();
    } catch (error: any) {
      console.error("Erro ao associar dentes:", error);
      toast.error("Erro ao associar dentes");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="border-transparent bg-sinal-ok-tenue text-sinal-ok"><CheckCircle2 className="h-3 w-3 mr-1" />Finalizado</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Em andamento</Badge>;
      default:
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
  };

  const getToothColor = (tooth: string): string => {
    const treatmentsForTooth = treatments.filter(t => 
      t.tooth_region?.split(",").map(d => d.trim()).includes(tooth)
    );
    
    if (treatmentsForTooth.length === 0) return "";
    
    const hasCompleted = treatmentsForTooth.some(t => t.treatment_status === "completed");
    const hasInProgress = treatmentsForTooth.some(t => t.treatment_status === "in_progress");
    const hasPending = treatmentsForTooth.some(t => t.treatment_status === "pending");
    
    if (hasCompleted) return "completed";
    if (hasInProgress) return "in_progress";
    if (hasPending) return "pending";
    
    return "";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Carregando tratamentos...</p>
        </CardContent>
      </Card>
    );
  }

  if (treatments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Nenhum tratamento aprovado encontrado. Aprove um orçamento primeiro.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Odontograma Visual */}
      <Card>
        <CardHeader>
          <CardTitle>Odontograma Visual</CardTitle>
        </CardHeader>
        <CardContent>
          <Odontograma
            dentesSelecionados={selectedDentes}
            onDentesChange={setSelectedDentes}
            statusDentes={treatments.reduce((acc, t) => {
              if (t.tooth_region) {
                t.tooth_region.split(",").forEach(tooth => {
                  const trimmedTooth = tooth.trim();
                  acc[trimmedTooth] = t.treatment_status;
                });
              }
              return acc;
            }, {} as Record<string, string>)}
          />
          
          {/* Legenda */}
          <div className="mt-4 flex gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-clinico-executado"></div>
              <span>Finalizado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <span>Em andamento</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-400"></div>
              <span>Pendente</span>
            </div>
          </div>
          
          {selectedDentes.length > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">
                Dentes selecionados: {selectedDentes.join(", ")}
              </p>
              <p className="text-xs text-muted-foreground">
                Selecione um procedimento abaixo e clique em "Associar" para vincular estes dentes.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Tratamentos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Procedimentos Aprovados</CardTitle>
          <Button
            onClick={() => setShowEvolucaoModal(true)}
            disabled={selectedTreatments.length === 0}
            className="bg-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar evolução
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {treatments.map((treatment) => (
              <div
                key={treatment.id}
                className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedTreatments.includes(treatment.id)}
                    onCheckedChange={() => handleToggleTreatment(treatment.id)}
                  />
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{treatment.procedure_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Código: {treatment.procedure_code || "N/A"}
                        </p>
                      </div>
                      {getStatusBadge(treatment.treatment_status)}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Dente(s):</span>{" "}
                        <span className="font-medium">{treatment.tooth_region || "Não associado"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor:</span>{" "}
                        <span className="font-medium">
                          R$ {treatment.total_price?.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {!treatment.tooth_region && selectedDentes.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateToothRegion(treatment.id)}
                      >
                        Associar dentes selecionados
                      </Button>
                    )}

                    {/* Evoluções */}
                    {evolutions[treatment.id] && evolutions[treatment.id].length > 0 && (
                      <div className="mt-4 space-y-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedTreatment(
                            expandedTreatment === treatment.id ? null : treatment.id
                          )}
                        >
                          {expandedTreatment === treatment.id ? "Ocultar" : "Ver"} evoluções ({evolutions[treatment.id].length})
                        </Button>

                        {expandedTreatment === treatment.id && (
                          <div className="pl-4 border-l-2 border-primary/20 space-y-3">
                            {evolutions[treatment.id].map((evo) => (
                              <div key={evo.id} className="text-sm space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{evo.profissionais.nome}</span>
                                  <span className="text-muted-foreground">
                                    {new Date(evo.evolution_date).toLocaleDateString("pt-BR")}
                                  </span>
                                </div>
                                <p className="text-muted-foreground">{evo.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Evolução */}
      <AdicionarEvolucaoModal
        open={showEvolucaoModal}
        onOpenChange={setShowEvolucaoModal}
        patientId={patientId}
        treatments={treatments.filter(t => selectedTreatments.includes(t.id))}
        onSuccess={() => {
          loadTreatments();
          setSelectedTreatments([]);
        }}
      />
    </div>
  );
};
