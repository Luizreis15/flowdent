import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { MoreVertical, Plus, Printer, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Procedimento {
  id: string;
  date: string;
  dente: string;
  nome: string;
  status: "a_realizar" | "executado" | "existente";
  faces?: string;
  valor?: number;
}

interface ProcedimentosTableProps {
  procedimentos: Procedimento[];
  onAddProcedimento?: () => void;
  onPrint?: () => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

const STATUS_COLORS = {
  a_realizar: "bg-clinico-a-realizar",
  executado: "bg-clinico-executado",
  existente: "bg-clinico-protese",
};

export const ProcedimentosTable = ({
  procedimentos,
  onAddProcedimento,
  onPrint,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: ProcedimentosTableProps) => {
  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Botões de Ação */}
      <div className="flex gap-2">
        <Button 
          className="flex-1"
          onClick={onAddProcedimento}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar procedimento
        </Button>
        <Button variant="outline" size="icon" onClick={onPrint}>
          <Printer className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabela */}
      <div className="flex-1 border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-8"></TableHead>
              <TableHead className="text-xs">Data</TableHead>
              <TableHead className="text-xs">Dente</TableHead>
              <TableHead className="text-xs">Procedimento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {procedimentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum procedimento registrado
                </TableCell>
              </TableRow>
            ) : (
              procedimentos.map((proc) => (
                <TableRow key={proc.id} className="hover:bg-muted/30">
                  <TableCell className="p-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-xs py-2">
                    {proc.date ? format(new Date(proc.date), "dd/MM/yy", { locale: ptBR }) : "-"}
                  </TableCell>
                  <TableCell className="text-xs py-2 font-medium">
                    {proc.dente}
                    {proc.faces && <span className="text-muted-foreground ml-1">({proc.faces})</span>}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0",
                        STATUS_COLORS[proc.status]
                      )} />
                      <span className="text-xs truncate max-w-[150px]">{proc.nome}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <Button 
          variant="ghost" 
          size="sm" 
          disabled={currentPage <= 1}
          onClick={() => onPageChange?.(currentPage - 1)}
          className="h-7 text-xs"
        >
          <ChevronLeft className="h-3 w-3 mr-1" />
          Anterior
        </Button>
        <span>Página {currentPage} de {totalPages}</span>
        <Button 
          variant="ghost" 
          size="sm" 
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange?.(currentPage + 1)}
          className="h-7 text-xs"
        >
          Próxima
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  );
};
