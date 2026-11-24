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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface CaixasTabProps {
  clinicaId: string;
}

export function CaixasTab({ clinicaId }: CaixasTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [caixas, setCaixas] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCaixa, setEditingCaixa] = useState<any>(null);

  useEffect(() => {
    loadCaixas();
  }, [clinicaId]);

  const loadCaixas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("caixas")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCaixas(data || []);
    } catch (error) {
      console.error("Erro ao carregar caixas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os caixas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (caixa: any) => {
    try {
      const { error } = await supabase
        .from("caixas")
        .upsert({
          ...caixa,
          clinica_id: clinicaId
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Caixa salvo com sucesso"
      });
      
      setModalOpen(false);
      setEditingCaixa(null);
      loadCaixas();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o caixa",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este caixa?")) return;

    try {
      const { error } = await supabase
        .from("caixas")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Caixa excluído com sucesso"
      });
      
      loadCaixas();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o caixa",
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
          <h3 className="text-section text-foreground">Caixas financeiros</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os caixas utilizados na clínica
          </p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCaixa(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo caixa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCaixa ? "Editar Caixa" : "Novo Caixa"}
              </DialogTitle>
            </DialogHeader>
            <CaixaForm
              caixa={editingCaixa}
              onSave={handleSave}
              onCancel={() => {
                setModalOpen(false);
                setEditingCaixa(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Caixas cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Saldo inicial</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {caixas.map((caixa) => (
                <TableRow key={caixa.id}>
                  <TableCell className="font-medium">{caixa.nome}</TableCell>
                  <TableCell className="capitalize">{caixa.tipo}</TableCell>
                  <TableCell>{caixa.descricao}</TableCell>
                  <TableCell className="text-right">
                    R$ {parseFloat(caixa.saldo_inicial).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <SeloAtivo ativo={caixa.ativo} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingCaixa(caixa);
                        setModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(caixa.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {caixas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum caixa cadastrado
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

function CaixaForm({ caixa, onSave, onCancel }: any) {
  const [form, setForm] = useState({
    nome: caixa?.nome || "",
    descricao: caixa?.descricao || "",
    tipo: caixa?.tipo || "geral",
    saldo_inicial: caixa?.saldo_inicial || 0,
    ativo: caixa?.ativo ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(caixa ? { ...caixa, ...form } : form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          placeholder="Ex: Caixa Principal"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tipo">Tipo</Label>
        <Select
          value={form.tipo}
          onValueChange={(value) => setForm({ ...form, tipo: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="geral">Geral</SelectItem>
            <SelectItem value="recepcao">Recepção</SelectItem>
            <SelectItem value="principal">Principal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Input
          id="descricao"
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          placeholder="Descrição do caixa"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="saldo">Saldo inicial</Label>
        <Input
          id="saldo"
          type="number"
          step="0.01"
          value={form.saldo_inicial}
          onChange={(e) => setForm({ ...form, saldo_inicial: parseFloat(e.target.value) || 0 })}
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