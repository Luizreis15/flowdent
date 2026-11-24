import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClinicContext } from "@/hooks/useClinicContext";
import { Skeleton } from "@/components/ui/skeleton";
import RelatorioFilters, { type ReportFilters } from "@/components/relatorios/RelatorioFilters";
import InsightsAutomaticos from "@/components/relatorios/InsightsAutomaticos";
import VisaoGeralTab from "@/components/relatorios/VisaoGeralTab";
import PacientesTab from "@/components/relatorios/PacientesTab";
import ConsultasTab from "@/components/relatorios/ConsultasTab";
import EspecialidadesTab from "@/components/relatorios/EspecialidadesTab";
import DentistasTab from "@/components/relatorios/DentistasTab";
import ComparecimentoTab from "@/components/relatorios/ComparecimentoTab";
import RetencaoTab from "@/components/relatorios/RetencaoTab";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CabecalhoPagina } from "@/components/sistema/CabecalhoPagina";

const Relatorios = () => {
  const { clinicId, isLoading } = useClinicContext();
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    dentistId: null,
    especialidade: null,
    status: null,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!clinicId) {
    return <p className="text-sm text-muted-foreground">Nenhuma clínica encontrada.</p>;
  }

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Relatórios"
        subtitulo={`Fluxo clínico de ${format(filters.startDate, "d 'de' MMM", { locale: ptBR })} a ${format(filters.endDate, "d 'de' MMM 'de' yyyy", { locale: ptBR })}`}
      />

      <RelatorioFilters clinicId={clinicId} filters={filters} onFiltersChange={setFilters} />

      <InsightsAutomaticos clinicId={clinicId} filters={filters} />

      <Tabs defaultValue="visao-geral" className="space-y-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
          <TabsTrigger value="pacientes">Pacientes</TabsTrigger>
          <TabsTrigger value="consultas">Consultas</TabsTrigger>
          <TabsTrigger value="especialidades">Especialidades</TabsTrigger>
          <TabsTrigger value="dentistas">Dentistas</TabsTrigger>
          <TabsTrigger value="comparecimento">Comparecimento</TabsTrigger>
          <TabsTrigger value="retencao">Retenção</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral">
          <VisaoGeralTab clinicId={clinicId} filters={filters} />
        </TabsContent>
        <TabsContent value="pacientes">
          <PacientesTab clinicId={clinicId} filters={filters} />
        </TabsContent>
        <TabsContent value="consultas">
          <ConsultasTab clinicId={clinicId} filters={filters} />
        </TabsContent>
        <TabsContent value="especialidades">
          <EspecialidadesTab clinicId={clinicId} filters={filters} />
        </TabsContent>
        <TabsContent value="dentistas">
          <DentistasTab clinicId={clinicId} filters={filters} />
        </TabsContent>
        <TabsContent value="comparecimento">
          <ComparecimentoTab clinicId={clinicId} filters={filters} />
        </TabsContent>
        <TabsContent value="retencao">
          <RetencaoTab clinicId={clinicId} filters={filters} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Relatorios;
