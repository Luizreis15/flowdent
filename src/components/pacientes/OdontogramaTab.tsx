import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FaceOclusal, FaceStatus } from "@/components/odontograma/FaceOclusal";
import { DenteVestibular } from "@/components/odontograma/DenteVestibular";
import {
  type CondicaoDente,
  condicaoDoProcedimento,
  condicaoPrevalente,
  larguraDente,
} from "@/components/odontograma/anatomia";
import { ProcedimentosTable } from "@/components/odontograma/ProcedimentosTable";

interface OdontogramaTabProps {
  patientId: string;
  onAddProcedimento?: () => void;
}

// Dentes permanentes FDI
const DENTES_PERMANENTES = {
  superior: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  inferior: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
};

// Dentes decíduos
const DENTES_DECIDUOS = {
  superior: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
  inferior: [85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
};

interface DenteData {
  faces: {
    vestibular: FaceStatus;
    mesial: FaceStatus;
    distal: FaceStatus;
    oclusal: FaceStatus;
    palatina: FaceStatus;
  };
  procedures: any[];
  /** Ausente, extração ou implante indicados/concluídos, derivados do nome do procedimento */
  condicao: CondicaoDente | null;
}

// Cada arcada é dividida na linha média: quadrantes à esquerda e à direita do paciente
const metades = (arr: number[]) => [arr.slice(0, arr.length / 2), arr.slice(arr.length / 2)];

const Fileira = ({
  rotulo,
  numeros,
  render,
}: {
  rotulo: string;
  numeros: number[];
  render: (dente: number) => React.ReactNode;
}) => {
  const [esquerda, direita] = metades(numeros);
  return (
    <div className="flex items-center">
      <span className="w-20 shrink-0 text-xs text-muted-foreground">{rotulo}</span>
      <div className="flex flex-1 items-center justify-center">
        <div className="flex items-center justify-end">{esquerda.map(render)}</div>
        <div className="mx-2 w-px self-stretch bg-border" aria-hidden />
        <div className="flex items-center justify-start">{direita.map(render)}</div>
      </div>
    </div>
  );
};

/** Numeração FDI em etiquetas mono: a assinatura do odontograma. */
const NumerosFdi = ({
  numeros,
  selecionado,
  onSelecionar,
}: {
  numeros: number[];
  selecionado: number | null;
  onSelecionar: (dente: number) => void;
}) => (
  <Fileira
    rotulo=""
    numeros={numeros}
    render={(dente) => (
      <div key={`fdi-${dente}`} className="flex shrink-0 justify-center" style={{ width: larguraDente(dente) }}>
        <button
          type="button"
          onClick={() => onSelecionar(dente)}
          className={cn(
            "h-5 min-w-[26px] rounded border px-1 font-mono text-[11px] leading-[18px] tabular-nums transition-colors duration-150",
            selecionado === dente
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          {dente}
        </button>
      </div>
    )}
  />
);

export const OdontogramaTab = ({ patientId, onAddProcedimento }: OdontogramaTabProps) => {
  const [denticao, setDenticao] = useState<"permanente" | "decidua">("permanente");
  const [selectedDente, setSelectedDente] = useState<number | null>(null);
  const [selectedFace, setSelectedFace] = useState<string | null>(null);
  const [dentesData, setDentesData] = useState<Record<number, DenteData>>({});
  const [loading, setLoading] = useState(true);
  const [budgetItems, setBudgetItems] = useState<any[]>([]);

  const dentes = denticao === "permanente" ? DENTES_PERMANENTES : DENTES_DECIDUOS;

  useEffect(() => {
    loadDentalData();
  }, [patientId]);

  const loadDentalData = async () => {
    try {
      setLoading(false);

      const { data: budgets, error: budgetsError } = await supabase
        .from("budgets")
        .select("id")
        .eq("patient_id", patientId);

      if (budgetsError) throw budgetsError;

      if (budgets && budgets.length > 0) {
        const budgetIds = budgets.map(b => b.id);
        
        const { data: items, error: itemsError } = await supabase
          .from("budget_items")
          .select("*")
          .in("budget_id", budgetIds)
          .not("tooth_number", "is", null);

        if (itemsError) throw itemsError;
        setBudgetItems(items || []);

        // Mapear dados por dente
        const dataMap: Record<number, DenteData> = {};
        
        (items || []).forEach((item: any) => {
          if (!item.tooth_number) return;
          
          const dentesArr = item.tooth_number.split(",").map((d: string) => parseInt(d.trim()));
          const faces = item.tooth_faces?.split(",").map((f: string) => f.trim().toLowerCase()) || [];
          
          // Mapear status do tratamento para status visual
          const getVisualStatus = (treatmentStatus: string): FaceStatus => {
            switch (treatmentStatus) {
              case "completed": return "executado";
              case "in_progress": return "existente";
              case "pending": 
              default: return "a_realizar";
            }
          };
          
          dentesArr.forEach((denteNum: number) => {
            if (!dataMap[denteNum]) {
              dataMap[denteNum] = {
                faces: {
                  vestibular: null,
                  mesial: null,
                  distal: null,
                  oclusal: null,
                  palatina: null,
                },
                procedures: [],
                condicao: null,
              };
            }
            
            dataMap[denteNum].procedures.push(item);
            dataMap[denteNum].condicao = condicaoPrevalente(
              dataMap[denteNum].condicao,
              condicaoDoProcedimento(item.procedure_name, item.treatment_status === "completed"),
            );
            
            // Atualizar status das faces
            const status = getVisualStatus(item.treatment_status);
            faces.forEach((face: string) => {
              const faceKey = face.charAt(0).toLowerCase();
              if (faceKey === 'v') dataMap[denteNum].faces.vestibular = status;
              if (faceKey === 'm') dataMap[denteNum].faces.mesial = status;
              if (faceKey === 'd') dataMap[denteNum].faces.distal = status;
              if (faceKey === 'o' || faceKey === 'i') dataMap[denteNum].faces.oclusal = status;
              if (faceKey === 'p' || faceKey === 'l') dataMap[denteNum].faces.palatina = status;
            });
            
            // Se não tem faces específicas, marca a oclusal
            if (faces.length === 0) {
              dataMap[denteNum].faces.oclusal = status;
            }
          });
        });

        setDentesData(dataMap);
      }

    } catch (error: any) {
      console.error("Erro ao carregar dados do odontograma:", error);
      toast.error("Erro ao carregar dados do odontograma");
    } finally {
      setLoading(false);
    }
  };

  const handleDenteClick = (dente: number) => {
    setSelectedDente(selectedDente === dente ? null : dente);
    setSelectedFace(null);
  };

  const handleFaceClick = (dente: number, face: string) => {
    setSelectedDente(dente);
    setSelectedFace(face);
  };

  const getDefaultFaces = () => ({
    vestibular: null as FaceStatus,
    mesial: null as FaceStatus,
    distal: null as FaceStatus,
    oclusal: null as FaceStatus,
    palatina: null as FaceStatus,
  });

  // Preparar procedimentos para a tabela
  const procedimentosTabela = budgetItems.map(item => ({
    id: item.id,
    date: item.created_at,
    dente: item.tooth_number || "-",
    nome: item.procedure_name,
    status: item.treatment_status === "completed" ? "executado" as const : 
           item.treatment_status === "in_progress" ? "existente" as const : "a_realizar" as const,
    faces: item.tooth_faces,
    valor: item.total_price,
  }));

  const getVestibularStatus = (dente: number): FaceStatus => {
    const data = dentesData[dente];
    if (!data) return null;
    // Retorna o status mais grave das faces
    const statuses = Object.values(data.faces).filter(Boolean);
    if (statuses.includes("a_realizar")) return "a_realizar";
    if (statuses.includes("existente")) return "existente";
    if (statuses.includes("executado")) return "executado";
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando odontograma...</p>
      </div>
    );
  }

  const legenda: { rotulo: string; cor: string }[] = [
    { rotulo: "A realizar", cor: "bg-clinico-a-realizar" },
    { rotulo: "Executado", cor: "bg-clinico-executado" },
    { rotulo: "Existente / prótese", cor: "bg-clinico-protese" },
    { rotulo: "Ausente", cor: "bg-clinico-ausente" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={denticao} onValueChange={(v) => setDenticao(v as "permanente" | "decidua")}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue placeholder="Dentição" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="permanente">Permanente</SelectItem>
              <SelectItem value="decidua">Decídua</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Salvar marcação">
            <Bookmark className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {legenda.map(({ rotulo, cor }) => (
            <span key={rotulo} className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", cor)} />
              {rotulo}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="font-mono text-[13px] leading-none text-clinico-a-realizar" aria-hidden>×</span>
            Extração indicada
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card px-6 py-5">
        <div className="mx-auto w-max min-w-full space-y-1">
          <Fileira
            rotulo="Vestibular"
            numeros={dentes.superior}
            render={(dente) => (
              <DenteVestibular
                key={`vest-sup-${dente}`}
                condicao={dentesData[dente]?.condicao}
                numero={dente}
                status={getVestibularStatus(dente)}
                onClick={() => handleDenteClick(dente)}
                coroaPara="baixo"
                selecionado={selectedDente === dente}
              />
            )}
          />
          <Fileira
            rotulo="Oclusal"
            numeros={dentes.superior}
            render={(dente) => (
              <FaceOclusal
                key={`ocl-sup-${dente}`}
                condicao={dentesData[dente]?.condicao}
                numero={dente}
                faces={dentesData[dente]?.faces || getDefaultFaces()}
                onFaceClick={(face) => handleFaceClick(dente, face)}
                selected={selectedDente === dente}
              />
            )}
          />
          <Fileira
            rotulo="Palatina"
            numeros={dentes.superior}
            render={(dente) => (
              <DenteVestibular
                key={`pal-sup-${dente}`}
                condicao={dentesData[dente]?.condicao}
                numero={dente}
                status={dentesData[dente]?.faces.palatina || null}
                onClick={() => handleDenteClick(dente)}
                coroaPara="cima"
                vista="lingual"
                selecionado={selectedDente === dente}
              />
            )}
          />

          <div className="space-y-1.5 py-3">
            <NumerosFdi numeros={dentes.superior} selecionado={selectedDente} onSelecionar={handleDenteClick} />
            <NumerosFdi numeros={dentes.inferior} selecionado={selectedDente} onSelecionar={handleDenteClick} />
          </div>

          <Fileira
            rotulo="Lingual"
            numeros={dentes.inferior}
            render={(dente) => (
              <DenteVestibular
                key={`ling-inf-${dente}`}
                condicao={dentesData[dente]?.condicao}
                numero={dente}
                status={dentesData[dente]?.faces.palatina || null}
                onClick={() => handleDenteClick(dente)}
                coroaPara="baixo"
                vista="lingual"
                selecionado={selectedDente === dente}
              />
            )}
          />
          <Fileira
            rotulo="Oclusal"
            numeros={dentes.inferior}
            render={(dente) => (
              <FaceOclusal
                key={`ocl-inf-${dente}`}
                condicao={dentesData[dente]?.condicao}
                numero={dente}
                faces={dentesData[dente]?.faces || getDefaultFaces()}
                onFaceClick={(face) => handleFaceClick(dente, face)}
                selected={selectedDente === dente}
              />
            )}
          />
          <Fileira
            rotulo="Vestibular"
            numeros={dentes.inferior}
            render={(dente) => (
              <DenteVestibular
                key={`vest-inf-${dente}`}
                condicao={dentesData[dente]?.condicao}
                numero={dente}
                status={getVestibularStatus(dente)}
                onClick={() => handleDenteClick(dente)}
                coroaPara="cima"
                selecionado={selectedDente === dente}
              />
            )}
          />
        </div>
      </div>

      <ProcedimentosTable
        procedimentos={procedimentosTabela}
        onAddProcedimento={onAddProcedimento}
        onPrint={() => window.print()}
      />
    </div>
  );
};
