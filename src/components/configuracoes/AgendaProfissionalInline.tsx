import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy, RotateCcw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AgendaConfig {
  dia_semana: number;
  ativo: boolean;
  hora_inicio: string;
  hora_fim: string;
  almoco_inicio: string | null;
  almoco_fim: string | null;
  duracao_consulta_minutos: number;
}

interface AgendaProfissionalInlineProps {
  profissional: { id: string; nome: string };
}

const diasSemana = [
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

const DEFAULT_CONFIG: AgendaConfig = {
  dia_semana: 1,
  ativo: true,
  hora_inicio: "09:00",
  hora_fim: "18:00",
  almoco_inicio: "12:00",
  almoco_fim: "13:00",
  duracao_consulta_minutos: 30,
};

export const AgendaProfissionalInline = ({ profissional }: AgendaProfissionalInlineProps) => {
  const [configs, setConfigs] = useState<AgendaConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, [profissional.id]);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profissional_agenda_config")
        .select("*")
        .eq("profissional_id", profissional.id);

      if (error) throw error;

      const initialConfigs = diasSemana.map((dia) => {
        const existing = data?.find((d) => d.dia_semana === dia.value);
        if (existing) {
          return {
            dia_semana: dia.value,
            ativo: existing.ativo,
            hora_inicio: existing.hora_inicio,
            hora_fim: existing.hora_fim,
            almoco_inicio: existing.almoco_inicio,
            almoco_fim: existing.almoco_fim,
            duracao_consulta_minutos: existing.duracao_consulta_minutos,
          };
        }
        if (dia.value === 6) {
          return { dia_semana: dia.value, ativo: true, hora_inicio: "09:00", hora_fim: "13:00", almoco_inicio: null, almoco_fim: null, duracao_consulta_minutos: 30 };
        }
        return { ...DEFAULT_CONFIG, dia_semana: dia.value, ativo: dia.value >= 1 && dia.value <= 5 };
      });

      setConfigs(initialConfigs);
    } catch (error: any) {
      toast.error("Erro ao carregar configurações: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (dia: number, field: keyof AgendaConfig, value: any) => {
    setConfigs((prev) => prev.map((c) => c.dia_semana === dia ? { ...c, [field]: value } : c));
  };

  const applyToWeekdays = () => {
    const monday = configs.find((c) => c.dia_semana === 1);
    if (!monday) return;
    setConfigs((prev) => prev.map((c) => {
      if (c.dia_semana >= 1 && c.dia_semana <= 5) {
        return { ...c, ativo: monday.ativo, hora_inicio: monday.hora_inicio, hora_fim: monday.hora_fim, almoco_inicio: monday.almoco_inicio, almoco_fim: monday.almoco_fim, duracao_consulta_minutos: monday.duracao_consulta_minutos };
      }
      return c;
    }));
    toast.success("Configuração aplicada aos dias úteis");
  };

  const resetDefaults = () => {
    setConfigs(diasSemana.map((dia) => {
      if (dia.value === 6) return { dia_semana: dia.value, ativo: true, hora_inicio: "09:00", hora_fim: "13:00", almoco_inicio: null, almoco_fim: null, duracao_consulta_minutos: 30 };
      return { ...DEFAULT_CONFIG, dia_semana: dia.value, ativo: dia.value >= 1 && dia.value <= 5 };
    }));
    toast.success("Configurações resetadas");
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error: deleteError } = await supabase.from("profissional_agenda_config").delete().eq("profissional_id", profissional.id);
      if (deleteError) throw deleteError;

      const configsToInsert = configs.map((c) => ({
        profissional_id: profissional.id,
        dia_semana: c.dia_semana,
        ativo: c.ativo,
        hora_inicio: c.hora_inicio,
        hora_fim: c.hora_fim,
        almoco_inicio: c.almoco_inicio || null,
        almoco_fim: c.almoco_fim || null,
        duracao_consulta_minutos: c.duracao_consulta_minutos,
      }));

      const { error: insertError } = await supabase.from("profissional_agenda_config").insert(configsToInsert);
      if (insertError) throw insertError;

      toast.success("Agenda configurada com sucesso");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={applyToWeekdays}>
          <Copy className="h-4 w-4 mr-2" />
          Aplicar a dias úteis
        </Button>
        <Button variant="outline" size="sm" onClick={resetDefaults}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar padrão
        </Button>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {diasSemana.map((dia) => {
            const config = configs.find((c) => c.dia_semana === dia.value);
            if (!config) return null;

            return (
              <div key={dia.value} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{dia.label}</h3>
                  <div className="flex items-center gap-2">
                    <Switch checked={config.ativo} onCheckedChange={(checked) => updateConfig(dia.value, "ativo", checked)} />
                    <Label className="text-xs">Atende</Label>
                  </div>
                </div>

                {config.ativo && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Início</Label>
                      <Input type="time" value={config.hora_inicio} onChange={(e) => updateConfig(dia.value, "hora_inicio", e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fim</Label>
                      <Input type="time" value={config.hora_fim} onChange={(e) => updateConfig(dia.value, "hora_fim", e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Duração (min)</Label>
                      <Input type="number" step="5" min="5" value={config.duracao_consulta_minutos} onChange={(e) => updateConfig(dia.value, "duracao_consulta_minutos", parseInt(e.target.value) || 30)} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Almoço início</Label>
                      <Input type="time" value={config.almoco_inicio || ""} onChange={(e) => updateConfig(dia.value, "almoco_inicio", e.target.value || null)} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Almoço fim</Label>
                      <Input type="time" value={config.almoco_fim || ""} onChange={(e) => updateConfig(dia.value, "almoco_fim", e.target.value || null)} className="h-9" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar Agenda"}
        </Button>
      </div>
    </div>
  );
};
