import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Upload } from "lucide-react";
import { ImportPacientesModal } from "@/components/pacientes/ImportPacientesModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button as PaginationButton } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { EstadoErro } from "@/components/sistema/EstadoErro";
import { EsqueletoLista } from "@/components/sistema/EsqueletoLista";

const patientSchema = z.object({
  full_name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  gender: z.enum(["masculino", "feminino"], { required_error: "Selecione o sexo" }),
  is_foreign: z.boolean().optional(),
  birth_date: z.string().optional(),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  how_found: z.string().optional(),
  tags: z.string().optional(),
  responsible_name: z.string().optional(),
  responsible_birth_date: z.string().optional(),
  responsible_cpf: z.string().optional(),
  responsible_phone: z.string().optional(),
  notes: z.string().optional(),
});

const PAGE_SIZE = 25;

/** Tira do termo os caracteres que têm significado no filtro .or() do PostgREST (vírgula e parênteses quebravam a busca). */
const termoSeguro = (texto: string) => texto.replace(/[,()*%\\]/g, " ").trim();

const Prontuario = () => {
  const navigate = useNavigate();
  const { clinicId } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  // Busca no servidor só depois de uma pausa na digitação (antes era uma consulta por tecla)
  const [termoBusca, setTermoBusca] = useState("");
  const [erroCarregar, setErroCarregar] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [formData, setFormData] = useState({
    full_name: "",
    gender: "" as "masculino" | "feminino" | "",
    is_foreign: false,
    birth_date: "",
    cpf: "",
    rg: "",
    phone: "",
    how_found: "",
    tags: "",
    responsible_name: "",
    responsible_birth_date: "",
    responsible_cpf: "",
    responsible_phone: "",
    notes: "",
  });

  useEffect(() => {
    if (clinicId) {
      loadPatients();
    }
  }, [clinicId, page, termoBusca]);

  useEffect(() => {
    const t = setTimeout(() => setTermoBusca(termoSeguro(searchTerm)), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const loadPatients = async () => {
    if (!clinicId) return;
    try {
      setLoading(true);
      setErroCarregar(false);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("patients")
        .select("*", { count: "exact" })
        .eq("clinic_id", clinicId)
        .order("full_name");

      if (termoBusca) {
        query = query.or(`full_name.ilike.%${termoBusca}%,phone.ilike.%${termoBusca}%,cpf.ilike.%${termoBusca}%`);
      }

      const { data, error, count } = await query.range(from, to);
      
      if (error) throw error;
      setPatients(data || []);
      setFilteredPatients(data || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error("Erro ao carregar pacientes:", error);
      setErroCarregar(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form data
      const validatedData = patientSchema.parse({
        full_name: formData.full_name,
        gender: formData.gender || undefined,
        is_foreign: formData.is_foreign,
        birth_date: formData.birth_date || undefined,
        cpf: formData.cpf || undefined,
        rg: formData.rg || undefined,
        phone: formData.phone,
        how_found: formData.how_found || undefined,
        tags: formData.tags || undefined,
        responsible_name: formData.responsible_name || undefined,
        responsible_birth_date: formData.responsible_birth_date || undefined,
        responsible_cpf: formData.responsible_cpf || undefined,
        responsible_phone: formData.responsible_phone || undefined,
        notes: formData.notes || undefined,
      });

      setSaving(true);

      if (!clinicId) throw new Error("Clínica não encontrada");

      // Parse tags if provided
      const tagsArray = validatedData.tags 
        ? validatedData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : null;

      // Save to database
      const { error } = await supabase
        .from("patients")
        .insert({
          clinic_id: clinicId,
          full_name: validatedData.full_name,
          gender: validatedData.gender || null,
          is_foreign: validatedData.is_foreign || false,
          birth_date: validatedData.birth_date || null,
          cpf: validatedData.cpf || null,
          rg: validatedData.rg || null,
          phone: validatedData.phone,
          how_found: validatedData.how_found || null,
          tags: tagsArray,
          responsible_name: validatedData.responsible_name || null,
          responsible_birth_date: validatedData.responsible_birth_date || null,
          responsible_cpf: validatedData.responsible_cpf || null,
          responsible_phone: validatedData.responsible_phone || null,
          notes: validatedData.notes || null,
        });

      if (error) throw error;

      toast.success("Paciente cadastrado com sucesso");
      setIsSheetOpen(false);
      setFormData({
        full_name: "",
        gender: "",
        is_foreign: false,
        birth_date: "",
        cpf: "",
        rg: "",
        phone: "",
        how_found: "",
        tags: "",
        responsible_name: "",
        responsible_birth_date: "",
        responsible_cpf: "",
        responsible_phone: "",
        notes: "",
      });

      // Reload patients
      await loadPatients();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Erro ao cadastrar paciente:", error);
        toast.error("Erro ao cadastrar paciente: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  // Filter patients by status for tabs
  const getPatientsByStatus = (status: string) => {
    if (status === "all") return filteredPatients;
    return filteredPatients.filter((p) => p.status === status);
  };

  const renderPatientList = (patientList: any[]) => {
    if (erroCarregar) {
      return (
        <div className="rounded-lg border bg-card">
          <EstadoErro titulo="Não foi possível carregar os pacientes" onTentarDeNovo={loadPatients} />
        </div>
      );
    }

    if (loading) {
      return <EsqueletoLista avatar linhas={8} />;
    }

    if (patientList.length === 0) {
      return (
        <div className="rounded-lg border bg-card">
          {termoBusca ? (
            <EstadoVazio
              icone={Search}
              titulo="Nenhum paciente encontrado"
              descricao={`Nada encontrado para "${termoBusca}". Busque por nome, CPF ou telefone.`}
              acao={
                <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}>
                  Limpar busca
                </Button>
              }
            />
          ) : (
            <EstadoVazio
              icone={Users}
              titulo="Nenhum paciente nesta lista"
              descricao="Cadastre um paciente ou importe a planilha da clínica."
              acao={
                <Button size="sm" onClick={() => setIsSheetOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Novo paciente
                </Button>
              }
            />
          )}
        </div>
      );
    }

    return (
      <div className="divide-y overflow-hidden rounded-lg border bg-card">
        {patientList.map((patient) => (
          <div
            key={patient.id}
            className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-muted/50"
            onClick={() => navigate(`/dashboard/prontuario/${patient.id}`)}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-acao-tenue text-[13px] font-medium text-acao">
              {patient.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium text-foreground">{patient.full_name}</p>
              <p className="truncate text-[13px] text-muted-foreground tabular-nums">
                {patient.phone}
                {patient.email && ` • ${patient.email}`}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="hidden sm:flex shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/dashboard/prontuario/${patient.id}`);
              }}
            >
              Ver
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Header compacto com Busca + Botões */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou telefone"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Importar</span>
          </Button>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Novo paciente</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-[700px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Dados do paciente</SheetTitle>
                <SheetDescription>
                  Preencha os dados do paciente para criar o prontuário
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                {/* Dados do Paciente */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Dados do paciente</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="full_name">Nome do paciente *</Label>
                      <Input
                        id="full_name"
                        placeholder="Nome completo do paciente"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Sexo *</Label>
                      <RadioGroup
                        value={formData.gender}
                        onValueChange={(value: "masculino" | "feminino") => 
                          setFormData({ ...formData, gender: value })
                        }
                        className="flex gap-4"
                        required
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="masculino" id="masculino" />
                          <Label htmlFor="masculino" className="font-normal cursor-pointer">
                            Masculino
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="feminino" id="feminino" />
                          <Label htmlFor="feminino" className="font-normal cursor-pointer">
                            Feminino
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_foreign"
                      checked={formData.is_foreign}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, is_foreign: checked })
                      }
                    />
                    <Label htmlFor="is_foreign" className="font-normal cursor-pointer">
                      Paciente estrangeiro
                    </Label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="birth_date">Data de nascimento</Label>
                      <Input
                        id="birth_date"
                        type="date"
                        value={formData.birth_date}
                        onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00"
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rg">RG</Label>
                      <Input
                        id="rg"
                        placeholder="00.000.000-0"
                        value={formData.rg}
                        onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Celular do paciente *</Label>
                    <div className="flex gap-2">
                      <Input
                        className="w-24"
                        value="+55"
                        disabled
                      />
                      <Input
                        id="phone"
                        placeholder="11 93736 7647"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="how_found">Como o paciente chegou na clínica</Label>
                    <Select
                      value={formData.how_found}
                      onValueChange={(value) => setFormData({ ...formData, how_found: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma opção" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="indicacao">Indicação</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="redes_sociais">Redes Sociais</SelectItem>
                        <SelectItem value="placa">Placa/Fachada</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Etiquetas</Label>
                    <Input
                      id="tags"
                      placeholder="Digite etiquetas separadas por vírgula"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Separe as etiquetas com vírgula (ex: VIP, Ortodontia, Prioritário)
                    </p>
                  </div>
                </div>

                {/* Dados do Responsável */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold text-foreground">Dados do responsável</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="responsible_name">Nome do responsável</Label>
                      <Input
                        id="responsible_name"
                        placeholder="Nome completo do responsável"
                        value={formData.responsible_name}
                        onChange={(e) => setFormData({ ...formData, responsible_name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="responsible_birth_date">Data de nascimento</Label>
                      <Input
                        id="responsible_birth_date"
                        type="date"
                        value={formData.responsible_birth_date}
                        onChange={(e) => setFormData({ ...formData, responsible_birth_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="responsible_cpf">CPF</Label>
                      <Input
                        id="responsible_cpf"
                        placeholder="000.000.000-00"
                        value={formData.responsible_cpf}
                        onChange={(e) => setFormData({ ...formData, responsible_cpf: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="responsible_phone">Celular do responsável</Label>
                      <Input
                        id="responsible_phone"
                        placeholder="(00) 00000-0000"
                        value={formData.responsible_phone}
                        onChange={(e) => setFormData({ ...formData, responsible_phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Observação */}
                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="notes">Observação</Label>
                  <Textarea
                    id="notes"
                    placeholder="Informações adicionais sobre o paciente"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsSheetOpen(false)} 
                    disabled={saving}
                  >
                    Fechar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "SALVANDO..." : "SALVAR"}
                  </Button>
                </div>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <ImportPacientesModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onSuccess={loadPatients}
      />

      {/* Abas de Filtro + Lista */}
      <Tabs defaultValue="all" className="space-y-3">
        <TabsList className="w-full grid grid-cols-4 h-auto">
          <TabsTrigger value="all" className="text-xs lg:text-sm py-2">Todos</TabsTrigger>
          <TabsTrigger value="ativo" className="text-xs lg:text-sm py-2">Ativos</TabsTrigger>
          <TabsTrigger value="tratamento" className="text-xs lg:text-sm py-2">Tratam.</TabsTrigger>
          <TabsTrigger value="inativo" className="text-xs lg:text-sm py-2">Inativos</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {renderPatientList(getPatientsByStatus("all"))}
        </TabsContent>

        <TabsContent value="ativo">
          {renderPatientList(getPatientsByStatus("ativo"))}
        </TabsContent>

        <TabsContent value="tratamento">
          {renderPatientList(getPatientsByStatus("tratamento"))}
        </TabsContent>

        <TabsContent value="inativo">
          {renderPatientList(getPatientsByStatus("inativo"))}
        </TabsContent>
      </Tabs>

      {/* Paginação */}
      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= totalCount} onClick={() => setPage(p => p + 1)}>
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prontuario;
