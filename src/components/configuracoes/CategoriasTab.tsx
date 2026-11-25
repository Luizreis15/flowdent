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

interface CategoriasTabProps {
  clinicaId: string;
}

export function CategoriasTab({ clinicaId }: CategoriasTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<any>(null);

  useEffect(() => {
    loadCategorias();
  }, [clinicaId]);

  const loadCategorias = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("categorias_procedimentos")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("ordem", { ascending: true });

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as categorias",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (categoria: any) => {
    try {
      const { error } = await supabase
        .from("categorias_procedimentos")
        .upsert({
          ...categoria,
          clinica_id: clinicaId
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Categoria salva com sucesso"
      });
      
      setModalOpen(false);
      setEditingCategoria(null);
      loadCategorias();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a categoria",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta categoria?")) return;

    try {
      const { error } = await supabase
        .from("categorias_procedimentos")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Categoria excluída com sucesso"
      });
      
      loadCategorias();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a categoria",
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
          <h3 className="text-section text-foreground">Categorias de procedimentos</h3>
          <p className="text-sm text-muted-foreground">
            Organize procedimentos por áreas especializadas
          </p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCategoria(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategoria ? "Editar Categoria" : "Nova Categoria"}
              </DialogTitle>
            </DialogHeader>
            <CategoriaForm
              categoria={editingCategoria}
              onSave={handleSave}
              onCancel={() => {
                setModalOpen(false);
                setEditingCategoria(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categorias cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorias.map((categoria) => (
                <TableRow key={categoria.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: categoria.cor }}
                      />
                      {categoria.nome}
                    </div>
                  </TableCell>
                  <TableCell>{categoria.descricao}</TableCell>
                  <TableCell className="text-center">
                    <SeloAtivo ativo={categoria.ativo} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingCategoria(categoria);
                        setModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(categoria.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {categorias.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma categoria cadastrada
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

function CategoriaForm({ categoria, onSave, onCancel }: any) {
  const [form, setForm] = useState({
    nome: categoria?.nome || "",
    descricao: categoria?.descricao || "",
    cor: categoria?.cor || "#3b82f6",
    ativo: categoria?.ativo ?? true,
    ordem: categoria?.ordem || 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(categoria ? { ...categoria, ...form } : form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          placeholder="Ex: Implantodontia"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Input
          id="descricao"
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          placeholder="Descrição da categoria"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cor">Cor</Label>
        <div className="flex gap-2">
          <Input
            id="cor"
            type="color"
            value={form.cor}
            onChange={(e) => setForm({ ...form, cor: e.target.value })}
            className="w-20"
          />
          <Input
            value={form.cor}
            onChange={(e) => setForm({ ...form, cor: e.target.value })}
            placeholder="#3b82f6"
          />
        </div>
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