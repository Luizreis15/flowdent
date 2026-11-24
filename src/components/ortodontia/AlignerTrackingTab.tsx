import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, CheckCircle2, Clock, AlertCircle, Package } from "lucide-react";
import { format, parseISO, addDays, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface AlignerTrackingTabProps {
  casoId: string;
}

export function AlignerTrackingTab({ casoId }: AlignerTrackingTabProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [totalAlinhadores, setTotalAlinhadores] = useState("");
  const [diasUso, setDiasUso] = useState("14");
  const [refinamento, setRefinamento] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: aligners, refetch } = useQuery({
    queryKey: ["ortho-aligners", casoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ortho_aligner_tracking")
        .select("*")
        .eq("case_id", casoId)
        .order("numero_alinhador", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const getStatus = (aligner: any) => {
    if (aligner.data_troca_real) return "trocado";
    if (!aligner.data_entrega) return "pendente";
    if (aligner.data_troca_prevista && isPast(parseISO(aligner.data_troca_prevista)) && !isToday(parseISO(aligner.data_troca_prevista))) return "atrasado";
    return "em_uso";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "trocado":
        return <Badge variant="secondary" className="gap-1"><CheckCircle2 className="w-3 h-3" />Trocado</Badge>;
      case "em_uso":
        return <Badge variant="default" className="gap-1"><Clock className="w-3 h-3" />Em Uso</Badge>;
      case "atrasado":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Atrasado</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Package className="w-3 h-3" />Pendente</Badge>;
    }
  };

  const handleGenerateSet = async () => {
    const total = parseInt(totalAlinhadores);
    if (!total || total < 1) {
      toast.error("Informe a quantidade de alinhadores");
      return;
    }

    setLoading(true);
    try {
      const existingMax = aligners?.reduce((max, a) => Math.max(max, a.numero_alinhador), 0) || 0;
      const rows = Array.from({ length: total }, (_, i) => ({
        case_id: casoId,
        numero_alinhador: existingMax + i + 1,
        total_alinhadores: existingMax + total,
        dias_uso: parseInt(diasUso) || 14,
        refinamento,
        observacoes: observacoes || null,
      }));

      const { error } = await supabase.from("ortho_aligner_tracking").insert(rows);
      if (error) throw error;

      // Update total on existing aligners
      if (existingMax > 0) {
        await supabase
          .from("ortho_aligner_tracking")
          .update({ total_alinhadores: existingMax + total })
          .eq("case_id", casoId);
      }

      toast.success(`${total} alinhadores adicionados!`);
      setAddModalOpen(false);
      setTotalAlinhadores("");
      setObservacoes("");
      setRefinamento(false);
      refetch();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEntrega = async (alignerId: string) => {
    const today = new Date().toISOString().split("T")[0];
    const aligner = aligners?.find((a) => a.id === alignerId);
    const diasUsoVal = aligner?.dias_uso || 14;
    const trocaPrevista = format(addDays(new Date(), diasUsoVal), "yyyy-MM-dd");

    const { error } = await supabase
      .from("ortho_aligner_tracking")
      .update({ data_entrega: today, data_troca_prevista: trocaPrevista })
      .eq("id", alignerId);

    if (error) {
      toast.error("Erro ao registrar entrega");
    } else {
      toast.success("Entrega registrada");
      refetch();
    }
  };

  const handleTroca = async (alignerId: string) => {
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("ortho_aligner_tracking")
      .update({ data_troca_real: today })
      .eq("id", alignerId);

    if (error) {
      toast.error("Erro ao registrar troca");
    } else {
      toast.success("Troca registrada");
      refetch();
    }
  };

  const totalCount = aligners?.length || 0;
  const trocados = aligners?.filter((a) => a.data_troca_real).length || 0;
  const atrasados = aligners?.filter((a) => getStatus(a) === "atrasado").length || 0;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{trocados}/{totalCount}</p>
            <p className="text-xs text-muted-foreground">Trocados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{totalCount > 0 ? Math.round((trocados / totalCount) * 100) : 0}%</p>
            <p className="text-xs text-muted-foreground">Progresso</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className={`text-2xl font-bold ${atrasados > 0 ? "text-destructive" : ""}`}>{atrasados}</p>
            <p className="text-xs text-muted-foreground">Atrasados</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-[width] duration-300"
            style={{ width: `${(trocados / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Alinhadores
        </Button>
      </div>

      {/* Table */}
      {totalCount === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Package className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum alinhador cadastrado</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Adicione um set de alinhadores para começar o acompanhamento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Troca Prev.</TableHead>
                <TableHead>Troca Real</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aligners?.map((aligner) => {
                const status = getStatus(aligner);
                return (
                  <TableRow key={aligner.id} className={status === "atrasado" ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium">
                      {aligner.numero_alinhador}
                      {aligner.refinamento && (
                        <span className="text-xs text-muted-foreground ml-1">(R)</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(status)}</TableCell>
                    <TableCell className="text-sm">
                      {aligner.data_entrega
                        ? format(parseISO(aligner.data_entrega), "dd/MM/yy", { locale: ptBR })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {aligner.data_troca_prevista
                        ? format(parseISO(aligner.data_troca_prevista), "dd/MM/yy", { locale: ptBR })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {aligner.data_troca_real
                        ? format(parseISO(aligner.data_troca_real), "dd/MM/yy", { locale: ptBR })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {status === "pendente" && (
                        <Button size="sm" variant="outline" onClick={() => handleEntrega(aligner.id)}>
                          Entregar
                        </Button>
                      )}
                      {(status === "em_uso" || status === "atrasado") && (
                        <Button size="sm" variant="outline" onClick={() => handleTroca(aligner.id)}>
                          Trocar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add aligners modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Alinhadores</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quantidade de Alinhadores *</Label>
              <Input
                type="number"
                min="1"
                value={totalAlinhadores}
                onChange={(e) => setTotalAlinhadores(e.target.value)}
                placeholder="Ex: 22"
              />
            </div>
            <div className="space-y-2">
              <Label>Dias de Uso por Alinhador</Label>
              <Input
                type="number"
                min="1"
                value={diasUso}
                onChange={(e) => setDiasUso(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Refinamento?</Label>
              <Switch checked={refinamento} onCheckedChange={setRefinamento} />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleGenerateSet} disabled={loading}>
                {loading ? "Gerando..." : "Gerar Set"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
