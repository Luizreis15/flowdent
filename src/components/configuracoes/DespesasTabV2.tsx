import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Pencil, 
  Trash2, 
  Search,
  FolderTree,
  Package,
  Layers,
  Building2,
  Wallet,
  Users,
  Wrench,
  Sparkles,
  GraduationCap,
  TrendingUp,
  CreditCard,
  FileText,
  ShoppingCart,
  Truck,
  Cog,
  Loader2
} from "lucide-react";

interface DespesasTabV2Props {
  clinicaId: string;
}

interface MacroType {
  id: string;
  nome: string;
  codigo: string;
  descricao: string | null;
  icone: string | null;
  ordem: number;
  is_system: boolean;
  ativo: boolean;
}

interface ExpenseGroup {
  id: string;
  macro_type_id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
}

interface ExpenseItem {
  id: string;
  group_id: string;
  nome: string;
  descricao: string | null;
  e_investimento: boolean;
  centro_custo: string | null;
  fornecedor_padrao_id: string | null;
  forma_pagamento_padrao: string | null;
  recorrente: boolean;
  frequencia: string | null;
  dia_vencimento: number | null;
  valor_padrao: number | null;
  observacoes: string | null;
  ativo: boolean;
}

interface Supplier {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

// Catálogo completo: Macro Types → Groups → Items
const CATALOG_SEED = {
  fixa: {
    nome: "Despesa Fixa",
    icone: "Building2",
    ordem: 1,
    groups: {
      aluguel: { nome: "Aluguel e Condomínio", items: ["Aluguel do Imóvel", "Taxa de Condomínio", "IPTU"] },
      concessionarias: { nome: "Concessionárias", items: ["Energia Elétrica", "Água e Esgoto", "Gás"] },
      telefonia: { nome: "Telefonia e Internet", items: ["Telefone Fixo", "Internet", "Celular Corporativo"] },
      seguros: { nome: "Seguros", items: ["Seguro do Imóvel", "Seguro de Equipamentos", "Seguro de Vida"] },
    },
  },
  variavel: {
    nome: "Despesa Variável",
    icone: "TrendingUp",
    ordem: 2,
    groups: {
      escritorio: { nome: "Material de Escritório", items: ["Papel A4", "Toner/Cartuchos", "Material de Papelaria"] },
      copa: { nome: "Copa e Cozinha", items: ["Café", "Água Mineral", "Descartáveis Copa"] },
      diversos: { nome: "Diversos", items: ["Correios/Motoboy", "Estacionamento", "Uber/Transporte"] },
    },
  },
  comissao: {
    nome: "Comissões / Repasse Profissional",
    icone: "Users",
    ordem: 3,
    groups: {
      dentistas: { nome: "Dentistas", items: ["Comissão Dentista Clínico", "Comissão Ortodontista", "Comissão Endodontista", "Comissão Implantodontista"] },
      especialistas: { nome: "Outros Especialistas", items: ["Comissão Periodontista", "Comissão Protesista", "Repasse Terceiros"] },
    },
  },
  financeira: {
    nome: "Despesas Financeiras",
    icone: "CreditCard",
    ordem: 4,
    groups: {
      taxas_bancarias: { nome: "Taxas Bancárias", items: ["Taxa de Manutenção de Conta", "TED/DOC", "Taxa de Boleto"] },
      taxas_cartao: { nome: "Taxas de Cartão", items: ["Taxa Cartão de Crédito", "Taxa Cartão de Débito", "Antecipação de Recebíveis"] },
      juros: { nome: "Juros e Multas", items: ["Juros de Empréstimo", "Multas Bancárias", "IOF"] },
    },
  },
  laboratorio: {
    nome: "Laboratório & Prótese",
    icone: "Package",
    ordem: 5,
    groups: {
      proteses: { nome: "Próteses Dentárias", items: ["Coroa de Porcelana", "Coroa Metalocerâmica", "Prótese Total", "Prótese Parcial Removível", "Faceta de Porcelana"] },
      implantes: { nome: "Componentes de Implante", items: ["Implante Osseointegrado", "Cicatrizador", "Pilar Protético", "Coroa sobre Implante"] },
      ortodontia: { nome: "Ortodontia", items: ["Aparelho Móvel", "Contenção", "Placa de Bruxismo"] },
    },
  },
  capex: {
    nome: "Compra de Equipamentos / Capex",
    icone: "Cog",
    ordem: 6,
    groups: {
      equipamentos: { nome: "Equipamentos Odontológicos", items: ["Cadeira Odontológica", "Compressor", "Autoclave", "Raio-X"] },
      moveis: { nome: "Móveis e Instalações", items: ["Mobiliário Recepção", "Armários Consultório", "Instalações Elétricas"] },
      informatica: { nome: "Informática", items: ["Computador/Notebook", "Impressora", "Scanner Intraoral"] },
    },
  },
  emprestimo: {
    nome: "Empréstimos e Financiamentos",
    icone: "Wallet",
    ordem: 7,
    groups: {
      bancarios: { nome: "Empréstimos Bancários", items: ["Parcela Empréstimo", "Financiamento de Equipamento", "Capital de Giro"] },
    },
  },
  tributo: {
    nome: "Tributos e Obrigações",
    icone: "FileText",
    ordem: 8,
    groups: {
      impostos: { nome: "Impostos", items: ["Simples Nacional", "ISS", "IRPJ", "CSLL", "PIS/COFINS"] },
      taxas: { nome: "Taxas e Licenças", items: ["Alvará de Funcionamento", "Licença Sanitária", "Anuidade CRO", "Taxa de Fiscalização"] },
      contabilidade: { nome: "Contabilidade", items: ["Honorários Contábeis", "Certificado Digital"] },
    },
  },
  pessoal: {
    nome: "Pessoal / Folha",
    icone: "Users",
    ordem: 9,
    groups: {
      salarios: { nome: "Salários", items: ["Salário Recepcionista", "Salário ASB", "Salário Gerente", "Salário Limpeza", "Pró-Labore Sócio"] },
      encargos: { nome: "Encargos", items: ["FGTS", "INSS Patronal", "GPS/DARF", "Provisão 13º", "Provisão Férias"] },
      beneficios: { nome: "Benefícios", items: ["Vale Transporte", "Vale Refeição/Alimentação", "Plano de Saúde", "Plano Odontológico"] },
      rescisoes: { nome: "Rescisões", items: ["Rescisão Contratual", "Aviso Prévio", "Multa FGTS"] },
    },
  },
  marketing: {
    nome: "Marketing / Comercial",
    icone: "Sparkles",
    ordem: 10,
    groups: {
      digital: { nome: "Marketing Digital", items: ["Google Ads", "Facebook/Instagram Ads", "Gestão de Redes Sociais", "Criação de Conteúdo"] },
      tradicional: { nome: "Marketing Tradicional", items: ["Impressos/Panfletos", "Cartões de Visita", "Outdoor/Banner"] },
      eventos: { nome: "Eventos e Brindes", items: ["Brindes para Pacientes", "Patrocínios", "Eventos"] },
    },
  },
  manutencao: {
    nome: "Manutenção / Infraestrutura",
    icone: "Wrench",
    ordem: 11,
    groups: {
      predial: { nome: "Manutenção Predial", items: ["Pintura", "Reparos Hidráulicos", "Reparos Elétricos", "Ar Condicionado"] },
      equipamentos: { nome: "Manutenção de Equipamentos", items: ["Manutenção Cadeira", "Manutenção Compressor", "Manutenção Autoclave", "Calibração de Equipamentos"] },
    },
  },
  tecnologia: {
    nome: "Tecnologia / Sistemas",
    icone: "Cog",
    ordem: 12,
    groups: {
      software: { nome: "Software", items: ["Software de Gestão", "Licenças Microsoft", "Antivírus", "Backup em Nuvem"] },
      suporte: { nome: "Suporte", items: ["Suporte Técnico TI", "Manutenção de Computadores"] },
    },
  },
  consumo: {
    nome: "Suprimentos Clínicos (Consumo)",
    icone: "ShoppingCart",
    ordem: 13,
    groups: {
      epis: { nome: "EPIs e Descartáveis", items: ["Luvas Procedimento", "Luvas Cirúrgicas", "Máscaras", "Gorros", "Óculos de Proteção"] },
      descartaveis: { nome: "Materiais Descartáveis", items: ["Gaze", "Algodão", "Sugadores", "Seringas", "Agulhas Anestésicas"] },
      consumiveis: { nome: "Consumíveis Clínicos", items: ["Resina Composta", "Cimento", "Anestésico", "Flúor", "Pasta Profilática"] },
    },
  },
  limpeza: {
    nome: "Limpeza / Higienização",
    icone: "Sparkles",
    ordem: 14,
    groups: {
      produtos: { nome: "Produtos de Limpeza", items: ["Desinfetante", "Detergente", "Álcool 70%", "Hipoclorito"] },
      servicos: { nome: "Serviços de Limpeza", items: ["Serviço de Limpeza Terceirizado", "Lavagem de Uniformes"] },
    },
  },
  cursos: {
    nome: "Cursos / Desenvolvimento",
    icone: "GraduationCap",
    ordem: 15,
    groups: {
      capacitacao: { nome: "Capacitação", items: ["Cursos de Atualização", "Congressos", "Workshops", "Assinaturas/Plataformas"] },
      livros: { nome: "Materiais", items: ["Livros Técnicos", "Revistas Científicas"] },
    },
  },
};

// Backward compatibility
const MACRO_TYPES_SEED = Object.entries(CATALOG_SEED).map(([codigo, data]) => ({
  codigo,
  nome: data.nome,
  icone: data.icone,
  ordem: data.ordem,
}));

const CENTRO_CUSTO_OPTIONS = [
  "Clínica",
  "Recepção",
  "Laboratório",
  "Marketing",
  "Administrativo",
  "Financeiro",
  "RH",
];

const FREQUENCIA_OPTIONS = [
  { value: "diaria", label: "Diária" },
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
  { value: "bimestral", label: "Bimestral" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

const FORMA_PAGAMENTO_OPTIONS = [
  { value: "pix", label: "PIX" },
  { value: "boleto", label: "Boleto" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "transferencia", label: "Transferência" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cheque", label: "Cheque" },
];

const getIconComponent = (iconName: string | null) => {
  switch (iconName) {
    case "Building2": return Building2;
    case "TrendingUp": return TrendingUp;
    case "Users": return Users;
    case "CreditCard": return CreditCard;
    case "Package": return Package;
    case "Cog": return Cog;
    case "Wallet": return Wallet;
    case "FileText": return FileText;
    case "Sparkles": return Sparkles;
    case "Wrench": return Wrench;
    case "ShoppingCart": return ShoppingCart;
    case "GraduationCap": return GraduationCap;
    case "Truck": return Truck;
    default: return Layers;
  }
};

export const DespesasTabV2 = ({ clinicaId }: DespesasTabV2Props) => {
  const [loading, setLoading] = useState(true);
  const [macroTypes, setMacroTypes] = useState<MacroType[]>([]);
  const [groups, setGroups] = useState<ExpenseGroup[]>([]);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [expandedMacros, setExpandedMacros] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Modals
  const [macroModalOpen, setMacroModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingMacro, setEditingMacro] = useState<MacroType | null>(null);
  const [editingGroup, setEditingGroup] = useState<ExpenseGroup | null>(null);
  const [editingItem, setEditingItem] = useState<ExpenseItem | null>(null);
  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Form states
  const [macroForm, setMacroForm] = useState({ nome: "", codigo: "", descricao: "", icone: "Layers" });
  const [groupForm, setGroupForm] = useState({ nome: "", descricao: "" });
  const [itemForm, setItemForm] = useState({
    nome: "",
    descricao: "",
    e_investimento: false,
    centro_custo: "",
    fornecedor_padrao_id: "",
    forma_pagamento_padrao: "",
    recorrente: false,
    frequencia: "",
    dia_vencimento: "",
    valor_padrao: "",
    observacoes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (clinicaId) {
      loadData();
    }
  }, [clinicaId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [macrosRes, groupsRes, itemsRes, suppliersRes] = await Promise.all([
        supabase.from("expense_macro_types").select("*").eq("clinic_id", clinicaId).order("ordem"),
        supabase.from("expense_groups").select("*").eq("clinic_id", clinicaId).order("ordem"),
        supabase.from("expense_items").select("*").eq("clinic_id", clinicaId).order("nome"),
        supabase.from("suppliers").select("id, razao_social, nome_fantasia").eq("clinica_id", clinicaId).eq("ativo", true),
      ]);

      if (macrosRes.error) throw macrosRes.error;
      if (groupsRes.error) throw groupsRes.error;
      if (itemsRes.error) throw itemsRes.error;

      setMacroTypes(macrosRes.data || []);
      setGroups(groupsRes.data || []);
      setItems(itemsRes.data || []);
      setSuppliers(suppliersRes.data || []);

      // Auto-expand first macro if exists
      if (macrosRes.data && macrosRes.data.length > 0) {
        setExpandedMacros(new Set([macrosRes.data[0].id]));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({ title: "Erro ao carregar catálogo de despesas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const importCatalogoPadrao = async () => {
    setSaving(true);
    try {
      // Insert macro types, groups, and items
      for (const [codigo, macroData] of Object.entries(CATALOG_SEED)) {
        // 1. Upsert macro type
        const { data: macroResult, error: macroError } = await supabase
          .from("expense_macro_types")
          .upsert(
            {
              clinic_id: clinicaId,
              codigo,
              nome: macroData.nome,
              icone: macroData.icone,
              ordem: macroData.ordem,
              is_system: true,
            },
            { onConflict: "clinic_id,codigo" }
          )
          .select("id")
          .single();

        if (macroError) {
          console.error("Erro ao inserir macro:", macroError);
          continue;
        }

        const macroId = macroResult.id;

        // 2. Insert groups for this macro
        let groupOrder = 1;
        for (const [groupCodigo, groupData] of Object.entries(macroData.groups)) {
          const { data: groupResult, error: groupError } = await supabase
            .from("expense_groups")
            .upsert(
              {
                clinic_id: clinicaId,
                macro_type_id: macroId,
                nome: groupData.nome,
                ordem: groupOrder++,
              },
              { onConflict: "clinic_id,macro_type_id,nome", ignoreDuplicates: true }
            )
            .select("id")
            .single();

          if (groupError) {
            // Try to get existing group
            const { data: existingGroup } = await supabase
              .from("expense_groups")
              .select("id")
              .eq("clinic_id", clinicaId)
              .eq("macro_type_id", macroId)
              .eq("nome", groupData.nome)
              .single();

            if (!existingGroup) {
              console.error("Erro ao inserir grupo:", groupError);
              continue;
            }

            // 3. Insert items for existing group
            for (const itemNome of groupData.items) {
              await supabase.from("expense_items").upsert(
                {
                  clinic_id: clinicaId,
                  group_id: existingGroup.id,
                  nome: itemNome,
                },
                { onConflict: "clinic_id,group_id,nome", ignoreDuplicates: true }
              );
            }
          } else if (groupResult) {
            // 3. Insert items for new group
            for (const itemNome of groupData.items) {
              await supabase.from("expense_items").upsert(
                {
                  clinic_id: clinicaId,
                  group_id: groupResult.id,
                  nome: itemNome,
                },
                { onConflict: "clinic_id,group_id,nome", ignoreDuplicates: true }
              );
            }
          }
        }
      }

      toast({ title: "Catálogo padrão importado com sucesso" });
      loadData();
    } catch (error) {
      console.error("Erro ao importar catálogo:", error);
      toast({ title: "Erro ao importar catálogo", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Macro Type handlers
  const handleOpenMacroModal = (macro?: MacroType) => {
    if (macro) {
      setEditingMacro(macro);
      setMacroForm({
        nome: macro.nome,
        codigo: macro.codigo,
        descricao: macro.descricao || "",
        icone: macro.icone || "Layers",
      });
    } else {
      setEditingMacro(null);
      setMacroForm({ nome: "", codigo: "", descricao: "", icone: "Layers" });
    }
    setMacroModalOpen(true);
  };

  const handleSaveMacro = async () => {
    if (!macroForm.nome || !macroForm.codigo) {
      toast({ title: "Preencha nome e código", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editingMacro) {
        const { error } = await supabase
          .from("expense_macro_types")
          .update({
            nome: macroForm.nome,
            codigo: macroForm.codigo,
            descricao: macroForm.descricao || null,
            icone: macroForm.icone,
          })
          .eq("id", editingMacro.id);
        if (error) throw error;
        toast({ title: "Tipo atualizado" });
      } else {
        const maxOrdem = Math.max(0, ...macroTypes.map((m) => m.ordem));
        const { error } = await supabase.from("expense_macro_types").insert({
          clinic_id: clinicaId,
          nome: macroForm.nome,
          codigo: macroForm.codigo,
          descricao: macroForm.descricao || null,
          icone: macroForm.icone,
          ordem: maxOrdem + 1,
        });
        if (error) throw error;
        toast({ title: "Tipo criado" });
      }
      setMacroModalOpen(false);
      loadData();
    } catch (error: any) {
      console.error("Erro ao salvar tipo:", error);
      toast({ title: error.message || "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMacro = async (id: string) => {
    if (!confirm("Excluir este tipo irá remover todos os grupos e itens associados. Continuar?")) return;
    try {
      const { error } = await supabase.from("expense_macro_types").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Tipo excluído" });
      loadData();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const handleToggleMacroStatus = async (macro: MacroType) => {
    try {
      const { error } = await supabase
        .from("expense_macro_types")
        .update({ ativo: !macro.ativo })
        .eq("id", macro.id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  };

  // Group handlers
  const handleOpenGroupModal = (macroId: string, group?: ExpenseGroup) => {
    setSelectedMacroId(macroId);
    if (group) {
      setEditingGroup(group);
      setGroupForm({ nome: group.nome, descricao: group.descricao || "" });
    } else {
      setEditingGroup(null);
      setGroupForm({ nome: "", descricao: "" });
    }
    setGroupModalOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.nome || !selectedMacroId) {
      toast({ title: "Preencha o nome do grupo", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editingGroup) {
        const { error } = await supabase
          .from("expense_groups")
          .update({ nome: groupForm.nome, descricao: groupForm.descricao || null })
          .eq("id", editingGroup.id);
        if (error) throw error;
        toast({ title: "Grupo atualizado" });
      } else {
        const groupsOfMacro = groups.filter((g) => g.macro_type_id === selectedMacroId);
        const maxOrdem = Math.max(0, ...groupsOfMacro.map((g) => g.ordem));
        const { error } = await supabase.from("expense_groups").insert({
          clinic_id: clinicaId,
          macro_type_id: selectedMacroId,
          nome: groupForm.nome,
          descricao: groupForm.descricao || null,
          ordem: maxOrdem + 1,
        });
        if (error) throw error;
        toast({ title: "Grupo criado" });
      }
      setGroupModalOpen(false);
      loadData();
    } catch (error: any) {
      console.error("Erro ao salvar grupo:", error);
      toast({ title: error.message || "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Excluir este grupo irá remover todos os itens associados. Continuar?")) return;
    try {
      const { error } = await supabase.from("expense_groups").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Grupo excluído" });
      loadData();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  // Item handlers
  const handleOpenItemModal = (groupId: string, item?: ExpenseItem) => {
    setSelectedGroupId(groupId);
    if (item) {
      setEditingItem(item);
      setItemForm({
        nome: item.nome,
        descricao: item.descricao || "",
        e_investimento: item.e_investimento,
        centro_custo: item.centro_custo || "",
        fornecedor_padrao_id: item.fornecedor_padrao_id || "",
        forma_pagamento_padrao: item.forma_pagamento_padrao || "",
        recorrente: item.recorrente,
        frequencia: item.frequencia || "",
        dia_vencimento: item.dia_vencimento?.toString() || "",
        valor_padrao: item.valor_padrao?.toString() || "",
        observacoes: item.observacoes || "",
      });
    } else {
      setEditingItem(null);
      setItemForm({
        nome: "",
        descricao: "",
        e_investimento: false,
        centro_custo: "",
        fornecedor_padrao_id: "",
        forma_pagamento_padrao: "",
        recorrente: false,
        frequencia: "",
        dia_vencimento: "",
        valor_padrao: "",
        observacoes: "",
      });
    }
    setItemModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.nome || !selectedGroupId) {
      toast({ title: "Preencha o nome do item", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: itemForm.nome,
        descricao: itemForm.descricao || null,
        e_investimento: itemForm.e_investimento,
        centro_custo: itemForm.centro_custo || null,
        fornecedor_padrao_id: itemForm.fornecedor_padrao_id || null,
        forma_pagamento_padrao: itemForm.forma_pagamento_padrao || null,
        recorrente: itemForm.recorrente,
        frequencia: itemForm.frequencia || null,
        dia_vencimento: itemForm.dia_vencimento ? parseInt(itemForm.dia_vencimento) : null,
        valor_padrao: itemForm.valor_padrao ? parseFloat(itemForm.valor_padrao.replace(",", ".")) : null,
        observacoes: itemForm.observacoes || null,
      };

      if (editingItem) {
        const { error } = await supabase.from("expense_items").update(payload).eq("id", editingItem.id);
        if (error) throw error;
        toast({ title: "Item atualizado" });
      } else {
        const { error } = await supabase.from("expense_items").insert({
          ...payload,
          clinic_id: clinicaId,
          group_id: selectedGroupId,
        });
        if (error) throw error;
        toast({ title: "Item criado" });
      }
      setItemModalOpen(false);
      loadData();
    } catch (error: any) {
      console.error("Erro ao salvar item:", error);
      toast({ title: error.message || "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Excluir este item de despesa?")) return;
    try {
      const { error } = await supabase.from("expense_items").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Item excluído" });
      loadData();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const handleToggleItemStatus = async (item: ExpenseItem) => {
    try {
      const { error } = await supabase.from("expense_items").update({ ativo: !item.ativo }).eq("id", item.id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  };

  const toggleMacroExpand = (id: string) => {
    const newSet = new Set(expandedMacros);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedMacros(newSet);
  };

  const toggleGroupExpand = (id: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedGroups(newSet);
  };

  // Filter data
  const filteredMacros = macroTypes.filter((m) => {
    if (!showInactive && !m.ativo) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const hasMatchingGroup = groups.some(
        (g) => g.macro_type_id === m.id && g.nome.toLowerCase().includes(search)
      );
      const hasMatchingItem = items.some((i) => {
        const group = groups.find((g) => g.id === i.group_id);
        return group?.macro_type_id === m.id && i.nome.toLowerCase().includes(search);
      });
      return m.nome.toLowerCase().includes(search) || hasMatchingGroup || hasMatchingItem;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5" />
                Catálogo de Despesas
              </CardTitle>
              <CardDescription>
                Estrutura hierárquica: Tipo Macro → Grupo → Item de Despesa
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {(macroTypes.length === 0 || groups.length === 0 || items.length === 0) && (
                <Button onClick={importCatalogoPadrao} disabled={saving} variant="outline">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {macroTypes.length === 0 ? "Importar Catálogo Padrão" : "Completar Catálogo"}
                </Button>
              )}
              <Button onClick={() => handleOpenMacroModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Tipo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showInactive} onCheckedChange={setShowInactive} id="show-inactive" />
              <Label htmlFor="show-inactive">Mostrar inativos</Label>
            </div>
          </div>

          {/* Tree View */}
          {filteredMacros.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum tipo de despesa cadastrado.</p>
              <p className="text-sm">Clique em "Importar Catálogo Padrão" para começar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMacros.map((macro) => {
                const IconComponent = getIconComponent(macro.icone);
                const macroGroups = groups.filter((g) => g.macro_type_id === macro.id && (showInactive || g.ativo));
                const isExpanded = expandedMacros.has(macro.id);

                return (
                  <Collapsible key={macro.id} open={isExpanded} onOpenChange={() => toggleMacroExpand(macro.id)}>
                    <div className={`border rounded-lg ${!macro.ativo ? "opacity-60" : ""}`}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <IconComponent className="h-5 w-5 text-primary" />
                            <div>
                              <span className="font-medium">{macro.nome}</span>
                              <span className="text-xs text-muted-foreground ml-2">({macro.codigo})</span>
                              {!macro.ativo && (
                                <Badge variant="secondary" className="ml-2">Inativo</Badge>
                              )}
                            </div>
                            <Badge variant="outline" className="ml-2">{macroGroups.length} grupos</Badge>
                          </div>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenGroupModal(macro.id)}
                              title="Adicionar grupo"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenMacroModal(macro)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleMacroStatus(macro)}
                              title={macro.ativo ? "Desativar" : "Ativar"}
                            >
                              <Switch checked={macro.ativo} />
                            </Button>
                            {!macro.is_system && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteMacro(macro.id)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="pl-10 pr-3 pb-3 space-y-1">
                          {macroGroups.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">
                              Nenhum grupo cadastrado. Clique em + para adicionar.
                            </p>
                          ) : (
                            macroGroups.map((group) => {
                              const groupItems = items.filter(
                                (i) => i.group_id === group.id && (showInactive || i.ativo)
                              );
                              const isGroupExpanded = expandedGroups.has(group.id);

                              return (
                                <Collapsible
                                  key={group.id}
                                  open={isGroupExpanded}
                                  onOpenChange={() => toggleGroupExpand(group.id)}
                                >
                                  <div className={`border-l-2 border-primary/20 ${!group.ativo ? "opacity-60" : ""}`}>
                                    <CollapsibleTrigger asChild>
                                      <div className="flex items-center justify-between pl-4 py-2 hover:bg-muted/30 cursor-pointer">
                                        <div className="flex items-center gap-2">
                                          {isGroupExpanded ? (
                                            <ChevronDown className="h-3 w-3" />
                                          ) : (
                                            <ChevronRight className="h-3 w-3" />
                                          )}
                                          <span className="text-sm font-medium">{group.nome}</span>
                                          {!group.ativo && (
                                            <Badge variant="secondary" className="text-xs">Inativo</Badge>
                                          )}
                                          <Badge variant="outline" className="text-xs">
                                            {groupItems.length} itens
                                          </Badge>
                                        </div>
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleOpenItemModal(group.id)}
                                            title="Adicionar item"
                                          >
                                            <Plus className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleOpenGroupModal(macro.id, group)}
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteGroup(group.id)}
                                          >
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                          </Button>
                                        </div>
                                      </div>
                                    </CollapsibleTrigger>

                                    <CollapsibleContent>
                                      <div className="pl-8 pr-2 pb-2 space-y-1">
                                        {groupItems.length === 0 ? (
                                          <p className="text-xs text-muted-foreground py-1">
                                            Nenhum item. Clique em + para adicionar.
                                          </p>
                                        ) : (
                                          groupItems.map((item) => (
                                            <div
                                              key={item.id}
                                              className={`flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/20 text-sm ${!item.ativo ? "opacity-60" : ""}`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <Package className="h-3 w-3 text-muted-foreground" />
                                                <span>{item.nome}</span>
                                                {item.e_investimento && (
                                                  <Badge variant="secondary" className="text-xs">Investimento</Badge>
                                                )}
                                                {item.recorrente && (
                                                  <Badge variant="outline" className="text-xs">Recorrente</Badge>
                                                )}
                                                {item.centro_custo && (
                                                  <Badge variant="outline" className="text-xs">{item.centro_custo}</Badge>
                                                )}
                                                {!item.ativo && (
                                                  <Badge variant="secondary" className="text-xs">Inativo</Badge>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleOpenItemModal(group.id, item)}
                                                >
                                                  <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleToggleItemStatus(item)}
                                                >
                                                  <Switch checked={item.ativo} className="scale-75" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleDeleteItem(item.id)}
                                                >
                                                  <Trash2 className="h-3 w-3 text-destructive" />
                                                </Button>
                                              </div>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </CollapsibleContent>
                                  </div>
                                </Collapsible>
                              );
                            })
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Macro Type Modal */}
      <Dialog open={macroModalOpen} onOpenChange={setMacroModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMacro ? "Editar Tipo de Despesa" : "Novo Tipo de Despesa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={macroForm.nome}
                onChange={(e) => setMacroForm({ ...macroForm, nome: e.target.value })}
                placeholder="Ex: Despesa Fixa"
              />
            </div>
            <div>
              <Label>Código *</Label>
              <Input
                value={macroForm.codigo}
                onChange={(e) => setMacroForm({ ...macroForm, codigo: e.target.value.toLowerCase().replace(/\s/g, "_") })}
                placeholder="Ex: fixa"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={macroForm.descricao}
                onChange={(e) => setMacroForm({ ...macroForm, descricao: e.target.value })}
                placeholder="Descrição opcional..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMacroModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveMacro} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Modal */}
      <Dialog open={groupModalOpen} onOpenChange={setGroupModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Editar Grupo" : "Novo Grupo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={groupForm.nome}
                onChange={(e) => setGroupForm({ ...groupForm, nome: e.target.value })}
                placeholder="Ex: Aluguel, EPI, CLT..."
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={groupForm.descricao}
                onChange={(e) => setGroupForm({ ...groupForm, descricao: e.target.value })}
                placeholder="Descrição opcional..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveGroup} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Modal */}
      <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Item de Despesa" : "Novo Item de Despesa"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Nome *</Label>
              <Input
                value={itemForm.nome}
                onChange={(e) => setItemForm({ ...itemForm, nome: e.target.value })}
                placeholder="Ex: Aluguel da clínica, Energia elétrica..."
              />
            </div>
            <div className="md:col-span-2">
              <Label>Descrição</Label>
              <Textarea
                value={itemForm.descricao}
                onChange={(e) => setItemForm({ ...itemForm, descricao: e.target.value })}
                placeholder="Descrição opcional..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={itemForm.e_investimento}
                onCheckedChange={(v) => setItemForm({ ...itemForm, e_investimento: v })}
              />
              <Label>É investimento (Capex)?</Label>
            </div>
            <div>
              <Label>Centro de Custo</Label>
              <Select
                value={itemForm.centro_custo}
                onValueChange={(v) => setItemForm({ ...itemForm, centro_custo: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CENTRO_CUSTO_OPTIONS.map((cc) => (
                    <SelectItem key={cc} value={cc}>{cc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fornecedor Padrão</Label>
              <Select
                value={itemForm.fornecedor_padrao_id}
                onValueChange={(v) => setItemForm({ ...itemForm, fornecedor_padrao_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opcional..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome_fantasia || s.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Forma de Pagamento Padrão</Label>
              <Select
                value={itemForm.forma_pagamento_padrao}
                onValueChange={(v) => setItemForm({ ...itemForm, forma_pagamento_padrao: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opcional..." />
                </SelectTrigger>
                <SelectContent>
                  {FORMA_PAGAMENTO_OPTIONS.map((fp) => (
                    <SelectItem key={fp.value} value={fp.value}>{fp.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={itemForm.recorrente}
                onCheckedChange={(v) => setItemForm({ ...itemForm, recorrente: v })}
              />
              <Label>Despesa recorrente?</Label>
            </div>
            {itemForm.recorrente && (
              <>
                <div>
                  <Label>Frequência</Label>
                  <Select
                    value={itemForm.frequencia}
                    onValueChange={(v) => setItemForm({ ...itemForm, frequencia: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIA_OPTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dia de Vencimento</Label>
                  <Input
                    type="number"
                    min="1"
                    max="28"
                    value={itemForm.dia_vencimento}
                    onChange={(e) => setItemForm({ ...itemForm, dia_vencimento: e.target.value })}
                    placeholder="Ex: 10"
                  />
                </div>
              </>
            )}
            <div>
              <Label>Valor Padrão (R$)</Label>
              <Input
                value={itemForm.valor_padrao}
                onChange={(e) => setItemForm({ ...itemForm, valor_padrao: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Observações / Alertas</Label>
              <Textarea
                value={itemForm.observacoes}
                onChange={(e) => setItemForm({ ...itemForm, observacoes: e.target.value })}
                placeholder="Ex: Reajuste anual em janeiro, vencimento todo dia 10..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveItem} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
