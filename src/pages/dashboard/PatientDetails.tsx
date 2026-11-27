import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, Edit, Copy, MessageCircle, MoreVertical, 
  Phone, Mail, Trash2, Printer, Send, Link2, 
  User, Phone as PhoneIcon, FileText, AlertCircle,
  Calendar, MapPin
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EsqueletoSecao } from "@/components/sistema/EsqueletoSecao";

// Abas e modais da ficha carregados sob demanda: antes a página baixava todos de uma vez (~340 KB),
// inclusive os modais de documentos, receituário e contrato que quase nunca abrem.
const NovoOrcamentoModal = lazy(() => import("@/components/orcamentos/NovoOrcamentoModal").then((m) => ({ default: m.NovoOrcamentoModal })));
const TratamentosTab = lazy(() => import("@/components/tratamentos/TratamentosTab").then((m) => ({ default: m.TratamentosTab })));
const OrcamentosTab = lazy(() => import("@/components/orcamentos/OrcamentosTab").then((m) => ({ default: m.OrcamentosTab })));
const AnamnesesTab = lazy(() => import("@/components/anamnese/AnamnesesTab"));
const ImagensTab = lazy(() => import("@/components/imagens/ImagensTab"));
const DocumentosTab = lazy(() => import("@/components/documentos/DocumentosTab").then((m) => ({ default: m.DocumentosTab })));
const EditPatientModal = lazy(() => import("@/components/pacientes/EditPatientModal").then((m) => ({ default: m.EditPatientModal })));
const FinanceiroTab = lazy(() => import("@/components/pacientes/FinanceiroTab").then((m) => ({ default: m.FinanceiroTab })));
const OdontogramaTab = lazy(() => import("@/components/pacientes/OdontogramaTab").then((m) => ({ default: m.OdontogramaTab })));
const AgendamentosTab = lazy(() => import("@/components/pacientes/AgendamentosTab").then((m) => ({ default: m.AgendamentosTab })));
const OrthoPatientTab = lazy(() => import("@/components/ortodontia/OrthoPatientTab").then((m) => ({ default: m.OrthoPatientTab })));
import { cn, formatPhone } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Patient {
  id: string;
  full_name: string;
  phone: string;
  cpf?: string;
  rg?: string;
  email?: string;
  birth_date?: string;
  gender?: string;
  is_foreign?: boolean;
  how_found?: string;
  tags?: string[];
  responsible_name?: string;
  responsible_birth_date?: string;
  responsible_cpf?: string;
  responsible_phone?: string;
  notes?: string;
  created_at?: string;
  address?: string;
  nickname?: string;
  status?: string;
  civil_status?: string;
  education_level?: string;
}

type CadastroSection = "dados" | "contato" | "complementares";

const PatientDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [activeTab, setActiveTab] = useState("orcamentos");
  const [showNovoOrcamento, setShowNovoOrcamento] = useState(false);
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [clinicaId, setClinicaId] = useState<string>("");
  const [activeSection, setActiveSection] = useState<CadastroSection>("dados");

  const dadosRef = useRef<HTMLDivElement>(null);
  const contatoRef = useRef<HTMLDivElement>(null);
  const complementaresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) loadPatient();
  }, [id]);

  useEffect(() => {
    if (activeTab === "orcamentos" && id) loadBudgets();
  }, [activeTab, id]);

  const loadPatient = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      setPatient(data);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("clinic_id")
          .eq("id", user.id)
          .single();
        if (profile) setClinicaId(profile.clinic_id);
      }
    } catch (error: any) {
      console.error("Erro ao carregar paciente:", error);
      toast.error("Erro ao carregar dados do paciente");
      navigate("/dashboard/prontuario");
    } finally {
      setLoading(false);
    }
  };

  const loadBudgets = async () => {
    try {
      setLoadingBudgets(true);
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBudgets(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar orçamentos:", error);
      toast.error("Erro ao carregar orçamentos");
    } finally {
      setLoadingBudgets(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado");
  };

  const handleWhatsApp = () => {
    if (patient?.phone) {
      const phone = patient.phone.replace(/\D/g, "");
      window.open(`https://wa.me/55${phone}`, "_blank");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copiado");
  };

  const scrollToSection = (section: CadastroSection) => {
    setActiveSection(section);
    const refs = { dados: dadosRef, contato: contatoRef, complementares: complementaresRef };
    refs[section]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getCivilStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
      solteiro: "Solteiro(a)", casado: "Casado(a)", divorciado: "Divorciado(a)",
      viuvo: "Viúvo(a)", uniao_estavel: "União Estável"
    };
    return labels[status || ""] || "Não informado";
  };

  const getEducationLabel = (education?: string) => {
    const labels: Record<string, string> = {
      fundamental: "Ensino Fundamental", medio: "Ensino Médio",
      superior: "Ensino Superior", pos_graduacao: "Pós-graduação"
    };
    return labels[education || ""] || "Não informado";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Paciente não encontrado</p>
      </div>
    );
  }

  const patientCode = patient.created_at
    ? new Date(patient.created_at).getTime().toString().slice(-6)
    : "000000";

  const isActive = patient.status !== "inactive";

  const tabItems = [
    { value: "orcamentos", label: "Orçamentos" },
    { value: "financeiro", label: "Financeiro" },
    { value: "odontograma", label: "Odontograma" },
    { value: "tratamentos", label: "Tratamentos" },
    { value: "ortodontia", label: "Ortodontia" },
    { value: "anamnese", label: "Anamnese" },
    { value: "imagens", label: "Imagens" },
    { value: "documentos", label: "Documentos" },
    { value: "agendamentos", label: "Agendamentos" },
  ];

  // Mobile tab items include "cadastro" since the sidebar isn't visible
  const mobileTabItems = [
    { value: "cadastro", label: "Cadastro" },
    ...tabItems,
  ];

  /* ============================================================
   *  DESKTOP: Patient Info Sidebar (left column, always visible)
   * ============================================================ */
  const DesktopPatientSidebar = () => (
    <div className="space-y-4 sticky top-24">
      {/* Avatar + Name Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-20 w-20 mb-3">
              <AvatarFallback className="text-2xl bg-primary/10 text-primary font-semibold">
                {patient!.full_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-h2 text-foreground">{patient!.full_name}</h2>
            <span className="text-body-sm text-muted-foreground mt-0.5">#{patientCode}</span>
            <Badge 
              variant={isActive ? "default" : "secondary"}
              className="mt-2"
            >
              {isActive ? "Ativo" : "Inativo"}
            </Badge>
          </div>

          {/* Quick Actions */}
          <div className="flex justify-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowEditPatient(true)}>
              <Edit className="h-3.5 w-3.5 mr-1.5" /> Editar
            </Button>
            <Button variant="outline" size="sm" onClick={handleWhatsApp}>
              <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> WhatsApp
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Link2 className="h-4 w-4 mr-2" /> Copiar Link
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Printer className="h-4 w-4 mr-2" /> Imprimir
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="text-table-header">CONTATO</h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-body-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{formatPhone(patient!.phone) || "Não informado"}</span>
            </div>
            <div className="flex items-center gap-2.5 text-body-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{patient!.email || "Não informado"}</span>
            </div>
            {patient!.address && (
              <div className="flex items-start gap-2.5 text-body-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span>{patient!.address}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Personal Data */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="text-table-header">DADOS PESSOAIS</h3>
          <div className="space-y-2">
            <InfoRow label="Nascimento" value={
              patient!.birth_date 
                ? `${new Date(patient!.birth_date).toLocaleDateString("pt-BR")} (${calculateAge(patient!.birth_date)} anos)`
                : "Não informado"
            } />
            <InfoRow label="Sexo" value={
              patient!.gender === "masculino" ? "Masculino" : 
              patient!.gender === "feminino" ? "Feminino" : "Não informado"
            } />
            <InfoRow label="CPF" value={patient!.cpf || "Não informado"} />
            <InfoRow label="RG" value={patient!.rg || "Não informado"} />
            <InfoRow label="Estado Civil" value={getCivilStatusLabel(patient!.civil_status)} />
            <InfoRow label="Como conheceu" value={patient!.how_found?.replace("_", " ") || "Não informado"} />
          </div>

          {patient!.tags && patient!.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <span className="text-xs text-muted-foreground block mb-2">Etiquetas</span>
                <div className="flex flex-wrap gap-1.5">
                  {patient!.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {patient!.notes && (
            <>
              <Separator />
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Observações</span>
                <p className="text-body-sm">{patient!.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Responsible */}
      {patient!.responsible_name && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="text-table-header">RESPONSÁVEL</h3>
            <div className="space-y-2">
              <InfoRow label="Nome" value={patient!.responsible_name} />
              {patient!.responsible_cpf && <InfoRow label="CPF" value={patient!.responsible_cpf} />}
              {patient!.responsible_phone && <InfoRow label="Celular" value={formatPhone(patient!.responsible_phone)} />}
              {patient!.responsible_birth_date && (
                <InfoRow label="Nascimento" value={new Date(patient!.responsible_birth_date).toLocaleDateString("pt-BR")} />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* ==================== MOBILE ==================== */}
      {isMobile && (
        <>
          {/* Mobile Header */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden -mx-4 sm:mx-0 mb-4">
            <div className="border-b px-4 py-4">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate("/dashboard/prontuario")} className="p-1.5 -ml-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors" aria-label="Voltar">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <h1 className="text-h2 truncate text-foreground">{patient.full_name}</h1>
                  <p className="text-sm text-muted-foreground tabular-nums">#{patientCode}</p>
                </div>
                <Badge variant={isActive ? "default" : "secondary"} className="shrink-0">{isActive ? "Ativo" : "Inativo"}</Badge>
              </div>
            </div>
            <div className="px-4 py-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">{patient.full_name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="flex-1 min-w-0 h-9" onClick={() => setShowEditPatient(true)}>
                    <Edit className="h-4 w-4 mr-1.5 shrink-0" /><span className="truncate">Editar</span>
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 min-w-0 h-9" onClick={handleWhatsApp}>
                    <MessageCircle className="h-4 w-4 mr-1.5 shrink-0" /><span className="truncate">WhatsApp</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="outline" className="h-9 w-9 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleCopyLink}><Link2 className="h-4 w-4 mr-2" />Copiar Link</DropdownMenuItem>
                      <DropdownMenuItem><Printer className="h-4 w-4 mr-2" />Imprimir</DropdownMenuItem>
                      <DropdownMenuItem><Send className="h-4 w-4 mr-2" />Enviar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" /><span>{formatPhone(patient.phone) || "Não informado"}</span></div>
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0" /><span className="truncate">{patient.email || "Não informado"}</span></div>
              </div>
            </div>
          </div>

          {/* Mobile Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full h-auto p-1 gap-1 flex justify-start overflow-x-auto scrollbar-hide flex-nowrap bg-muted/50 rounded-lg -mx-4 px-4 sm:mx-0 sm:px-1">
              {mobileTabItems.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="flex-shrink-0 rounded-md px-3 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="mt-4">
              <MobileCadastroContent
                patient={patient}
                activeSection={activeSection}
                scrollToSection={scrollToSection}
                setShowEditPatient={setShowEditPatient}
                handleWhatsApp={handleWhatsApp}
                handleCopyCode={handleCopyCode}
                patientCode={patientCode}
                dadosRef={dadosRef}
                contatoRef={contatoRef}
                complementaresRef={complementaresRef}
                getCivilStatusLabel={getCivilStatusLabel}
                getEducationLabel={getEducationLabel}
              />
              <TabsContent value="orcamentos" className="mt-0"><Suspense fallback={<EsqueletoSecao />}>
                {loadingBudgets ? (
                  <EsqueletoSecao />
                ) : (
                  <OrcamentosTab budgets={budgets} onRefresh={loadBudgets} onNewBudget={() => setShowNovoOrcamento(true)} />
                )}
              </Suspense></TabsContent>
              <TabsContent value="tratamentos" className="mt-0"><Suspense fallback={<EsqueletoSecao />}><TratamentosTab patientId={id!} /></Suspense></TabsContent>
              <TabsContent value="anamnese" className="mt-0"><Suspense fallback={<EsqueletoSecao />}><AnamnesesTab patientId={id!} /></Suspense></TabsContent>
              <TabsContent value="imagens" className="mt-0"><Suspense fallback={<EsqueletoSecao />}><ImagensTab patientId={id!} /></Suspense></TabsContent>
              <TabsContent value="documentos" className="mt-0"><Suspense fallback={<EsqueletoSecao />}><DocumentosTab patientId={id!} /></Suspense></TabsContent>
              <TabsContent value="financeiro" className="mt-0"><Suspense fallback={<EsqueletoSecao />}><FinanceiroTab patientId={id!} clinicId={clinicaId} /></Suspense></TabsContent>
              <TabsContent value="odontograma" className="mt-0"><Suspense fallback={<EsqueletoSecao />}><OdontogramaTab patientId={id!} onAddProcedimento={() => setShowNovoOrcamento(true)} /></Suspense></TabsContent>
              <TabsContent value="agendamentos" className="mt-0"><Suspense fallback={<EsqueletoSecao />}><AgendamentosTab patientId={id!} /></Suspense></TabsContent>
              <TabsContent value="ortodontia" className="mt-0"><Suspense fallback={<EsqueletoSecao />}><OrthoPatientTab patientId={id!} /></Suspense></TabsContent>
            </div>
          </Tabs>
        </>
      )}

      {/* ==================== DESKTOP: 2-Column Layout ==================== */}
      {!isMobile && (
        <div className="space-y-4">
          {/* Back button + page title */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/prontuario")} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-h1 text-foreground truncate">{patient.full_name}</h1>
            <span className="text-muted-foreground text-body-sm">#{patientCode}</span>
          </div>

          {/* 2-Column Grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left column - Patient Info (1/3) */}
            <div className="col-span-4 xl:col-span-3">
              <DesktopPatientSidebar />
            </div>

            {/* Right column - Tabs (2/3) */}
            <div className="col-span-8 xl:col-span-9">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="print:hidden w-full h-auto p-1 gap-0.5 flex-nowrap justify-start overflow-x-auto scrollbar-hide bg-muted/50">
                  {tabItems.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
                  ))}
                </TabsList>

                <div className="mt-6">
                  <TabsContent value="orcamentos" className="mt-0"><Suspense fallback={<EsqueletoSecao />}>
                    {loadingBudgets ? (
                      <EsqueletoSecao />
                    ) : (
                      <OrcamentosTab budgets={budgets} onRefresh={loadBudgets} onNewBudget={() => setShowNovoOrcamento(true)} />
                    )}
                  </Suspense></TabsContent>
                  <TabsContent value="financeiro" className="mt-0"><Suspense fallback={<EsqueletoSecao />}><FinanceiroTab patientId={id!} clinicId={clinicaId} /></Suspense></TabsContent>
                  <TabsContent value="odontograma" className="mt-0"><Suspense fallback={<EsqueletoSecao />}><OdontogramaTab patientId={id!} onAddProcedimento={() => setShowNovoOrcamento(true)} /></Suspense></TabsContent>
                  <TabsContent value="tratamentos" className="mt-0"><Suspense fallback={<EsqueletoSecao />}><TratamentosTab patientId={id!} /></Suspense></TabsContent>
                  <TabsContent value="ortodontia" className="mt-0"><Suspense fallback={<EsqueletoSecao />}><OrthoPatientTab patientId={id!} /></Suspense></TabsContent>
                  <TabsContent value="anamnese" className="mt-0"><Suspense fallback={<EsqueletoSecao />}><AnamnesesTab patientId={id!} /></Suspense></TabsContent>
                  <TabsContent value="imagens" className="mt-0"><Suspense fallback={<EsqueletoSecao />}><ImagensTab patientId={id!} /></Suspense></TabsContent>
                  <TabsContent value="documentos" className="mt-0"><Suspense fallback={<EsqueletoSecao />}><DocumentosTab patientId={id!} /></Suspense></TabsContent>
                  <TabsContent value="agendamentos" className="mt-0"><Suspense fallback={<EsqueletoSecao />}><AgendamentosTab patientId={id!} /></Suspense></TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {patient && clinicaId && showNovoOrcamento && (
        <Suspense fallback={null}>
          <NovoOrcamentoModal open={showNovoOrcamento} onOpenChange={setShowNovoOrcamento} patientId={patient.id} clinicaId={clinicaId} onSuccess={loadBudgets} />
        </Suspense>
      )}
      {patient && showEditPatient && (
        <Suspense fallback={null}>
          <EditPatientModal open={showEditPatient} onOpenChange={setShowEditPatient} patient={patient} onSuccess={loadPatient} />
        </Suspense>
      )}
    </div>
  );
};

/* ============================================================
 *  Helper: Info Row for sidebar
 * ============================================================ */
const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-2">
    <span className="text-xs text-muted-foreground shrink-0">{label}</span>
    <span className="text-body-sm text-right truncate first-letter:uppercase">{value}</span>
  </div>
);

/* ============================================================
 *  Mobile Cadastro Tab Content (extracted to keep main clean)
 * ============================================================ */
const MobileCadastroContent = ({
  patient, activeSection, scrollToSection, setShowEditPatient,
  handleWhatsApp, handleCopyCode, patientCode,
  dadosRef, contatoRef, complementaresRef,
  getCivilStatusLabel, getEducationLabel
}: any) => (
  <TabsContent value="cadastro" className="mt-0">
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 -mx-4 px-4 sm:mx-0 sm:px-0">
      {([
        { key: "dados" as CadastroSection, label: "Dados" },
        { key: "contato" as CadastroSection, label: "Contato" },
        { key: "complementares" as CadastroSection, label: "Complementares" },
      ]).map((section) => (
        <button
          key={section.key}
          onClick={() => scrollToSection(section.key)}
          className={cn(
            "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
            activeSection === section.key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
          )}
        >
          {section.label}
        </button>
      ))}
    </div>

    <div className="space-y-4">
      {/* Dados Cadastrais */}
      <Card ref={dadosRef}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-base">Dados Cadastrais</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowEditPatient(true)}>
              <Edit className="h-4 w-4 mr-2" /> Editar
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MobileField label="Nome" value={patient.full_name} />
            <MobileField label="Apelido" value={patient.nickname || "-"} />
            <MobileField label="Nascimento" value={patient.birth_date ? new Date(patient.birth_date).toLocaleDateString("pt-BR") : "-"} />
            <MobileField label="Idade" value={patient.birth_date ? `${Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / 31557600000)} anos` : "-"} />
            <MobileField label="Sexo" value={patient.gender === "masculino" ? "Masculino" : patient.gender === "feminino" ? "Feminino" : "-"} />
            <MobileField label="CPF" value={patient.cpf || "-"} />
            <MobileField label="RG" value={patient.rg || "-"} />
            <MobileField label="Código" value={patientCode} />
          </div>
        </CardContent>
      </Card>

      {/* Contato */}
      <Card ref={contatoRef}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-base">Contato</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowEditPatient(true)}>
              <Edit className="h-4 w-4 mr-2" /> Editar
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MobileField label="Celular" value={formatPhone(patient.phone)} />
            <MobileField label="Email" value={patient.email || "-"} />
            <div className="col-span-2">
              <MobileField label="Endereço" value={patient.address || "-"} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Complementares */}
      <Card ref={complementaresRef}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-base">Dados Complementares</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowEditPatient(true)}>
              <Edit className="h-4 w-4 mr-2" /> Editar
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MobileField label="Estado Civil" value={getCivilStatusLabel(patient.civil_status)} />
            <MobileField label="Escolaridade" value={getEducationLabel(patient.education_level)} />
            <MobileField label="Como conheceu" value={patient.how_found?.replace("_", " ") || "-"} />
            <MobileField label="Cadastrado em" value={patient.created_at ? new Date(patient.created_at).toLocaleDateString("pt-BR") : "-"} />
          </div>
          {patient.tags && patient.tags.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-3 mt-3">
              <span className="text-xs text-muted-foreground block mb-2">Etiquetas</span>
              <div className="flex flex-wrap gap-1.5">
                {patient.tags.map((tag: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
          <div className="bg-muted/30 rounded-lg p-3 mt-3">
            <span className="text-xs text-muted-foreground block mb-0.5">Observações</span>
            <span className="font-medium text-sm">{patient.notes || "Nenhuma observação"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  </TabsContent>
);

const MobileField = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-muted/30 rounded-lg p-3">
    <span className="text-xs text-muted-foreground block mb-0.5">{label}</span>
    <span className="font-medium text-sm truncate block">{value}</span>
  </div>
);

export default PatientDetails;
