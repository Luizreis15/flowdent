import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingDown, Target, MessageSquare, FileText, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const IAAssistente = () => {
  const insights = [
    {
      type: "prediction",
      title: "Risco de Falta - Maria Silva",
      description: "Alta probabilidade de falta na consulta de amanhã às 14h",
      confidence: 85,
      action: "Enviar lembrete adicional",
      priority: "high",
    },
    {
      type: "campaign",
      title: "Pacientes Inativos - Março",
      description: "32 pacientes sem consulta há mais de 6 meses",
      confidence: 92,
      action: "Sugerir campanha de recall",
      priority: "medium",
    },
    {
      type: "optimization",
      title: "Otimização de Agenda",
      description: "Encaixe possível às 15:30 para procedimento rápido",
      confidence: 78,
      action: "Visualizar horários",
      priority: "low",
    },
  ];

  const automations = [
    {
      name: "Preenchimento de Prontuário",
      description: "IA sugere diagnósticos e observações baseadas em histórico",
      status: "active",
      usageCount: 156,
    },
    {
      name: "Previsão de Cancelamentos",
      description: "Analisa padrões para prever faltas e cancelamentos",
      status: "active",
      usageCount: 89,
    },
    {
      name: "Campanhas Inteligentes",
      description: "Sugere melhor momento para contactar cada paciente",
      status: "active",
      usageCount: 234,
    },
    {
      name: "Lembretes Personalizados",
      description: "Gera mensagens personalizadas para cada paciente",
      status: "beta",
      usageCount: 67,
    },
  ];

  const priorityColors = {
    high: "bg-destructive/10 text-destructive border-destructive/20",
    medium: "bg-primary/10 text-primary border-primary/20",
    low: "bg-secondary/10 text-secondary border-secondary/20",
  };

  const priorityLabels = {
    high: "Alta Prioridade",
    medium: "Média Prioridade",
    low: "Baixa Prioridade",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            IA Assistente Odontológica
          </h1>
          <p className="text-muted-foreground mt-1">
            Inteligência artificial para otimizar gestão e relacionamento
          </p>
        </div>
        <Button size="sm" variant="outline">
          Configurar IA
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Insights Gerados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">127</div>
            <p className="text-xs text-muted-foreground mt-1">Este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Acerto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-secondary">91%</div>
            <p className="text-xs text-muted-foreground mt-1">Previsões corretas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tempo Economizado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">24h</div>
            <p className="text-xs text-muted-foreground mt-1">Este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Automações Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">8</div>
            <p className="text-xs text-muted-foreground mt-1">Funcionando</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-hero border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
            <CardTitle className="text-primary-foreground">Insights Recentes</CardTitle>
          </div>
          <CardDescription className="text-primary-foreground/80">
            Sugestões e previsões da IA para melhorar sua gestão
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-lg bg-card border-2 shadow-md"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 flex-shrink-0">
                  {insight.type === "prediction" && <TrendingDown className="h-6 w-6 text-primary" />}
                  {insight.type === "campaign" && <Target className="h-6 w-6 text-primary" />}
                  {insight.type === "optimization" && <Sparkles className="h-6 w-6 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-foreground">{insight.title}</p>
                    <Badge
                      className={priorityColors[insight.priority as keyof typeof priorityColors]}
                    >
                      {priorityLabels[insight.priority as keyof typeof priorityLabels]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {insight.description}
                  </p>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">
                      Confiança: {insight.confidence}%
                    </span>
                    <Button size="sm" variant="outline">
                      {insight.action}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automações Inteligentes</CardTitle>
          <CardDescription>
            Recursos de IA disponíveis no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {automations.map((automation, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:border-foreground/30 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{automation.name}</p>
                    <Badge
                      variant={automation.status === "active" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {automation.status === "active" ? "Ativo" : "Beta"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {automation.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Usado {automation.usageCount}x este mês
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              <CardTitle className="text-lg">Previsão de Faltas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">8</div>
            <p className="text-sm text-muted-foreground">
              Pacientes com alto risco de falta nos próximos 7 dias
            </p>
            <Button variant="outline" size="sm" className="mt-4 w-full">
              Ver Lista Completa
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Pacientes Inativos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">32</div>
            <p className="text-sm text-muted-foreground">
              Pacientes sem consulta há mais de 6 meses
            </p>
            <Button variant="outline" size="sm" className="mt-4 w-full">
              Criar Campanha
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-secondary" />
              <CardTitle className="text-lg">Mensagens Sugeridas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">45</div>
            <p className="text-sm text-muted-foreground">
              Mensagens personalizadas prontas para envio
            </p>
            <Button variant="outline" size="sm" className="mt-4 w-full">
              Revisar Mensagens
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IAAssistente;