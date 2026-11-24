import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Smartphone } from "lucide-react";

interface TipoReceituarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTipo: (tipo: "impresso" | "digital") => void;
}

export const TipoReceituarioModal = ({
  open,
  onOpenChange,
  onSelectTipo,
}: TipoReceituarioModalProps) => {
  const handleSelect = (tipo: "impresso" | "digital") => {
    onSelectTipo(tipo);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecione o tipo de receituário:</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-6">
          {/* Receituário Impresso */}
          <button
            onClick={() => handleSelect("impresso")}
            className="flex flex-col items-center gap-4 p-6 border rounded-md hover:border-primary/50 hover:bg-acao-tenue transition-colors duration-150 group"
          >
            <div className="p-3 rounded-md bg-acao-tenue">
              <Printer className="h-8 w-8 text-acao" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-2">Receituário impresso</h3>
              <p className="text-sm text-muted-foreground">
                A forma tradicional do Simples Dental, você imprime e assina à caneta.
              </p>
            </div>
          </button>

          {/* Receituário Digital */}
          <button
            onClick={() => handleSelect("digital")}
            className="flex flex-col items-center gap-4 p-6 border rounded-md hover:border-primary/50 hover:bg-acao-tenue transition-colors duration-150 group"
          >
            <div className="p-3 rounded-md bg-acento-100">
              <Smartphone className="h-8 w-8 text-acento-700" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-2">Receituário digital</h3>
              <p className="text-sm text-muted-foreground">
                A receita fornecida pela Memed, assine com um Certificado Digital.
              </p>
            </div>
          </button>
        </div>

        <div className="text-center text-sm text-muted-foreground border-t pt-4">
          Saiba mais sobre{" "}
          <a href="#" className="text-primary hover:underline">
            Receituários
          </a>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};