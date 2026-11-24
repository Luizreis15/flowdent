import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export interface ReportFilters {
  startDate: Date;
  endDate: Date;
  dentistId: string | null;
  especialidade: string | null;
  status: string | null;
}

interface Props {
  clinicId: string;
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
}

// Valores gravados em appointments.status; "remarcado" não existe no banco e foi retirado.
const statusOptions = [
  { value: "completed", label: "Finalizado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "no_show", label: "Faltou" },
];

const RelatorioFilters = ({ clinicId, filters, onFiltersChange }: Props) => {
  const [dentistas, setDentistas] = useState<{ id: string; nome: string }[]>([]);
  const [especialidades, setEspecialidades] = useState<string[]>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      const { data: profs } = await supabase
        .from("profissionais")
        .select("id, nome, especialidade")
        .eq("clinica_id", clinicId)
        .eq("ativo", true);

      if (profs) {
        setDentistas(profs.map((p) => ({ id: p.id, nome: p.nome })));
        const esps = [...new Set(profs.map((p) => p.especialidade).filter(Boolean))] as string[];
        setEspecialidades(esps);
      }
    };
    fetchOptions();
  }, [clinicId]);

  const handleClear = () => {
    onFiltersChange({
      ...filters,
      dentistId: null,
      especialidade: null,
      status: null,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
      {/* Start Date */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-[132px] justify-start font-normal tabular-nums">
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            {format(filters.startDate, "dd/MM/yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.startDate}
            onSelect={(d) => d && onFiltersChange({ ...filters, startDate: d })}
            locale={ptBR}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      <span className="text-[13px] text-muted-foreground">até</span>

      {/* End Date */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-[132px] justify-start font-normal tabular-nums">
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            {format(filters.endDate, "dd/MM/yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.endDate}
            onSelect={(d) => d && onFiltersChange({ ...filters, endDate: d })}
            locale={ptBR}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Dentist */}
      <Select
        value={filters.dentistId || "all"}
        onValueChange={(v) => onFiltersChange({ ...filters, dentistId: v === "all" ? null : v })}
      >
        <SelectTrigger className="h-controle-sm w-[160px] text-[13px]">
          <SelectValue placeholder="Dentista" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os dentistas</SelectItem>
          {dentistas.map((d) => (
            <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Specialty */}
      <Select
        value={filters.especialidade || "all"}
        onValueChange={(v) => onFiltersChange({ ...filters, especialidade: v === "all" ? null : v })}
      >
        <SelectTrigger className="h-controle-sm w-[200px] text-[13px]">
          <SelectValue placeholder="Especialidade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as especialidades</SelectItem>
          {especialidades.map((e) => (
            <SelectItem key={e} value={e}>{e}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status */}
      <Select
        value={filters.status || "all"}
        onValueChange={(v) => onFiltersChange({ ...filters, status: v === "all" ? null : v })}
      >
        <SelectTrigger className="h-controle-sm w-[140px] text-[13px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          {statusOptions.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(filters.dentistId || filters.especialidade || filters.status) && (
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="h-3.5 w-3.5 mr-1" /> Limpar
        </Button>
      )}
    </div>
  );
};

export default RelatorioFilters;
