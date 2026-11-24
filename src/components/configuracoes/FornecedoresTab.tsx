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
import { Plus, Search, Pencil, Trash2, Building2, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UploadPlanilhaLabModal } from "./UploadPlanilhaLabModal";
import { SeloAtivo } from "@/components/sistema/Selo";

interface FornecedoresTabProps {
  clinicaId: string;
}

interface Supplier {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  contato_nome: string | null;
  contato_email: string | null;
  contato_telefone: string | null;
  contato_whatsapp: string | null;
  condicoes_pagamento: string | null;
  tipo: string | null;
  ativo: boolean;
}

const TIPO_FORNECEDOR_LABELS: Record<string, string> = {
  geral: "Geral",
  laboratorio_protetico: "Laboratório Protético",
  material_consumo: "Material de Consumo",
  equipamentos: "Equipamentos",
};

export const FornecedoresTab = ({ clinicaId }: FornecedoresTabProps) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedSupplierForUpload, setSelectedSupplierForUpload] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    contato_nome: "",
    contato_email: "",
    contato_telefone: "",
    contato_whatsapp: "",
    condicoes_pagamento: "",
    tipo: "geral",
    ativo: true,
  });

  useEffect(() => {
    loadSuppliers();
  }, [clinicaId]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("razao_social");

      if (error) throw error;
      setSuppliers((data || []) as Supplier[]);
    } catch (error) {
      console.error("Erro ao carregar fornecedores:", error);
      toast.error("Erro ao carregar fornecedores");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        razao_social: supplier.razao_social,
        nome_fantasia: supplier.nome_fantasia || "",
        cnpj: supplier.cnpj || "",
        contato_nome: supplier.contato_nome || "",
        contato_email: supplier.contato_email || "",
        contato_telefone: supplier.contato_telefone || "",
        contato_whatsapp: supplier.contato_whatsapp || "",
        condicoes_pagamento: supplier.condicoes_pagamento || "",
        tipo: supplier.tipo || "geral",
        ativo: supplier.ativo,
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        razao_social: "",
        nome_fantasia: "",
        cnpj: "",
        contato_nome: "",
        contato_email: "",
        contato_telefone: "",
        contato_whatsapp: "",
        condicoes_pagamento: "",
        tipo: "geral",
        ativo: true,
      });
    }
    setShowModal(true);
  };

  const handleOpenUpload = (supplier: Supplier) => {
    setSelectedSupplierForUpload(supplier);
    setShowUploadModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.razao_social) {
      toast.error("Razão Social é obrigatória");
      return;
    }

    try {
      if (editingSupplier) {
        const { error } = await supabase
          .from("suppliers")
          .update({
            razao_social: formData.razao_social,
            nome_fantasia: formData.nome_fantasia || null,
            cnpj: formData.cnpj || null,
            contato_nome: formData.contato_nome || null,
            contato_email: formData.contato_email || null,
            contato_telefone: formData.contato_telefone || null,
            contato_whatsapp: formData.contato_whatsapp || null,
            condicoes_pagamento: formData.condicoes_pagamento || null,
            tipo: formData.tipo as any,
            ativo: formData.ativo,
          })
          .eq("id", editingSupplier.id);

        if (error) throw error;
        toast.success("Fornecedor atualizado");
      } else {
        const { error } = await supabase.from("suppliers").insert({
          clinica_id: clinicaId,
          razao_social: formData.razao_social,
          nome_fantasia: formData.nome_fantasia || null,
          cnpj: formData.cnpj || null,
          contato_nome: formData.contato_nome || null,
          contato_email: formData.contato_email || null,
          contato_telefone: formData.contato_telefone || null,
          contato_whatsapp: formData.contato_whatsapp || null,
          condicoes_pagamento: formData.condicoes_pagamento || null,
          tipo: formData.tipo as any,
          ativo: formData.ativo,
        });

        if (error) throw error;
        toast.success("Fornecedor criado");
      }

      setShowModal(false);
      loadSuppliers();
    } catch (error) {
      console.error("Erro ao salvar fornecedor:", error);
      toast.error("Erro ao salvar fornecedor");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este fornecedor?")) return;

    try {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
      toast.success("Fornecedor excluído");
      loadSuppliers();
    } catch (error) {
      console.error("Erro ao excluir fornecedor:", error);
      toast.error("Erro ao excluir fornecedor");
    }
  };

  const getDisplayName = (supplier: Supplier) => {
    return supplier.nome_fantasia || supplier.razao_social;
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.cnpj?.includes(searchTerm) ||
      s.contato_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>Fornecedores</CardTitle>
            <CardDescription>Gerencie os fornecedores da clínica</CardDescription>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo fornecedor
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{getDisplayName(supplier)}</div>
                      {supplier.nome_fantasia && (
                        <div className="text-xs text-muted-foreground">{supplier.razao_social}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {TIPO_FORNECEDOR_LABELS[supplier.tipo || "geral"]}
                    </Badge>
                  </TableCell>
                  <TableCell>{supplier.cnpj || "—"}</TableCell>
                  <TableCell>{supplier.contato_nome || "—"}</TableCell>
                  <TableCell>
                    <SeloAtivo ativo={supplier.ativo} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {supplier.tipo === "laboratorio_protetico" && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          title="Importar planilha de preços"
                          onClick={() => handleOpenUpload(supplier)}
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleOpenModal(supplier)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(supplier.id)}>
                        <Trash2 className="h-4 w-4 text-sinal-alerta" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="razao_social">Razão social *</Label>
                <Input
                  id="razao_social"
                  value={formData.razao_social}
                  onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                  placeholder="Razão social do fornecedor"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome_fantasia">Nome fantasia</Label>
                  <Input
                    id="nome_fantasia"
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    placeholder="Nome fantasia"
                  />
                </div>
                <div>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contato_nome">Nome do contato</Label>
                  <Input
                    id="contato_nome"
                    value={formData.contato_nome}
                    onChange={(e) => setFormData({ ...formData, contato_nome: e.target.value })}
                    placeholder="Nome do contato"
                  />
                </div>
                <div>
                  <Label htmlFor="contato_email">E-mail</Label>
                  <Input
                    id="contato_email"
                    type="email"
                    value={formData.contato_email}
                    onChange={(e) => setFormData({ ...formData, contato_email: e.target.value })}
                    placeholder="contato@fornecedor.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contato_telefone">Telefone</Label>
                  <Input
                    id="contato_telefone"
                    value={formData.contato_telefone}
                    onChange={(e) => setFormData({ ...formData, contato_telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <Label htmlFor="contato_whatsapp">WhatsApp</Label>
                  <Input
                    id="contato_whatsapp"
                    value={formData.contato_whatsapp}
                    onChange={(e) => setFormData({ ...formData, contato_whatsapp: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="condicoes">Condições de pagamento</Label>
                <Textarea
                  id="condicoes"
                  value={formData.condicoes_pagamento}
                  onChange={(e) => setFormData({ ...formData, condicoes_pagamento: e.target.value })}
                  placeholder="Ex: 30/60/90 dias, desconto 5%..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="tipo">Tipo de fornecedor</Label>
                <Select 
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Geral</SelectItem>
                    <SelectItem value="laboratorio_protetico">Laboratório protético</SelectItem>
                    <SelectItem value="material_consumo">Material de consumo</SelectItem>
                    <SelectItem value="equipamentos">Equipamentos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="ativo">Fornecedor ativo</Label>
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  {editingSupplier ? "Salvar" : "Criar Fornecedor"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Upload Planilha Laboratório */}
        {selectedSupplierForUpload && (
          <UploadPlanilhaLabModal
            open={showUploadModal}
            onOpenChange={setShowUploadModal}
            clinicId={clinicaId}
            supplierId={selectedSupplierForUpload.id}
            supplierName={selectedSupplierForUpload.nome_fantasia || selectedSupplierForUpload.razao_social}
            onSuccess={() => setSelectedSupplierForUpload(null)}
          />
        )}
      </CardContent>
    </Card>
  );
};
