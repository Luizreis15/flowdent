import { Routes, Route, Navigate } from "react-router-dom";
import { isAppDomain } from "@/config/domains";
import { lazy, Suspense } from "react";
import MobileHomeSkeleton from "@/components/mobile/MobileHomeSkeleton";
import ProtectedRoute from "@/components/ProtectedRoute";
import SubscriptionGuard from "@/components/SubscriptionGuard";

// Lightweight loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Site Pages (lazy)
const Landing = lazy(() => import("@/pages/Landing"));
const Precos = lazy(() => import("@/pages/Precos"));
const AgendaRecurso = lazy(() => import("@/pages/recursos/Agenda"));
const ProntuarioRecurso = lazy(() => import("@/pages/recursos/Prontuario"));
const DocumentosRecurso = lazy(() => import("@/pages/recursos/Documentos"));
const FinanceiroRecurso = lazy(() => import("@/pages/recursos/Financeiro"));
const Termos = lazy(() => import("@/pages/Termos"));
const Privacidade = lazy(() => import("@/pages/Privacidade"));
const AdminAuth = lazy(() => import("@/pages/admin/AdminAuth"));
const AdminLayout = lazy(() => import("@/components/AdminLayout"));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/Users"));
const AdminClinics = lazy(() => import("@/pages/admin/Clinics"));
const AdminLeads = lazy(() => import("@/pages/admin/Leads"));
const AdminMarketing = lazy(() => import("@/pages/admin/Marketing"));
const AdminSubscriptions = lazy(() => import("@/pages/admin/Subscriptions"));
const AdminModules = lazy(() => import("@/pages/admin/Modules"));
const AdminAudit = lazy(() => import("@/pages/admin/Audit"));

