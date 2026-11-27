import { FaixaIndicadores } from "@/components/sistema/FaixaIndicadores";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { EstadoErro } from "@/components/sistema/EstadoErro";
import { EsqueletoLista } from "@/components/sistema/EsqueletoLista";
import { separarMoeda } from "@/lib/moeda";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, Plus} from "lucide-react";
import { FechamentoComissoesModal } from "./FechamentoComissoesModal";
import { AdiantamentoModal } from "./AdiantamentoModal";
import { formatCurrency } from "@/lib/utils";

interface ComissoesTabProps {
  clinicId: string;
}

export const ComissoesTab = ({ clinicId }: ComissoesTabProps) => {
  const [loading, setLoading] = useState(true);
  const [erroCarregar, setErroCarregar] = useState(false);
  const [provisoes, setProvisoes] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().slice(0, 7));
  const [filtroProfissional, setFiltroProfissional] = useState("todos");
  const [showFechamento, setShowFechamento] = useState(false);
  const [showAdiantamento, setShowAdiantamento] = useState(false);
  const [selectedProvisao, setSelectedProvisao] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [clinicId, filtroMes, filtroProfissional]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErroCarregar(false);

      // Carregar profissionais
      const { data: profsData, error: profsError } = await supabase
        .from("profissionais")
        .select("*")
        .eq("clinica_id", clinicId)
        .eq("ativo", true)
        .order("nome");

      if (profsError) throw profsError;
      setProfissionais(profsData || []);

      // Carregar provisões
      const competenciaInicio = `${filtroMes}-01`;
      let query = supabase
        .from("comissoes_provisoes")
        .select(`
          *,
          profissional:profissionais(nome, email)
        `)
        .eq("clinic_id", clinicId)
        .gte("competencia", competenciaInicio)
        .order("competencia", { ascending: false });

      if (filtroProfissional !== "todos") {
        query = query.eq("profissional_id", filtroProfissional);
      }

      const { data: provisoesData, error: provisoesError } = await query;

      if (provisoesError) throw provisoesError;
      setProvisoes(provisoesData || []);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      setErroCarregar(true);
    } finally {
      setLoading(false);
    }
  };

  const calcularTotais = () => {
    const provisionado = provisoes
      .filter((p) => p.status === "provisionado")
      .reduce((sum, p) => sum + parseFloat(p.valor_provisionado || 0), 0);

    const aprovado = provisoes
      .filter((p) => p.status === "aprovado")
      .reduce((sum, p) => sum + parseFloat(p.valor_devido || 0), 0);

    const pago = provisoes
      .filter((p) => p.status === "pago")
      .reduce((sum, p) => sum + parseFloat(p.valor_liquido_pagar || p.valor_devido || 0), 0);

    return { provisionado, aprovado, pago };
  };

  const { provisionado, aprovado, pago } = calcularTotais();

  const getStatusBadge = (status: string) => {
    const badges = {
      provisionado: "bg-yellow-100 text-yellow-800",
      aprovado: "bg-blue-100 text-blue-800",
      pago: "bg-green-100 text-green-800",
      cancelado: "bg-red-100 text-red-800",
    };
    return badges[status as keyof typeof badges] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      provisionado: "Provisionado",
      aprovado: "Aprovado",
      pago: "Pago",
      cancelado: "Cancelado",
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Competência (Mês/Ano)</label>
          <input
            type="month"
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Profissional</label>
          <Select value={filtroProfissional} onValueChange={setFiltroProfissional}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {profissionais.map((prof) => (
                <SelectItem key={prof.id} value={prof.id}>
                  {prof.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 items-end">
          <Button
            onClick={() => setShowAdiantamento(true)}
            variant="outline"
            className="h-10"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adiantamento
          </Button>
          <Button
            onClick={() => setShowFechamento(true)}
            className="h-10 bg-primary hover:bg-primary-hover"
          >
            Fechar Competência
          </Button>
        </div>
      </div>

      <FaixaIndicadores
        itens={[
          { rotulo: "Provisionado", ...separarMoeda(formatCurrency(provisionado)), nota: "Aguardando fechamento" },
          { rotulo: "Aprovado", ...separarMoeda(formatCurrency(aprovado)), nota: "Aguardando pagamento" },
          { rotulo: "Pago", ...separarMoeda(formatCurrency(pago)), nota: "Pagamentos realizados" },
        ]}
      />

      {/* Tabela de Provisões */}
      <div className="border rounded-lg bg-card">
        {erroCarregar ? (
          <EstadoErro titulo="Não foi possível carregar as comissões" onTentarDeNovo={loadData} />
        ) : loading ? (
          <EsqueletoLista linhas={6} colunas={3} className="rounded-none border-0" />
        ) : provisoes.length === 0 ? (
          (
            <EstadoVazio icone={DollarSign} titulo="Nenhuma provisão no período" descricao="Selecione outro mês ou profissional." />
          )
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competência</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead className="text-right">Provisionado</TableHead>
                <TableHead className="text-right">A Pagar</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {provisoes.map((provisao) => (
                <TableRow key={provisao.id}>
                  <TableCell>
                    {new Date(provisao.competencia).toLocaleDateString("pt-BR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>{provisao.profissional?.nome}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(parseFloat(provisao.valor_provisionado || 0))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(parseFloat(provisao.valor_devido || 0))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(parseFloat(provisao.valor_liquido_pagar || provisao.valor_devido || 0))}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(provisao.status)}`}>
                      {getStatusLabel(provisao.status)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedProvisao(provisao);
                        setShowFechamento(true);
                      }}
                    >
                      Ver Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {showFechamento && (
        <FechamentoComissoesModal
          open={showFechamento}
          onClose={() => {
            setShowFechamento(false);
            setSelectedProvisao(null);
            loadData();
          }}
          clinicId={clinicId}
          provisao={selectedProvisao}
          mesCompetencia={filtroMes}
        />
      )}

      {showAdiantamento && (
        <AdiantamentoModal
          open={showAdiantamento}
          onClose={() => {
            setShowAdiantamento(false);
            loadData();
          }}
          clinicId={clinicId}
          profissionais={profissionais}
        />
      )}
    </div>
  );
};