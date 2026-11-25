import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SeloAtivo } from "@/components/sistema/Selo";
import { EsqueletoSecao } from "@/components/sistema/EsqueletoSecao";

interface CadeirasTabProps {
  clinicaId: string;
}

export function CadeirasTab({ clinicaId }: CadeirasTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cadeiras, setCadeiras] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCadeira, setEditingCadeira] = useState<any>(null);

  useEffect(() => {
    loadCadeiras();
  }, [clinicaId]);

  const loadCadeiras = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cadeiras")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCadeiras(data || []);
    } catch (error) {
      console.error("Erro ao carregar cadeiras:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as cadeiras",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (cadeira: any) => {
    try {
      const { error } = await supabase
        .from("cadeiras")
        .upsert({
          ...cadeira,
          clinica_id: clinicaId
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cadeira salva com sucesso"
      });
      
      setModalOpen(false);
      setEditingCadeira(null);
      loadCadeiras();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a cadeira",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta cadeira?")) return;

    try {
      const { error } = await supabase
        .from("cadeiras")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cadeira excluída com sucesso"
      });
      
      loadCadeiras();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a cadeira",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <EsqueletoSecao />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-section text-foreground">Cadeiras clínicas</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie as cadeiras utilizadas nos atendimentos
          </p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCadeira(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova cadeira
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCadeira ? "Editar Cadeira" : "Nova Cadeira"}
              </DialogTitle>
            </DialogHeader>
            <CadeiraForm
              cadeira={editingCadeira}
              onSave={handleSave}
              onCancel={() => {
                setModalOpen(false);
                setEditingCadeira(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cadeiras cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cadeiras.map((cadeira) => (
                <TableRow key={cadeira.id}>
                  <TableCell className="font-medium">{cadeira.nome}</TableCell>
                  <TableCell>{cadeira.localizacao}</TableCell>
                  <TableCell className="text-center">
                    <SeloAtivo ativo={cadeira.ativo} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingCadeira(cadeira);
                        setModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(cadeira.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {cadeiras.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma cadeira cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CadeiraForm({ cadeira, onSave, onCancel }: any) {
  const [form, setForm] = useState({
    nome: cadeira?.nome || "",
    localizacao: cadeira?.localizacao || "",
    ativo: cadeira?.ativo ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(cadeira ? { ...cadeira, ...form } : form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          placeholder="Ex: Cadeira 1"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="localizacao">Localização</Label>
        <Input
          id="localizacao"
          value={form.localizacao}
          onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
          placeholder="Ex: Sala 1, andar térreo"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="ativo"
          checked={form.ativo}
          onCheckedChange={(checked) => setForm({ ...form, ativo: checked })}
        />
        <Label htmlFor="ativo">Ativo</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  );
}