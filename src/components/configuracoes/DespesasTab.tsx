import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Tags, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DespesasTabProps {
  clinicaId: string;
}

interface Category {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  ativo: boolean;
}

interface ExpenseType {
  id: string;
  nome: string;
  tipo: string;
  descricao: string | null;
  ativo: boolean;
}

const DEFAULT_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#0ea5e9",
];

export const DespesasTab = ({ clinicaId }: DespesasTabProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("categories");

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    nome: "",
    descricao: "",
    cor: "#3b82f6",
    ativo: true,
  });

  // Expense Type Modal State
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<ExpenseType | null>(null);
  const [typeForm, setTypeForm] = useState({
    nome: "",
    tipo: "variavel",
    descricao: "",
    ativo: true,
  });

  useEffect(() => {
    loadData();
  }, [clinicaId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [catRes, typeRes] = await Promise.all([
        supabase.from("expense_categories").select("*").eq("clinic_id", clinicaId).order("nome"),
        supabase.from("expense_types").select("*").eq("clinic_id", clinicaId).order("nome"),
      ]);

      if (catRes.data) setCategories(catRes.data);
      if (typeRes.data) setExpenseTypes(typeRes.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  // Category Functions
  const handleOpenCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        nome: category.nome,
        descricao: category.descricao || "",
        cor: category.cor,
        ativo: category.ativo,
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ nome: "", descricao: "", cor: "#3b82f6", ativo: true });
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.nome) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("expense_categories")
          .update({
            nome: categoryForm.nome,
            descricao: categoryForm.descricao || null,
            cor: categoryForm.cor,
            ativo: categoryForm.ativo,
          })
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("Categoria atualizada");
      } else {
        const { error } = await supabase.from("expense_categories").insert({
          clinic_id: clinicaId,
          nome: categoryForm.nome,
          descricao: categoryForm.descricao || null,
          cor: categoryForm.cor,
          ativo: categoryForm.ativo,
        });

        if (error) throw error;
        toast.success("Categoria criada");
      }

      setShowCategoryModal(false);
      loadData();
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
      toast.error("Erro ao salvar categoria");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;

    try {
      const { error } = await supabase.from("expense_categories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Categoria excluída");
      loadData();
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
      toast.error("Erro ao excluir categoria. Pode haver despesas vinculadas.");
    }
  };

  // Expense Type Functions
  const handleOpenTypeModal = (type?: ExpenseType) => {
    if (type) {
      setEditingType(type);
      setTypeForm({
        nome: type.nome,
        tipo: type.tipo,
        descricao: type.descricao || "",
        ativo: type.ativo,
      });
    } else {
      setEditingType(null);
      setTypeForm({ nome: "", tipo: "variavel", descricao: "", ativo: true });
    }
    setShowTypeModal(true);
  };

  const handleSaveType = async () => {
    if (!typeForm.nome) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      if (editingType) {
        const { error } = await supabase
          .from("expense_types")
          .update({
            nome: typeForm.nome,
            tipo: typeForm.tipo,
            descricao: typeForm.descricao || null,
            ativo: typeForm.ativo,
          })
          .eq("id", editingType.id);

        if (error) throw error;
        toast.success("Tipo atualizado");
      } else {
        const { error } = await supabase.from("expense_types").insert({
          clinic_id: clinicaId,
          nome: typeForm.nome,
          tipo: typeForm.tipo,
          descricao: typeForm.descricao || null,
          ativo: typeForm.ativo,
        });

        if (error) throw error;
        toast.success("Tipo criado");
      }

      setShowTypeModal(false);
      loadData();
    } catch (error) {
      console.error("Erro ao salvar tipo:", error);
      toast.error("Erro ao salvar tipo");
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este tipo?")) return;

    try {
      const { error } = await supabase.from("expense_types").delete().eq("id", id);
      if (error) throw error;
      toast.success("Tipo excluído");
      loadData();
    } catch (error) {
      console.error("Erro ao excluir tipo:", error);
      toast.error("Erro ao excluir tipo. Pode haver despesas vinculadas.");
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case "fixa":
        return <Badge className="bg-blue-100 text-blue-800">Fixa</Badge>;
      case "variavel":
        return <Badge className="bg-green-100 text-green-800">Variável</Badge>;
      case "comissao":
        return <Badge className="bg-purple-100 text-purple-800">Comissão</Badge>;
      default:
        return <Badge variant="secondary">{tipo}</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classificação de Despesas</CardTitle>
        <CardDescription>Gerencie categorias e tipos de despesas</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="categories">
              <Tags className="h-4 w-4 mr-2" />
              Categorias
            </TabsTrigger>
            <TabsTrigger value="types">
              <Layers className="h-4 w-4 mr-2" />
              Tipos de Despesa
            </TabsTrigger>
          </TabsList>

          {/* Categorias */}
          <TabsContent value="categories">
            <div className="flex justify-end mb-4">
              <Button onClick={() => handleOpenCategoryModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Categoria
              </Button>
            </div>

            {categories.length === 0 ? (
              <div className="text-center py-12">
                <Tags className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma categoria cadastrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cor</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <div className="w-6 h-6 rounded-full" style={{ backgroundColor: cat.cor }} />
                      </TableCell>
                      <TableCell className="font-medium">{cat.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{cat.descricao || "—"}</TableCell>
                      <TableCell>
                        {cat.ativo ? (
                          <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenCategoryModal(cat)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Tipos de Despesa */}
          <TabsContent value="types">
            <div className="flex justify-end mb-4">
              <Button onClick={() => handleOpenTypeModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Tipo
              </Button>
            </div>

            {expenseTypes.length === 0 ? (
              <div className="text-center py-12">
                <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum tipo cadastrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.nome}</TableCell>
                      <TableCell>{getTipoBadge(type.tipo)}</TableCell>
                      <TableCell className="text-muted-foreground">{type.descricao || "—"}</TableCell>
                      <TableCell>
                        {type.ativo ? (
                          <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenTypeModal(type)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteType(type.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>

        {/* Category Modal */}
        <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="catNome">Nome *</Label>
                <Input
                  id="catNome"
                  value={categoryForm.nome}
                  onChange={(e) => setCategoryForm({ ...categoryForm, nome: e.target.value })}
                  placeholder="Ex: Material, Insumos, etc."
                />
              </div>

              <div>
                <Label htmlFor="catDesc">Descrição</Label>
                <Textarea
                  id="catDesc"
                  value={categoryForm.descricao}
                  onChange={(e) => setCategoryForm({ ...categoryForm, descricao: e.target.value })}
                  placeholder="Descrição da categoria"
                  rows={2}
                />
              </div>

              <div>
                <Label>Cor</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, cor: color })}
                      className={`w-8 h-8 rounded-full transition-all ${
                        categoryForm.cor === color ? "ring-2 ring-offset-2 ring-primary" : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="catAtivo">Categoria ativa</Label>
                <Switch
                  id="catAtivo"
                  checked={categoryForm.ativo}
                  onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, ativo: checked })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowCategoryModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveCategory}>
                  {editingCategory ? "Salvar" : "Criar Categoria"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Expense Type Modal */}
        <Dialog open={showTypeModal} onOpenChange={setShowTypeModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingType ? "Editar Tipo" : "Novo Tipo de Despesa"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="typeNome">Nome *</Label>
                <Input
                  id="typeNome"
                  value={typeForm.nome}
                  onChange={(e) => setTypeForm({ ...typeForm, nome: e.target.value })}
                  placeholder="Ex: Aluguel, Material de Consumo, etc."
                />
              </div>

              <div>
                <Label htmlFor="typeTipo">Classificação</Label>
                <Select value={typeForm.tipo} onValueChange={(v) => setTypeForm({ ...typeForm, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixa">Fixa (recorrente, valor fixo)</SelectItem>
                    <SelectItem value="variavel">Variável (valor variável)</SelectItem>
                    <SelectItem value="comissao">Comissão (repasses)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="typeDesc">Descrição</Label>
                <Textarea
                  id="typeDesc"
                  value={typeForm.descricao}
                  onChange={(e) => setTypeForm({ ...typeForm, descricao: e.target.value })}
                  placeholder="Descrição do tipo"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="typeAtivo">Tipo ativo</Label>
                <Switch
                  id="typeAtivo"
                  checked={typeForm.ativo}
                  onCheckedChange={(checked) => setTypeForm({ ...typeForm, ativo: checked })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowTypeModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveType}>
                  {editingType ? "Salvar" : "Criar Tipo"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
