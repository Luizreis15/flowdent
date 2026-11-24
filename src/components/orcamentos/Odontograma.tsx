import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface OdontogramaProps {
  dentesSelecionados: string[];
  onDentesChange: (dentes: string[]) => void;
  statusDentes?: Record<string, string>;
}

const DENTES_PERMANENTES = {
  superior: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  inferior: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
};

const DENTES_DECIDUOS = {
  superior: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
  inferior: [85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
};

const ToothIcon = ({ selected, onClick, status }: { selected: boolean; onClick: () => void; status?: string }) => {
  const getStatusColor = () => {
    if (selected) return "fill-primary stroke-primary";
    switch (status) {
      case "completed": return "fill-[hsl(var(--success-green))] stroke-[hsl(var(--success-green))]";
      case "in_progress": return "fill-[hsl(var(--warning-amber))] stroke-[hsl(var(--warning-amber))]";
      case "pending": return "fill-muted-foreground/40 stroke-muted-foreground/50";
      default: return "fill-background stroke-muted-foreground";
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-7 h-9 sm:w-8 sm:h-10 transition-all press-scale flex-shrink-0",
        selected && "scale-110"
      )}
    >
      <svg
        viewBox="0 0 24 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "w-full h-full transition-all",
          selected ? "drop-shadow-lg" : "opacity-70 hover:opacity-100"
        )}
      >
        <path
          d="M12 2C8 2 4 4 4 8C4 10 4 14 4 18C4 22 6 30 12 30C18 30 20 22 20 18C20 14 20 10 20 8C20 4 16 2 12 2Z"
          className={cn("transition-all", getStatusColor())}
          strokeWidth="2"
        />
        <path
          d="M10 8C10 8 10 12 10 14M14 8C14 8 14 12 14 14"
          className={cn(
            "transition-all",
            selected ? "stroke-primary-foreground" : "stroke-muted-foreground"
          )}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
};

