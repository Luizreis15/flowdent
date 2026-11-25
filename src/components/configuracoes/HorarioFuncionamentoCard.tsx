import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Info } from "lucide-react";

export interface DiaConfig {
  ativo: boolean;
  inicio: string;
  fim: string;
  almoco_inicio: string | null;
  almoco_fim: string | null;
}

export interface HorarioFuncionamento {
  intervalo_padrao: number;
  dias: {
    segunda: DiaConfig;
    terca: DiaConfig;
    quarta: DiaConfig;
    quinta: DiaConfig;
    sexta: DiaConfig;
    sabado: DiaConfig;
    domingo: DiaConfig;
  };
}

const DEFAULT_HORARIO: HorarioFuncionamento = {
  intervalo_padrao: 30,
  dias: {
    segunda: { ativo: true, inicio: "08:00", fim: "18:00", almoco_inicio: "12:00", almoco_fim: "14:00" },
    terca: { ativo: true, inicio: "08:00", fim: "18:00", almoco_inicio: "12:00", almoco_fim: "14:00" },
    quarta: { ativo: true, inicio: "08:00", fim: "18:00", almoco_inicio: "12:00", almoco_fim: "14:00" },
    quinta: { ativo: true, inicio: "08:00", fim: "18:00", almoco_inicio: "12:00", almoco_fim: "14:00" },
    sexta: { ativo: true, inicio: "08:00", fim: "18:00", almoco_inicio: "12:00", almoco_fim: "14:00" },
    sabado: { ativo: false, inicio: "08:00", fim: "12:00", almoco_inicio: null, almoco_fim: null },
    domingo: { ativo: false, inicio: "08:00", fim: "12:00", almoco_inicio: null, almoco_fim: null },
  }
};

const DIAS_SEMANA = [
  { key: "segunda", label: "Segunda-feira" },
  { key: "terca", label: "Terça-feira" },
  { key: "quarta", label: "Quarta-feira" },
  { key: "quinta", label: "Quinta-feira" },
  { key: "sexta", label: "Sexta-feira" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
] as const;

const HORARIOS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"
];

const INTERVALOS = [
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 45, label: "45 minutos" },
  { value: 60, label: "1 hora" },
];

interface HorarioFuncionamentoCardProps {
  value: HorarioFuncionamento | null;
  onChange: (value: HorarioFuncionamento) => void;
}

export function HorarioFuncionamentoCard({ value, onChange }: HorarioFuncionamentoCardProps) {
  // Ensure we always have a valid structure - merge with defaults for safety
  const horario: HorarioFuncionamento = {
    intervalo_padrao: value?.intervalo_padrao ?? DEFAULT_HORARIO.intervalo_padrao,
    dias: {
      segunda: value?.dias?.segunda ?? DEFAULT_HORARIO.dias.segunda,
      terca: value?.dias?.terca ?? DEFAULT_HORARIO.dias.terca,
      quarta: value?.dias?.quarta ?? DEFAULT_HORARIO.dias.quarta,
      quinta: value?.dias?.quinta ?? DEFAULT_HORARIO.dias.quinta,
      sexta: value?.dias?.sexta ?? DEFAULT_HORARIO.dias.sexta,
      sabado: value?.dias?.sabado ?? DEFAULT_HORARIO.dias.sabado,
      domingo: value?.dias?.domingo ?? DEFAULT_HORARIO.dias.domingo,
    }
  };

  const updateDia = (diaKey: keyof typeof horario.dias, updates: Partial<DiaConfig>) => {
    onChange({
      ...horario,
      dias: {
        ...horario.dias,
        [diaKey]: {
          ...horario.dias[diaKey],
          ...updates
        }
      }
    });
  };

  const updateIntervalo = (intervalo: number) => {
    onChange({
      ...horario,
      intervalo_padrao: intervalo
    });
  };

  const toggleAlmoco = (diaKey: keyof typeof horario.dias, hasAlmoco: boolean) => {
    if (hasAlmoco) {
      updateDia(diaKey, { 
        almoco_inicio: "12:00", 
        almoco_fim: "14:00" 
      });
    } else {
      updateDia(diaKey, { 
        almoco_inicio: null, 
        almoco_fim: null 
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horário de funcionamento
        </CardTitle>
        <CardDescription>
          Configure os dias e horários de atendimento da clínica. Essas configurações serão utilizadas na agenda.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Intervalo padrão */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex-1">
            <Label className="text-base font-medium">Intervalo padrão por consulta</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Define o tempo padrão de cada slot na agenda. A recepção pode ajustar ao agendar.
            </p>
          </div>
          <Select 
            value={String(horario.intervalo_padrao)} 
            onValueChange={(v) => updateIntervalo(Number(v))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVALOS.map(({ value, label }) => (
                <SelectItem key={value} value={String(value)}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela de dias */}
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[180px_80px_1fr_1fr] gap-2 p-3 bg-muted/50 text-sm font-medium border-b">
            <div>Dia</div>
            <div className="text-center">Ativo</div>
            <div>Horário</div>
            <div>Horário de almoço</div>
          </div>

          {DIAS_SEMANA.map(({ key, label }) => {
            const diaConfig = horario.dias[key];
            const hasAlmoco = diaConfig.almoco_inicio !== null;
            
            return (
              <div 
                key={key}
                className="grid grid-cols-[180px_80px_1fr_1fr] gap-2 p-3 items-center border-b last:border-b-0"
              >
                <div className="font-medium">{label}</div>
                
                <div className="flex justify-center">
                  <Switch
                    checked={diaConfig.ativo}
                    onCheckedChange={(checked) => updateDia(key, { ativo: checked })}
                  />
                </div>
                
                {diaConfig.ativo ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Select 
                        value={diaConfig.inicio} 
                        onValueChange={(v) => updateDia(key, { inicio: v })}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HORARIOS.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground">até</span>
                      <Select 
                        value={diaConfig.fim} 
                        onValueChange={(v) => updateDia(key, { fim: v })}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HORARIOS.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`almoco-${key}`}
                        checked={hasAlmoco}
                        onCheckedChange={(checked) => toggleAlmoco(key, !!checked)}
                      />
                      {hasAlmoco ? (
                        <div className="flex items-center gap-2">
                          <Select 
                            value={diaConfig.almoco_inicio || "12:00"} 
                            onValueChange={(v) => updateDia(key, { almoco_inicio: v })}
                          >
                            <SelectTrigger className="w-[90px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {HORARIOS.map((h) => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-muted-foreground text-sm">até</span>
                          <Select 
                            value={diaConfig.almoco_fim || "14:00"} 
                            onValueChange={(v) => updateDia(key, { almoco_fim: v })}
                          >
                            <SelectTrigger className="w-[90px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {HORARIOS.map((h) => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <Label htmlFor={`almoco-${key}`} className="text-sm text-muted-foreground cursor-pointer">
                          Sem intervalo
                        </Label>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-muted-foreground text-sm">Fechado</div>
                    <div className="text-muted-foreground text-sm">—</div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-2 text-sm text-muted-foreground bg-primary/5 p-3 rounded-lg">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Os dias ativos aparecerão na visualização semanal da agenda. O horário de almoço aparecerá bloqueado nos slots.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export { DEFAULT_HORARIO };
