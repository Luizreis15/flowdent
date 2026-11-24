import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Calendar, Copy, RotateCcw } from "lucide-react";
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

interface AgendaProfissionalModalProps {
  open: boolean;
  onClose: () => void;
  profissional: {
    id: string;
    nome: string;
  } | null;
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

export const AgendaProfissionalModal = ({
  open,
  onClose,
  profissional,
}: AgendaProfissionalModalProps) => {
  const [configs, setConfigs] = useState<AgendaConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && profissional) {
      loadConfigs();
    }
  }, [open, profissional]);

  const loadConfigs = async () => {
    if (!profissional) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profissional_agenda_config")
        .select("*")
        .eq("profissional_id", profissional.id);

      if (error) throw error;

      // Inicializar com configurações existentes ou padrões
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
        // Padrão: seg-sex ativo com almoço, sáb meio período sem almoço, dom inativo
        if (dia.value === 6) {
          // Sábado: meio período sem almoço
          return {
            dia_semana: dia.value,
            ativo: true,
            hora_inicio: "09:00",
            hora_fim: "13:00",
            almoco_inicio: null,
            almoco_fim: null,
            duracao_consulta_minutos: 30,
          };
        }
        return {
          ...DEFAULT_CONFIG,
          dia_semana: dia.value,
          ativo: dia.value >= 1 && dia.value <= 5,
        };
      });

      setConfigs(initialConfigs);
    } catch (error: any) {
      toast.error("Erro ao carregar configurações: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (dia: number, field: keyof AgendaConfig, value: any) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.dia_semana === dia ? { ...c, [field]: value } : c
      )
    );
  };

  const copyToAll = (dia: number) => {
    const source = configs.find((c) => c.dia_semana === dia);
    if (!source) return;

    setConfigs((prev) =>
      prev.map((c) => ({
        ...c,
        ativo: source.ativo,
        hora_inicio: source.hora_inicio,
        hora_fim: source.hora_fim,
        almoco_inicio: source.almoco_inicio,
        almoco_fim: source.almoco_fim,
        duracao_consulta_minutos: source.duracao_consulta_minutos,
      }))
    );
    toast.success("Configuração copiada para todos os dias");
  };

  const applyToWeekdays = () => {
    const monday = configs.find((c) => c.dia_semana === 1);
    if (!monday) return;

    setConfigs((prev) =>
      prev.map((c) => {
        if (c.dia_semana >= 1 && c.dia_semana <= 5) {
          return {
            ...c,
            ativo: monday.ativo,
            hora_inicio: monday.hora_inicio,
            hora_fim: monday.hora_fim,
            almoco_inicio: monday.almoco_inicio,
            almoco_fim: monday.almoco_fim,
            duracao_consulta_minutos: monday.duracao_consulta_minutos,
          };
        }
        return c;
      })
    );
    toast.success("Configuração aplicada aos dias úteis (seg-sex)");
  };

  const resetDefaults = () => {
    setConfigs(
      diasSemana.map((dia) => {
        // Sábado: meio período sem almoço
        if (dia.value === 6) {
          return {
            dia_semana: dia.value,
            ativo: true,
            hora_inicio: "09:00",
            hora_fim: "13:00",
            almoco_inicio: null,
            almoco_fim: null,
            duracao_consulta_minutos: 30,
          };
        }
        return {
          ...DEFAULT_CONFIG,
          dia_semana: dia.value,
          ativo: dia.value >= 1 && dia.value <= 5,
        };
      })
    );
    toast.success("Configurações resetadas para o padrão");
  };

  const validateConfigs = (): string[] => {
    const errors: string[] = [];

    configs.forEach((config) => {
      if (!config.ativo) return;

      const dia = diasSemana.find((d) => d.value === config.dia_semana)?.label;

      // Validar duração
      if (
        config.duracao_consulta_minutos <= 0 ||
        config.duracao_consulta_minutos % 5 !== 0
      ) {
        errors.push(
          `${dia}: Duração deve ser positiva e múltipla de 5 minutos`
        );
      }

      // Validar horários
      if (config.hora_inicio >= config.hora_fim) {
        errors.push(`${dia}: Horário de início deve ser antes do fim`);
      }

      // Validar almoço
      if (
        config.almoco_inicio &&
        config.almoco_fim &&
        config.almoco_inicio >= config.almoco_fim
      ) {
        errors.push(`${dia}: Horário de almoço inválido`);
      }

      if (
        config.almoco_inicio &&
        config.almoco_fim &&
        (config.almoco_inicio <= config.hora_inicio ||
          config.almoco_fim >= config.hora_fim)
      ) {
        errors.push(`${dia}: Almoço deve estar dentro do horário de trabalho`);
      }
    });

    return errors;
  };

  const handleSave = async () => {
    if (!profissional) return;

    const errors = validateConfigs();
    if (errors.length > 0) {
      toast.error(errors.join("\n"));
      return;
    }

    try {
      setSaving(true);

      // Deletar configurações antigas
      const { error: deleteError } = await supabase
        .from("profissional_agenda_config")
        .delete()
        .eq("profissional_id", profissional.id);

      if (deleteError) throw deleteError;

      // Inserir novas configurações
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

      const { error: insertError } = await supabase
        .from("profissional_agenda_config")
        .insert(configsToInsert);

      if (insertError) throw insertError;

      // Registrar auditoria
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from("profissional_agenda_audit").insert({
          profissional_id: profissional.id,
          changed_by: userData.user.id,
          action: "update_agenda",
          changes: { configs: configsToInsert },
        });
      }

      toast.success("Agenda configurada com sucesso");
      onClose();
    } catch (error: any) {
      toast.error("Erro ao salvar configurações: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!profissional) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Configurar Agenda - {profissional.nome}
          </DialogTitle>
          <DialogDescription>
            Configure os dias e horários de atendimento do profissional
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={applyToWeekdays}
            disabled={loading}
          >
            <Copy className="h-4 w-4 mr-2" />
            Aplicar a dias úteis
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetDefaults}
            disabled={loading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar padrão
          </Button>
        </div>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {diasSemana.map((dia) => {
              const config = configs.find((c) => c.dia_semana === dia.value);
              if (!config) return null;

              return (
                <div key={dia.value} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{dia.label}</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={config.ativo}
                          onCheckedChange={(checked) =>
                            updateConfig(dia.value, "ativo", checked)
                          }
                        />
                        <Label>Atende</Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToAll(dia.value)}
                        disabled={!config.ativo}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {config.ativo && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Hora Início</Label>
                        <Input
                          type="time"
                          value={config.hora_inicio}
                          onChange={(e) =>
                            updateConfig(dia.value, "hora_inicio", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Hora Fim</Label>
                        <Input
                          type="time"
                          value={config.hora_fim}
                          onChange={(e) =>
                            updateConfig(dia.value, "hora_fim", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Duração Consulta (min)</Label>
                        <Input
                          type="number"
                          step="5"
                          min="5"
                          value={config.duracao_consulta_minutos}
                          onChange={(e) =>
                            updateConfig(
                              dia.value,
                              "duracao_consulta_minutos",
                              parseInt(e.target.value) || 30
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Almoço Início</Label>
                        <Input
                          type="time"
                          value={config.almoco_inicio || ""}
                          onChange={(e) =>
                            updateConfig(
                              dia.value,
                              "almoco_inicio",
                              e.target.value || null
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Almoço Fim</Label>
                        <Input
                          type="time"
                          value={config.almoco_fim || ""}
                          onChange={(e) =>
                            updateConfig(
                              dia.value,
                              "almoco_fim",
                              e.target.value || null
                            )
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? "Salvando..." : "Salvar Agenda"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
