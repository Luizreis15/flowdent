import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface SidebarFiltersProps {
  clinicId: string;
}

export const SidebarFilters = ({ clinicId }: SidebarFiltersProps) => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const navigate = useNavigate();

  const { data: professionals, isLoading } = useQuery({
    queryKey: ["professionals", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissionais")
        .select("id, nome, especialidade")
        .eq("clinica_id", clinicId)
        .eq("ativo", true)
        .order("nome");
      
      if (error) throw error;
      return data || [];
    },
  });

  const consultTypes = [
    { label: "Primeira Consulta", checked: true },
    { label: "Retorno", checked: true },
    { label: "Cirurgia", checked: false },
    { label: "Limpeza", checked: true },
  ];

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-3 w-full">
      {/* Calendário */}
      <Card className="w-full">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm font-medium">Calendário</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border-0 w-full [&_.rdp-months]:w-full [&_.rdp-month]:w-full [&_.rdp-table]:w-full"
          />
        </CardContent>
      </Card>

      {/* Filtro de Profissionais */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm font-medium">Profissionais</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : professionals && professionals.length > 0 ? (
            <div className="space-y-2">
              {professionals.map((prof) => (
                <div
                  key={prof.id}
                  className="flex items-center gap-2 p-2 rounded text-sm cursor-pointer transition-colors hover:bg-muted"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {getInitials(prof.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">{prof.nome}</span>
                    {prof.especialidade && (
                      <span className="text-xs text-muted-foreground truncate block">
                        {prof.especialidade}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhum profissional cadastrado
            </p>
          )}
        </CardContent>
      </Card>

      {/* Filtro Tipo */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm font-medium">Tipo</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="space-y-2">
            {consultTypes.map((type, index) => (
              <div key={index} className="flex items-center gap-2">
                <Checkbox id={`type-${index}`} defaultChecked={type.checked} />
                <label htmlFor={`type-${index}`} className="text-sm cursor-pointer">
                  {type.label}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Botão */}
      <Button 
        size="default" 
        onClick={() => navigate("/dashboard/agenda")}
        className="w-full font-semibold bg-primary hover:bg-acento-600"
      >
        <Plus className="h-4 w-4 mr-2" />
        Novo Agendamento
      </Button>
    </div>
  );
};