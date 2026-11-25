import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import EditarProcedimentoModal from "./EditarProcedimentoModal";
import AdicionarProcedimentoPlanoModal from "./AdicionarProcedimentoPlanoModal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";

interface Plano {
  id: string;
  nome: string;
  clinica_id: string;
}

interface ProcedimentoItem {
  id: string;
  procedimento_id: string;
  valor_customizado: number;
  procedimento: {
    codigo_sistema: string;
    descricao: string;
    especialidade: string;
    valor: number;
  };
}

interface GerenciarProcedimentosPlanoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plano: Plano | null;
  onSuccess: () => void;
}

export default function GerenciarProcedimentosPlanoModal({ 
  open, 
  onOpenChange, 
  plano, 
  onSuccess 
}: GerenciarProcedimentosPlanoModalProps) {
  const [procedimentos, setProcedimentos] = useState<ProcedimentoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [especialidadeFilter, setEspecialidadeFilter] = useState("todas");
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<ProcedimentoItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (open && plano) {
      loadProcedimentos();
    }
  }, [open, plano]);

  const loadProcedimentos = async () => {
    if (!plano) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("planos_procedimentos_itens")
        .select(`
          id,
          procedimento_id,
          valor_customizado,
          procedimento:procedimentos (
            codigo_sistema,
            descricao,
            especialidade,
            valor
          )
        `)
        .eq("plano_id", plano.id)
        .order("valor_customizado", { ascending: false });

      if (error) throw error;

      const items = (data || []).map(item => ({
        ...item,
        procedimento: item.procedimento as unknown as ProcedimentoItem['procedimento']
      }));

      setProcedimentos(items);

      // Extrair especialidades únicas
      const esp = [...new Set(items.map(p => p.procedimento.especialidade))].sort();
      setEspecialidades(esp);
    } catch (error) {
      console.error("Erro ao carregar procedimentos:", error);
      toast.error("Erro ao carregar procedimentos");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("planos_procedimentos_itens")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("Procedimento removido do plano");
      loadProcedimentos();
      onSuccess();
    } catch (error) {
      console.error("Erro ao remover procedimento:", error);
      toast.error("Erro ao remover procedimento");
    } finally {
      setDeleteId(null);
    }
  };

  const filteredProcedimentos = procedimentos.filter(p => {
    const matchSearch = 
      p.procedimento.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.procedimento.codigo_sistema.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEspecialidade = 
      especialidadeFilter === "todas" || 
      p.procedimento.especialidade === especialidadeFilter;
    return matchSearch && matchEspecialidade;
  });


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Procedimentos do Plano "{plano?.nome}"</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={especialidadeFilter} onValueChange={setEspecialidadeFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Especialidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas especialidades</SelectItem>
                  {especialidades.map(esp => (
                    <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            <ScrollArea className="h-[400px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Código</TableHead>
                    <TableHead>Procedimento</TableHead>
                    <TableHead className="w-32">Especialidade</TableHead>
                    <TableHead className="w-28 text-right">Valor base</TableHead>
                    <TableHead className="w-28 text-right">Valor plano</TableHead>
                    <TableHead className="w-20 text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredProcedimentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {searchTerm || especialidadeFilter !== "todas" 
                          ? "Nenhum procedimento encontrado com os filtros aplicados"
                          : "Nenhum procedimento cadastrado neste plano"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProcedimentos.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">
                          {item.procedimento.codigo_sistema}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={item.procedimento.descricao}>
                          {item.procedimento.descricao}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.procedimento.especialidade}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(item.procedimento.valor)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.valor_customizado)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditItem(item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="text-sm text-muted-foreground">
              {filteredProcedimentos.length} de {procedimentos.length} procedimentos
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover procedimento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este procedimento do plano? 
              O procedimento continuará disponível na tabela base.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditarProcedimentoModal
        open={!!editItem}
        onOpenChange={() => setEditItem(null)}
        item={editItem}
        onSuccess={() => {
          loadProcedimentos();
          onSuccess();
        }}
      />

      {plano && (
        <AdicionarProcedimentoPlanoModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          planoId={plano.id}
          existingProcedimentoIds={procedimentos.map(p => p.procedimento_id)}
          onSuccess={() => {
            loadProcedimentos();
            onSuccess();
          }}
        />
      )}
    </>
  );
}