// App Pages (lazy)
const Auth = lazy(() => import("@/pages/Auth"));
const Cadastro = lazy(() => import("@/pages/Cadastro"));
const Index = lazy(() => import("@/pages/Index"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Welcome = lazy(() => import("@/pages/onboarding/Welcome"));
const Tipo = lazy(() => import("@/pages/onboarding/Tipo"));
const Clinica = lazy(() => import("@/pages/onboarding/Clinica"));
const Profissional = lazy(() => import("@/pages/onboarding/Profissional"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const AgendaWrapper = lazy(() => import("@/pages/dashboard/AgendaWrapper"));
const ProntuarioWrapper = lazy(() => import("@/pages/dashboard/ProntuarioWrapper"));
const PatientDetails = lazy(() => import("@/pages/dashboard/PatientDetails"));
const FinanceiroWrapper = lazy(() => import("@/pages/dashboard/FinanceiroWrapper"));
const CRMWrapper = lazy(() => import("@/pages/dashboard/CRMWrapper"));
const CRMAtendimentoWrapper = lazy(() => import("@/pages/dashboard/CRMAtendimentoWrapper"));
const PortalPacienteWrapper = lazy(() => import("@/pages/dashboard/PortalPacienteWrapper"));
const PortalAuth = lazy(() => import("@/pages/portal/PortalAuth"));
const PortalDashboard = lazy(() => import("@/pages/portal/PortalDashboard"));
const IAAssistenteWrapper = lazy(() => import("@/pages/dashboard/IAAssistenteWrapper"));
const ProtesesWrapper = lazy(() => import("@/pages/dashboard/ProtesesWrapper"));
const OrtodontiaWrapper = lazy(() => import("@/pages/dashboard/OrtodontiaWrapper"));
const EstoqueWrapper = lazy(() => import("@/pages/dashboard/EstoqueWrapper"));
const ProdutosWrapper = lazy(() => import("@/pages/dashboard/ProdutosWrapper"));
const MovimentacoesWrapper = lazy(() => import("@/pages/dashboard/MovimentacoesWrapper"));
const PerfilWrapper = lazy(() => import("@/pages/dashboard/PerfilWrapper"));
const ConfiguracoesWrapper = lazy(() => import("@/pages/dashboard/ConfiguracoesWrapper"));
const AssinaturaWrapper = lazy(() => import("@/pages/dashboard/AssinaturaWrapper"));
const RelatoriosWrapper = lazy(() => import("@/pages/dashboard/RelatoriosWrapper"));
const SuperAdminDashboardWrapper = lazy(() => import("@/pages/superadmin/DashboardWrapper"));
const GlobalAnamneseWrapper = lazy(() => import("@/pages/superadmin/GlobalAnamneseWrapper"));
const PlanosWrapper = lazy(() => import("@/pages/superadmin/PlanosWrapper"));
const ModulosWrapper = lazy(() => import("@/pages/superadmin/ModulosWrapper"));
const LocatariosWrapper = lazy(() => import("@/pages/superadmin/LocatariosWrapper"));
const AuditoriaWrapper = lazy(() => import("@/pages/superadmin/AuditoriaWrapper"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Rotas do Site (flowdent.com.br)
function SiteRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/precos" element={<Precos />} />
        <Route path="/recursos/agenda" element={<AgendaRecurso />} />
        <Route path="/recursos/prontuario" element={<ProntuarioRecurso />} />
        <Route path="/recursos/documentos" element={<DocumentosRecurso />} />
        <Route path="/recursos/financeiro" element={<FinanceiroRecurso />} />
        <Route path="/termos" element={<Termos />} />
        <Route path="/privacidade" element={<Privacidade />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminAuth />} />
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/clinics" element={<AdminClinics />} />
          <Route path="/admin/leads" element={<AdminLeads />} />
          <Route path="/admin/marketing" element={<AdminMarketing />} />
          <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
          <Route path="/admin/modules" element={<AdminModules />} />
          <Route path="/admin/audit" element={<AdminAudit />} />
        </Route>
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

// Rotas do App (app.flowdent.com.br)
function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to={`/auth${window.location.hash}`} replace />} />
        
        <Route path="/old-dashboard" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/onboarding/welcome" element={<Welcome />} />
        <Route path="/onboarding/tipo" element={<Tipo />} />
        <Route path="/onboarding/clinica" element={<Clinica />} />
        <Route path="/onboarding/profissional" element={<Profissional />} />
        {/* Protected Dashboard Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><SubscriptionGuard><Dashboard /></SubscriptionGuard></ProtectedRoute>} />
        <Route path="/dashboard/agenda" element={<ProtectedRoute><SubscriptionGuard><AgendaWrapper /></SubscriptionGuard></ProtectedRoute>} />
        <Route path="/dashboard/prontuario" element={<ProtectedRoute><SubscriptionGuard><ProntuarioWrapper /></SubscriptionGuard></ProtectedRoute>} />
        <Route path="/dashboard/prontuario/:id" element={<ProtectedRoute><SubscriptionGuard><PatientDetails /></SubscriptionGuard></ProtectedRoute>} />
        <Route path="/dashboard/financeiro" element={<ProtectedRoute requiredPermission="financeiro.visualizar"><SubscriptionGuard><FinanceiroWrapper /></SubscriptionGuard></ProtectedRoute>} />
        <Route path="/dashboard/crm" element={<ProtectedRoute requiredPermission="crm.visualizar"><SubscriptionGuard><CRMWrapper /></SubscriptionGuard></ProtectedRoute>} />
        <Route path="/dashboard/crm/atendimento" element={<ProtectedRoute><SubscriptionGuard><CRMAtendimentoWrapper /></SubscriptionGuard></ProtectedRoute>} />
        <Route path="/dashboard/portal-paciente" element={<ProtectedRoute requiredPermission="portal_paciente.visualizar"><SubscriptionGuard><PortalPacienteWrapper /></SubscriptionGuard></ProtectedRoute>} />
        <Route path="/dashboard/ia-assistente" element={<ProtectedRoute requiredPermission="ia_assistente.visualizar"><SubscriptionGuard><IAAssistenteWrapper /></SubscriptionGuard></ProtectedRoute>} />
        <Route path="/dashboard/proteses" element={<ProtectedRoute requiredPermission="proteses.visualizar"><SubscriptionGuard><ProtesesWrapper /></SubscriptionGuard></ProtectedRoute>} />
        <Route path="/dashboard/ortodontia" element={<ProtectedRoute requiredPermission="ortodontia.visualizar"><SubscriptionGuard><OrtodontiaWrapper /></SubscriptionGuard></ProtectedRoute>} />
        <Route path="/dashboard/estoque" element={<ProtectedRoute requiredPermission="estoque.visualizar"><SubscriptionGuard><EstoqueWrapper /></SubscriptionGuard></ProtectedRoute>} />
        <Route path="/dashboard/produtos" element={<ProtectedRoute requiredPermission="estoque.visualizar"><SubscriptionGuard><ProdutosWrapper /></SubscriptionGuard></ProtectedRoute>} />
        <Route path="/dashboard/movimentacoes" element={<ProtectedRoute requiredPermission="estoque.visualizar"><SubscriptionGuard><MovimentacoesWrapper /></SubscriptionGuard></ProtectedRoute>} />
        <Route path="/dashboard/perfil" element={<ProtectedRoute><PerfilWrapper /></ProtectedRoute>} />
        <Route path="/dashboard/assinatura" element={<ProtectedRoute><AssinaturaWrapper /></ProtectedRoute>} />
        <Route path="/dashboard/configuracoes" element={<ProtectedRoute requiredPermission="configuracoes.visualizar"><SubscriptionGuard><ConfiguracoesWrapper /></SubscriptionGuard></ProtectedRoute>} />
        <Route path="/dashboard/relatorios" element={<ProtectedRoute requiredPermission="relatorios.visualizar"><SubscriptionGuard><RelatoriosWrapper /></SubscriptionGuard></ProtectedRoute>} />
        
        {/* Super Admin Routes */}
        <Route path="/super-admin" element={<ProtectedRoute requiredRole={["super_admin"]}><SuperAdminDashboardWrapper /></ProtectedRoute>} />
        <Route path="/super-admin/planos" element={<ProtectedRoute requiredRole={["super_admin"]}><PlanosWrapper /></ProtectedRoute>} />
        <Route path="/super-admin/modulos" element={<ProtectedRoute requiredRole={["super_admin"]}><ModulosWrapper /></ProtectedRoute>} />
        <Route path="/super-admin/anamnese" element={<ProtectedRoute requiredRole={["super_admin"]}><GlobalAnamneseWrapper /></ProtectedRoute>} />
        <Route path="/super-admin/locatarios" element={<ProtectedRoute requiredRole={["super_admin"]}><LocatariosWrapper /></ProtectedRoute>} />
        <Route path="/super-admin/auditoria" element={<ProtectedRoute requiredRole={["super_admin"]}><AuditoriaWrapper /></ProtectedRoute>} />
        
        {/* Portal do Paciente */}
        <Route path="/portal/auth" element={<PortalAuth />} />
        <Route path="/portal/dashboard" element={<PortalDashboard />} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function DomainRouter() {
  if (isAppDomain()) {
    return <AppRoutes />;
  }
  
  return <SiteRoutes />;
}