export const Odontograma = ({ dentesSelecionados, onDentesChange, statusDentes }: OdontogramaProps) => {
  const [activeTab, setActiveTab] = useState("permanentes");

  const toggleDente = (dente: number) => {
    const denteStr = dente.toString();
    if (dentesSelecionados.includes(denteStr)) {
      onDentesChange(dentesSelecionados.filter(d => d !== denteStr));
    } else {
      onDentesChange([...dentesSelecionados, denteStr]);
    }
  };

  const selecionarRegiao = (regiao: string) => {
    let novosDentes: string[] = [];
    switch (regiao) {
      case "maxila":
        novosDentes = DENTES_PERMANENTES.superior.map(d => d.toString()); break;
      case "mandibula":
        novosDentes = DENTES_PERMANENTES.inferior.map(d => d.toString()); break;
      case "face":
        novosDentes = [
          ...DENTES_PERMANENTES.superior.filter(d => d >= 11 && d <= 13 || d >= 21 && d <= 23),
          ...DENTES_PERMANENTES.inferior.filter(d => d >= 31 && d <= 33 || d >= 41 && d <= 43),
        ].map(d => d.toString()); break;
      case "arcada_superior":
        novosDentes = DENTES_PERMANENTES.superior.map(d => d.toString()); break;
      case "arcada_inferior":
        novosDentes = DENTES_PERMANENTES.inferior.map(d => d.toString()); break;
      case "arcadas":
        novosDentes = [...DENTES_PERMANENTES.superior, ...DENTES_PERMANENTES.inferior].map(d => d.toString()); break;
    }

    const todosJaSelecionados = novosDentes.every(d => dentesSelecionados.includes(d));
    if (todosJaSelecionados) {
      onDentesChange(dentesSelecionados.filter(d => !novosDentes.includes(d)));
    } else {
      onDentesChange(Array.from(new Set([...dentesSelecionados, ...novosDentes])));
    }
  };

  const limparSelecao = () => onDentesChange([]);

  const renderDentes = (dentes: number[]) => (
    <div className="space-y-2">
      {/* Horizontal scrollable container for teeth */}
      <div className="overflow-x-auto scrollbar-hide -mx-2 px-2">
        <div className="flex gap-0.5 sm:gap-1 justify-center min-w-fit">
          {dentes.map(dente => (
            <div key={dente} className="flex flex-col items-center flex-shrink-0">
              <span className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">{dente}</span>
              <ToothIcon
                selected={dentesSelecionados.includes(dente.toString())}
                onClick={() => toggleDente(dente)}
                status={statusDentes?.[dente.toString()]}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 border rounded-lg p-3 sm:p-4 bg-muted/20 overflow-hidden">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm sm:text-base">Selecionar Dente/Região</h4>
        {dentesSelecionados.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={limparSelecao} className="text-xs h-8">
            Limpar ({dentesSelecionados.length})
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-10">
          <TabsTrigger value="permanentes" className="text-xs sm:text-sm">Permanentes</TabsTrigger>
          <TabsTrigger value="deciduos" className="text-xs sm:text-sm">Decíduos</TabsTrigger>
          <TabsTrigger value="hof" className="text-xs sm:text-sm">HOF</TabsTrigger>
        </TabsList>

        <TabsContent value="permanentes" className="space-y-4 mt-3">
          <div className="space-y-3">
            {renderDentes(DENTES_PERMANENTES.superior)}
            <div className="border-t" />
            {renderDentes(DENTES_PERMANENTES.inferior)}
          </div>
          <div className="flex flex-wrap gap-2 pt-3 border-t">
            {["Maxila", "Mandíbula", "Face", "Arcada superior", "Arcada inferior", "Arcadas"].map((label) => (
              <Button
                key={label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selecionarRegiao(label.toLowerCase().replace("í", "i").replace(" ", "_"))}
                className="text-xs h-8"
              >
                {label}
              </Button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="deciduos" className="space-y-4 mt-3">
          <div className="space-y-3">
            {renderDentes(DENTES_DECIDUOS.superior)}
            <div className="border-t" />
            {renderDentes(DENTES_DECIDUOS.inferior)}
          </div>
          <div className="flex flex-wrap gap-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" className="text-xs h-8"
              onClick={() => {
                const d = DENTES_DECIDUOS.superior.map(d => d.toString());
                const all = d.every(x => dentesSelecionados.includes(x));
                onDentesChange(all ? dentesSelecionados.filter(x => !d.includes(x)) : Array.from(new Set([...dentesSelecionados, ...d])));
              }}>Arcada superior</Button>
            <Button type="button" variant="outline" size="sm" className="text-xs h-8"
              onClick={() => {
                const d = DENTES_DECIDUOS.inferior.map(d => d.toString());
                const all = d.every(x => dentesSelecionados.includes(x));
                onDentesChange(all ? dentesSelecionados.filter(x => !d.includes(x)) : Array.from(new Set([...dentesSelecionados, ...d])));
              }}>Arcada inferior</Button>
            <Button type="button" variant="outline" size="sm" className="text-xs h-8"
              onClick={() => {
                const d = [...DENTES_DECIDUOS.superior, ...DENTES_DECIDUOS.inferior].map(d => d.toString());
                const all = d.every(x => dentesSelecionados.includes(x));
                onDentesChange(all ? dentesSelecionados.filter(x => !d.includes(x)) : Array.from(new Set([...dentesSelecionados, ...d])));
              }}>Arcadas</Button>
          </div>
        </TabsContent>

        <TabsContent value="hof" className="space-y-3 mt-3">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Hemisfério Orofacial - Seleção rápida
          </p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {[
              { label: "Maxila", sub: "Arcada superior completa", region: "maxila" },
              { label: "Mandíbula", sub: "Arcada inferior completa", region: "mandibula" },
              { label: "Face", sub: "Dentes anteriores", region: "face" },
              { label: "Arcadas", sub: "Todos os dentes", region: "arcadas" },
            ].map((item) => (
              <Button
                key={item.region}
                type="button"
                variant="outline"
                onClick={() => selecionarRegiao(item.region)}
                className="h-16 sm:h-20 flex flex-col items-center justify-center"
              >
                <div className="font-semibold text-sm">{item.label}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">{item.sub}</div>
              </Button>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {dentesSelecionados.length > 0 && (
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-2">Selecionados:</p>
          <div className="flex flex-wrap gap-1.5">
            {dentesSelecionados.sort((a, b) => parseInt(a) - parseInt(b)).map(dente => (
              <span
                key={dente}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium"
              >
                {dente}
                <button
                  type="button"
                  onClick={() => toggleDente(parseInt(dente))}
                  className="hover:bg-primary/20 rounded-full p-0.5 min-h-0 min-w-0"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
