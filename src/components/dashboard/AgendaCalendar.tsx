import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startOfWeek, endOfWeek, addWeeks, format, addDays, startOfDay, endOfDay, isSameDay, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AgendaCalendarProps {
  clinicId: string;
}

export const AgendaCalendar = ({ clinicId }: AgendaCalendarProps) => {
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  
  const weekDays = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
  const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["week-appointments", clinicId, weekStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          title,
          status,
          patient_id!inner(
            id,
            full_name,
            clinic_id
          )
        `)
        .eq("patient_id.clinic_id", clinicId)
        .gte("appointment_date", startOfDay(weekStart).toISOString())
        .lte("appointment_date", endOfDay(addDays(weekStart, 4)).toISOString());
      
      if (error) throw error;
      return data || [];
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-primary/90 hover:bg-primary border-primary/20";
      case "confirmed": return "bg-emerald-600/90 hover:bg-emerald-600 border-emerald-500/20";
      case "waiting": return "bg-yellow-500/90 hover:bg-yellow-500 border-yellow-400/20";
      case "completed": return "bg-accent/90 hover:bg-accent border-accent/20";
      case "paid": return "bg-green-600/90 hover:bg-green-600 border-green-500/20";
      case "cancelled": return "bg-destructive/90 hover:bg-destructive border-destructive/20";
      case "no_show": return "bg-amber-500/90 hover:bg-amber-500 border-amber-400/20";
      default: return "bg-muted";
    }
  };

  // Helper to check if a specific time slot has passed
  const isPastSlot = (date: Date, hour: string) => {
    const today = new Date();
    if (isBefore(startOfDay(date), startOfDay(today))) return true;
    
    if (isSameDay(date, today)) {
      const [hourNum] = hour.split(":").map(Number);
      if (hourNum <= today.getHours()) return true;
    }
    
    return false;
  };

  const getAppointmentForSlot = (dayIndex: number, hour: string) => {
    if (!appointments) return null;
    
    const targetDate = addDays(weekStart, dayIndex);
    const [hourNum] = hour.split(":").map(Number);
    
    return appointments.find(apt => {
      const aptDate = new Date(apt.appointment_date);
      return (
        aptDate.getDate() === targetDate.getDate() &&
        aptDate.getMonth() === targetDate.getMonth() &&
        aptDate.getFullYear() === targetDate.getFullYear() &&
        aptDate.getHours() === hourNum
      );
    });
  };

  // Navigate to agenda page with date and time pre-selected
  const handleSlotClick = (dayIndex: number, hour: string) => {
    const targetDate = addDays(weekStart, dayIndex);
    
    // Block clicking on past slots
    if (isPastSlot(targetDate, hour)) {
      return;
    }
    
    const dateStr = format(targetDate, "yyyy-MM-dd");
    navigate(`/dashboard/agenda?date=${dateStr}&time=${hour}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-base font-semibold">Agenda da Semana</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Skeleton className="h-[500px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base font-semibold">Agenda da Semana</CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-sm hidden sm:inline-flex"
              onClick={() => setCurrentWeek(new Date())}
            >
              Hoje
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="overflow-x-auto -mx-2 px-2">
          <div className="min-w-[700px]">
            {/* Header com dias da semana */}
            <div className="grid grid-cols-[60px_repeat(5,1fr)] gap-2 mb-3">
              <div></div>
              {weekDays.map((day, index) => {
                const date = addDays(weekStart, index);
                return (
                  <div key={index} className="text-center py-1">
                    <div className="text-sm font-semibold">{day}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(date, "dd/MM")}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grid de horários */}
            <div className="space-y-1">
              {hours.map((hour) => (
                <div key={hour} className="grid grid-cols-[60px_repeat(5,1fr)] gap-2">
                  <div className="text-sm text-muted-foreground flex items-center justify-end pr-2">
                    {hour}
                  </div>
                  {weekDays.map((_, dayIndex) => {
                    const apt = getAppointmentForSlot(dayIndex, hour);
                    const targetDate = addDays(weekStart, dayIndex);
                    const slotPassed = isPastSlot(targetDate, hour);
                    
                    return (
                      <div
                        key={dayIndex}
                        className={cn(
                          "min-h-[48px] rounded border transition-colors",
                          apt 
                            ? "border-transparent" 
                            : slotPassed
                              ? "border-muted-foreground/10 bg-muted/30 cursor-not-allowed"
                              : "border-muted-foreground/10 hover:border-sinal-ok hover:bg-sinal-ok-tenue cursor-pointer group bg-muted/20"
                        )}
                        onClick={() => !apt && !slotPassed && handleSlotClick(dayIndex, hour)}
                      >
                        {apt ? (
                          <div
                            className={`h-full p-2 rounded ${getStatusColor(
                              apt.status || "scheduled"
                            )} text-white transition-colors cursor-pointer`}
                          >
                            <div className="text-sm font-semibold truncate">
                              {apt.patient_id && typeof apt.patient_id === 'object' && 'full_name' in apt.patient_id
                                ? apt.patient_id.full_name
                                : "Paciente"}
                            </div>
                            <div className="text-xs opacity-90 truncate">
                              {apt.title}
                            </div>
                          </div>
                        ) : slotPassed ? (
                          null
                        ) : (
                          <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="h-4 w-4 text-sinal-ok" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legenda */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-600"></div>
            <span className="text-sm text-muted-foreground">Confirmado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary"></div>
            <span className="text-sm text-muted-foreground">Agendado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500"></div>
            <span className="text-sm text-muted-foreground">Faltou</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-accent"></div>
            <span className="text-sm text-muted-foreground">Concluído</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 border-sinal-ok bg-sinal-ok-tenue"></div>
            <span className="text-sm text-muted-foreground">Clique para agendar</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
