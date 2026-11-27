import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, User, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";

const Tipo = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<"clinica" | "liberal" | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    
    if (selected === "clinica") {
      navigate("/onboarding/clinica");
    } else {
      navigate("/onboarding/profissional?tipo=liberal");
    }
  };

  const options = [
    {
      type: "clinica" as const,
      icon: Building2,
      title: "Clínica ou Consultório",
      description: "Tenho uma clínica com múltiplos profissionais ou quero gerenciar uma equipe",
      benefits: [
        "Múltiplos dentistas",
        "Gestão de equipe",
        "Controle de recepção",
        "Relatórios consolidados",
      ],
    },
    {
      type: "liberal" as const,
      icon: User,
      title: "Profissional Liberal",
      description: "Atuo de forma independente ou tenho consultório individual",
      benefits: [
        "Gestão simplificada",
        "Foco no atendimento",
        "Agenda pessoal",
        "Sem burocracia",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto space-y-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/onboarding/welcome")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Qual é o seu perfil de operação?</h1>
            <p className="text-muted-foreground">
              Escolha a opção que melhor descreve como você trabalha
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {options.map((option) => (
              <Card
                key={option.type}
                className={`cursor-pointer transition-colors hover:border-foreground/30 ${
                  selected === option.type
                    ? "border-primary border-2 shadow-lg"
                    : ""
                }`}
                onClick={() => setSelected(option.type)}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <option.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl">{option.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {option.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Ideal para:</p>
                    <ul className="space-y-1">
                      {option.benefits.map((benefit, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={handleContinue}
              disabled={!selected}
              className="px-12"
            >
              Continuar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tipo;
