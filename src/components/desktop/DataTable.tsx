import { useState, useMemo, ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { EstadoErro } from "@/components/sistema/EstadoErro";
import type { LucideIcon } from "lucide-react";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  /** Custom render function for the cell */
  render?: (row: T) => ReactNode;
  /** Key path to access value for sorting/searching. Defaults to `key` */
  accessorKey?: string;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  /** Unique key field on each row, defaults to "id" */
  rowKey?: string;
  /** Enable search bar */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Enable row selection */
  selectable?: boolean;
  /** Called when selection changes */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Render batch actions toolbar when items are selected */
  batchActions?: (selectedIds: string[]) => ReactNode;
  /** Rows per page options */
  pageSizeOptions?: number[];
  /** Default rows per page */
  defaultPageSize?: number;
  /** Empty state message (título do estado vazio quando `vazio` não é passado) */
  emptyMessage?: string;
  /** Estado vazio desenhado: ícone, título, frase e uma ação (ex.: "Novo produto") */
  vazio?: { icone?: LucideIcon; titulo: string; descricao?: string; acao?: ReactNode };
  /** Falha ao carregar: mostra o EstadoErro no lugar das linhas */
  erro?: boolean;
  tituloErro?: string;
  onTentarDeNovo?: () => void;
  /** Extra class on wrapper */
  className?: string;
  /** Toolbar actions (e.g. "Add" button) rendered beside search */
  toolbarActions?: ReactNode;
}

type SortDirection = "asc" | "desc" | null;

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  rowKey = "id",
  searchable = true,
  searchPlaceholder = "Buscar...",
  selectable = false,
  onSelectionChange,
  batchActions,
  pageSizeOptions = [10, 25, 50],
  defaultPageSize = 10,
  emptyMessage = "Nenhum registro encontrado",
  vazio,
  erro = false,
  tituloErro,
  onTentarDeNovo,
  className,
  toolbarActions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // --- Filter ---
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = getNestedValue(row, col.accessorKey || col.key);
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  // --- Sort ---
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    const accessor = col?.accessorKey || sortKey;
    return [...filtered].sort((a, b) => {
      const aVal = getNestedValue(a, accessor);
      const bVal = getNestedValue(b, accessor);
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === "number" && typeof bVal === "number"
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal), "pt-BR", { sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, columns]);

  // --- Paginate ---
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  // --- Handlers ---
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : prev === "desc" ? null : "asc"));
      if (sortDir === "desc") setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      onSelectionChange?.(next);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.length === paginated.length) {
      setSelectedIds([]);
      onSelectionChange?.([]);
    } else {
      const ids = paginated.map((r) => r[rowKey]);
      setSelectedIds(ids);
      onSelectionChange?.(ids);
    }
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    if (sortDir === "asc") return <ArrowUp className="h-3.5 w-3.5 text-primary" />;
    return <ArrowDown className="h-3.5 w-3.5 text-primary" />;
  };

  // --- Loading skeleton ---
  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32 ml-auto" />
        </div>
        <div className="divide-y overflow-hidden rounded-lg border bg-card" aria-busy="true" aria-label="Carregando">
          <div className="flex gap-6 bg-muted/50 px-4 py-3">
            {columns.slice(0, 5).map((c) => (
              <Skeleton key={c.key} className="h-3 w-20" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-4 py-4">
              {columns.slice(0, 5).map((c, j) => (
                <Skeleton key={c.key} className="h-3.5" style={{ width: j === 0 ? "28%" : "12%" }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {searchable && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder={searchPlaceholder}
              className="pl-9 h-10"
            />
          </div>
        )}

        {/* Batch actions or toolbar actions */}
        <div className="flex items-center gap-2 ml-auto">
          {selectedIds.length > 0 && batchActions ? (
            <div className="flex items-center gap-2">
              <span className="text-body-sm text-muted-foreground">
                {selectedIds.length} selecionado(s)
              </span>
              {batchActions(selectedIds)}
            </div>
          ) : (
            toolbarActions
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent">
                {selectable && (
                  <TableHead className="w-12 px-3">
                    <Checkbox
                      checked={paginated.length > 0 && selectedIds.length === paginated.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "text-table-header whitespace-nowrap",
                      col.sortable && "cursor-pointer select-none",
                      col.headerClassName
                    )}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      {col.sortable && <SortIcon colKey={col.key} />}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {erro || paginated.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="p-0">
                    {erro ? (
                      <EstadoErro titulo={tituloErro} onTentarDeNovo={onTentarDeNovo} />
                    ) : search.trim() && data.length > 0 ? (
                      <EstadoVazio
                        icone={Search}
                        titulo="Nenhum resultado para a busca"
                        descricao={`Nada encontrado para "${search.trim()}".`}
                        acao={
                          <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                            Limpar busca
                          </Button>
                        }
                      />
                    ) : (
                      <EstadoVazio
                        icone={vazio?.icone}
                        titulo={vazio?.titulo ?? emptyMessage}
                        descricao={vazio?.descricao}
                        acao={vazio?.acao}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((row) => (
                  <TableRow
                    key={row[rowKey]}
                    className={cn(
                      "transition-colors",
                      selectedIds.includes(row[rowKey]) && "bg-primary/5"
                    )}
                  >
                    {selectable && (
                      <TableCell className="px-3">
                        <Checkbox
                          checked={selectedIds.includes(row[rowKey])}
                          onCheckedChange={() => toggleRow(row[rowKey])}
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.key} className={cn("text-table", col.className)}>
                        {col.render ? col.render(row) : getNestedValue(row, col.accessorKey || col.key) ?? "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {sorted.length > pageSizeOptions[0] && (
        <div className="flex items-center justify-between text-body-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Mostrar</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>por página</span>
          </div>

          <div className="flex items-center gap-1">
            <span>
              {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, sorted.length)} de {sorted.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={safePage === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
