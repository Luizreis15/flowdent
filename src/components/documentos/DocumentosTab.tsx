import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, ScanLine } from "lucide-react";
import { NovoDocumentoModal } from "./NovoDocumentoModal";
import { NovoContratoModal } from "./NovoContratoModal";
import { HistoricoDocumentosModal } from "./HistoricoDocumentosModal";
import { TipoReceituarioModal } from "./TipoReceituarioModal";
import { NovoReceituarioModal } from "./NovoReceituarioModal";
import { TipoAtestadoModal } from "./TipoAtestadoModal";
import { NovoAtestadoModal } from "./NovoAtestadoModal";
import { NovoSolicitacaoExameModal } from "./NovoSolicitacaoExameModal";

interface DocumentosTabProps {
  patientId: string;
}

const documentTypes = [
  {
    type: "contrato",
    title: "Contrato",
    color: "bg-emerald-500",
    icon: FileText,
  },
  {
    type: "termo_consentimento",
    title: "Termo de Consentimento",
    color: "bg-amber-500",
    icon: FileText,
  },
  {
    type: "receituario",
    title: "Receituário",
    color: "bg-blue-500",
    icon: FileText,
  },
  {
    type: "atestado",
    title: "Atestados",
    color: "bg-green-500",
    icon: FileText,
  },
  {
    type: "solicitacao_exame",
    title: "Solicitação de Exame",
    color: "bg-cyan-600",
    icon: ScanLine,
  },
];

export const DocumentosTab = ({ patientId }: DocumentosTabProps) => {
  const [novoDocumentoOpen, setNovoDocumentoOpen] = useState(false);
  const [novoContratoOpen, setNovoContratoOpen] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [tipoReceituarioOpen, setTipoReceituarioOpen] = useState(false);
  const [novoReceituarioOpen, setNovoReceituarioOpen] = useState(false);
  const [tipoAtestadoOpen, setTipoAtestadoOpen] = useState(false);
  const [novoAtestadoOpen, setNovoAtestadoOpen] = useState(false);
  const [novoSolicitacaoExameOpen, setNovoSolicitacaoExameOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [tipoReceituario, setTipoReceituario] = useState<"impresso" | "digital" | null>(null);
  const [tipoAtestado, setTipoAtestado] = useState<"impresso" | "digital" | null>(null);

  const handleNovoClick = (type: string) => {
    setSelectedDocType(type);
    if (type === "contrato") {
      setNovoContratoOpen(true);
    } else if (type === "receituario") {
      setTipoReceituarioOpen(true);
    } else if (type === "atestado") {
      setTipoAtestadoOpen(true);
    } else if (type === "solicitacao_exame") {
      setNovoSolicitacaoExameOpen(true);
    } else {
      setNovoDocumentoOpen(true);
    }
  };

  const handleSelectTipoReceituario = (tipo: "impresso" | "digital") => {
    setTipoReceituario(tipo);
    setNovoReceituarioOpen(true);
  };

  const handleSelectTipoAtestado = (tipo: "impresso" | "digital") => {
    setTipoAtestado(tipo);
    setNovoAtestadoOpen(true);
  };

  const handleHistoricoClick = (type: string) => {
    setSelectedDocType(type);
    setHistoricoOpen(true);
  };

  const handlePersonalizadoClick = () => {
    setSelectedDocType("personalizado");
    setNovoDocumentoOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documentTypes.map((doc) => (
          <Card key={doc.type} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
              <div className={`${doc.color} rounded-lg p-6 text-white`}>
                <doc.icon className="h-12 w-12" />
              </div>
              
              <h3 className="font-semibold text-lg">{doc.title}</h3>
              
              <div className="w-full space-y-2">
                <Button
                  className="w-full"
                  onClick={() => handleNovoClick(doc.type)}
                >
                  NOVO
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleHistoricoClick(doc.type)}
                >
                  VER HISTÓRICO
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Card Personalizado */}
        <Card className="hover:shadow-md transition-shadow border-2 border-dashed">
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
            <div className="rounded-lg p-6 border-2 border-dashed border-muted-foreground/30 text-muted-foreground">
              <Plus className="h-12 w-12" />
            </div>
            
            <h3 className="font-semibold text-lg">Personalizado</h3>
            
            <div className="w-full space-y-2">
              <Button
                className="w-full"
                onClick={handlePersonalizadoClick}
              >
                NOVO
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleHistoricoClick("personalizado")}
              >
                VER HISTÓRICO
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <NovoDocumentoModal
        open={novoDocumentoOpen}
        onOpenChange={setNovoDocumentoOpen}
        patientId={patientId}
        documentType={selectedDocType}
      />

      <NovoContratoModal
        open={novoContratoOpen}
        onOpenChange={setNovoContratoOpen}
        patientId={patientId}
      />

      <TipoReceituarioModal
        open={tipoReceituarioOpen}
        onOpenChange={setTipoReceituarioOpen}
        onSelectTipo={handleSelectTipoReceituario}
      />

      <NovoReceituarioModal
        open={novoReceituarioOpen}
        onOpenChange={(open) => {
          setNovoReceituarioOpen(open);
          if (!open) {
            setTipoReceituario(null);
          }
        }}
        patientId={patientId}
        tipo={tipoReceituario}
      />

      <TipoAtestadoModal
        open={tipoAtestadoOpen}
        onOpenChange={setTipoAtestadoOpen}
        onSelectTipo={handleSelectTipoAtestado}
      />

      <NovoAtestadoModal
        open={novoAtestadoOpen}
        onOpenChange={(open) => {
          setNovoAtestadoOpen(open);
          if (!open) {
            setTipoAtestado(null);
          }
        }}
        patientId={patientId}
        tipo={tipoAtestado}
      />

      <NovoSolicitacaoExameModal
        open={novoSolicitacaoExameOpen}
        onOpenChange={setNovoSolicitacaoExameOpen}
        patientId={patientId}
      />

      <HistoricoDocumentosModal
        open={historicoOpen}
        onOpenChange={setHistoricoOpen}
        patientId={patientId}
        documentType={selectedDocType}
      />
    </>
  );
};
