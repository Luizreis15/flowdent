import { FaixaIndicadores } from "@/components/sistema/FaixaIndicadores";
import { separarMoeda } from "@/lib/moeda";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, AlertTriangle, Bell, CreditCard, Calendar} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/utils";

interface CalendarItem {
  id: string;
  type: "pagar" | "receber" | "repasse";
  description: string;
  amount: number;
  dueDate: string;
  status: string;
  supplier?: string;
  patient?: string;
  paymentMethod?: string;
}

interface CalendarioFinanceiroProps {
  clinicId: string;
}

export const CalendarioFinanceiro = ({ clinicId }: CalendarioFinanceiroProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pagar" | "receber">("all");

  useEffect(() => {
    loadItems();
  }, [clinicId, currentDate]);

  const loadItems = async () => {
    try {
      setLoading(true);
      
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split("T")[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

      // Load payables
      const { data: payables, error: payablesError } = await supabase
        .from("payable_titles")
        .select(`
          id, description, amount, due_date, status,
          supplier:suppliers(razao_social, nome_fantasia)
        `)
        .eq("clinic_id", clinicId)
        .gte("due_date", startDate)
        .lte("due_date", endDate)
        .neq("status", "cancelled");

      if (payablesError) throw payablesError;

      // Load receivables (including repasse dates)
      const { data: receivables, error: receivablesError } = await supabase
        .from("receivable_titles")
        .select(`
          id, amount, due_date, status, payment_method, data_repasse, valor_liquido,
          patient:patients(full_name)
        `)
        .eq("clinic_id", clinicId)
        .or(`due_date.gte.${startDate},data_repasse.gte.${startDate}`)
        .or(`due_date.lte.${endDate},data_repasse.lte.${endDate}`)
        .neq("status", "cancelled");

      if (receivablesError) throw receivablesError;

      const calendarItems: CalendarItem[] = [
        ...(payables || []).map((p: any) => ({
          id: p.id,
          type: "pagar" as const,
          description: p.description || p.supplier?.nome_fantasia || p.supplier?.razao_social || "Conta a pagar",
          amount: p.amount,
          dueDate: p.due_date,
          status: p.status,
          supplier: p.supplier?.nome_fantasia || p.supplier?.razao_social,
        })),
        ...(receivables || []).map((r: any) => ({
          id: r.id,
          type: "receber" as const,
          description: `Parcela - ${r.patient?.full_name || "Paciente"}`,
          amount: r.amount,
          dueDate: r.due_date,
          status: r.status,
          patient: r.patient?.full_name,
          paymentMethod: r.payment_method,
        })),
        // Add card repasses as separate items
        ...(receivables || [])
          .filter((r: any) => r.data_repasse && r.payment_method?.includes("cartao"))
          .map((r: any) => ({
            id: `repasse-${r.id}`,
            type: "repasse" as const,
            description: `Repasse cartão - ${r.patient?.full_name || ""}`,
            amount: r.valor_liquido || r.amount,
            dueDate: r.data_repasse,
            status: r.status,
            patient: r.patient?.full_name,
            paymentMethod: r.payment_method,
          })),
      ];

      setItems(calendarItems);
    } catch (error) {
      console.error("Erro ao carregar calendário:", error);
      toast.error("Erro ao carregar calendário");
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    const startPadding = firstDay.getDay();
    
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getItemsForDay = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split("T")[0];
    return items
      .filter(item => item.dueDate === dateStr)
      .filter(item => filter === "all" || item.type === filter || (filter === "receber" && item.type === "repasse"));
  };


  const isOverdue = (dateStr: string, status: string) => {
    if (status === "paid" || status === "received") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateStr);
    return dueDate < today;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSoon = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateStr);
    const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const monthName = currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  // Summary calculations
  const filteredItems = filter === "all" ? items : items.filter(i => i.type === filter || (filter === "receber" && i.type === "repasse"));
  const totalPagar = items.filter(i => i.type === "pagar" && i.status !== "paid").reduce((sum, i) => sum + i.amount, 0);
  const totalReceber = items.filter(i => i.type === "receber" && i.status !== "paid").reduce((sum, i) => sum + i.amount, 0);
  const vencidos = items.filter(i => isOverdue(i.dueDate, i.status)).length;
  const repassesHoje = items.filter(i => i.type === "repasse" && isToday(new Date(i.dueDate)));
  
  // Alertas
  const alertasVencidos = items.filter(i => isOverdue(i.dueDate, i.status) && i.status !== "paid");
  const alertasProximos = items.filter(i => isSoon(i.dueDate) && !isOverdue(i.dueDate, i.status) && i.status !== "paid");

  const days = getDaysInMonth();
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-6">
      {/* Alertas Section */}
      {(alertasVencidos.length > 0 || alertasProximos.length > 0 || repassesHoje.length > 0) && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-600" />
              Alertas Financeiros
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {alertasVencidos.length > 0 && (
                <div className="p-3 bg-red-100 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 font-medium text-sm mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    {alertasVencidos.length} título(s) vencido(s)
                  </div>
                  <div className="space-y-1">
                    {alertasVencidos.slice(0, 3).map((item) => (
                      <div key={item.id} className="text-xs text-red-600 flex justify-between">
                        <span className="truncate">{item.description}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    {alertasVencidos.length > 3 && (
                      <div className="text-xs text-red-500">+{alertasVencidos.length - 3} mais</div>
                    )}
                  </div>
                </div>
              )}

              {alertasProximos.length > 0 && (
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700 font-medium text-sm mb-2">
                    <Calendar className="h-4 w-4" />
                    {alertasProximos.length} vencendo em 3 dias
                  </div>
                  <div className="space-y-1">
                    {alertasProximos.slice(0, 3).map((item) => (
                      <div key={item.id} className="text-xs text-yellow-600 flex justify-between">
                        <span className="truncate">{item.description}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    {alertasProximos.length > 3 && (
                      <div className="text-xs text-yellow-500">+{alertasProximos.length - 3} mais</div>
                    )}
                  </div>
                </div>
              )}

              {repassesHoje.length > 0 && (
                <div className="p-3 bg-purple-100 rounded-lg">
                  <div className="flex items-center gap-2 text-purple-700 font-medium text-sm mb-2">
                    <CreditCard className="h-4 w-4" />
                    {repassesHoje.length} repasse(s) hoje
                  </div>
                  <div className="space-y-1">
                    {repassesHoje.map((item) => (
                      <div key={item.id} className="text-xs text-purple-600 flex justify-between">
                        <span className="truncate">{item.patient}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <FaixaIndicadores
        itens={[
          { rotulo: "A pagar no mês", ...separarMoeda(formatCurrency(totalPagar)) },
          { rotulo: "A receber no mês", ...separarMoeda(formatCurrency(totalReceber)) },
          { rotulo: "Títulos vencidos", valor: vencidos, tom: vencidos > 0 ? "alerta" : "padrao" },
        ]}
      />

      {/* Calendar */}
      <Card>
        <CardContent className="p-4 md:p-6">
          {/* Header with filter */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold first-letter:uppercase min-w-[180px] text-center">{monthName}</h2>
              <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pagar">A Pagar</SelectItem>
                <SelectItem value="receber">A Receber</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : (
            <>
              {/* Week days header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="min-h-[80px] md:min-h-[100px]" />;
                  }

                  const dayItems = getItemsForDay(date);
                  const hasOverdue = dayItems.some(item => isOverdue(item.dueDate, item.status));
                  const hasRepasse = dayItems.some(item => item.type === "repasse");
                  
                  return (
                    <div
                      key={date.toISOString()}
                      className={`min-h-[80px] md:min-h-[100px] border rounded-lg p-1 md:p-2 transition-colors ${
                        isToday(date) 
                          ? "bg-primary/10 border-primary ring-2 ring-primary/20" 
                          : hasOverdue 
                            ? "bg-red-50 border-red-200" 
                            : hasRepasse
                              ? "bg-purple-50 border-purple-200"
                              : "bg-card hover:bg-muted/50"
                      }`}
                    >
                      <div className={`text-sm font-medium mb-1 flex items-center justify-between ${isToday(date) ? "text-primary" : ""}`}>
                        <span>{date.getDate()}</span>
                        {hasRepasse && <CreditCard className="h-3 w-3 text-purple-500" />}
                      </div>
                      
                      <div className="space-y-1">
                        <TooltipProvider>
                          {dayItems.slice(0, 3).map((item) => (
                            <Tooltip key={item.id}>
                              <TooltipTrigger asChild>
                                <div
                                  className={`text-xs p-1 rounded truncate cursor-pointer ${
                                    item.type === "repasse"
                                      ? "bg-purple-100 text-purple-700"
                                      : item.type === "pagar"
                                        ? item.status === "paid"
                                          ? "bg-green-100 text-green-800 line-through"
                                          : isOverdue(item.dueDate, item.status)
                                            ? "bg-red-200 text-red-800"
                                            : "bg-red-100 text-red-700"
                                        : item.status === "paid"
                                          ? "bg-green-100 text-green-800 line-through"
                                          : "bg-green-100 text-green-700"
                                  }`}
                                >
                                  {item.type === "pagar" ? "↓" : item.type === "repasse" ? "💳" : "↑"} {formatCurrency(item.amount).replace("R$", "").trim()}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-[220px]">
                                <div className="space-y-1">
                                  <p className="font-medium">{item.description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.type === "pagar" ? item.supplier : item.patient}
                                  </p>
                                  <p className="font-medium">{formatCurrency(item.amount)}</p>
                                  {item.type === "repasse" && (
                                    <Badge className="bg-purple-100 text-purple-700 text-xs">Repasse de Cartão</Badge>
                                  )}
                                  {isOverdue(item.dueDate, item.status) && (
                                    <Badge variant="destructive" className="text-xs">Vencido</Badge>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </TooltipProvider>
                        
                        {dayItems.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{dayItems.length - 3} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-200" />
              <span>A Pagar</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-200" />
              <span>A Receber</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-100 border border-purple-200" />
              <span>Repasse Cartão</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-200 border border-red-300" />
              <span>Vencido</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
