import { useState, useEffect } from "react";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { EstadoErro } from "@/components/sistema/EstadoErro";
import { EsqueletoLista } from "@/components/sistema/EsqueletoLista";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Phone, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface CRMKanbanProps {
  clinicId: string;
}

interface KanbanConversation {
  id: string;
  status: string;
  kanban_stage: string;
  last_message_at: string;
  unread_count: number;
  contact: {
    id: string;
    name: string;
    phone: string;
    tags: string[];
  };
}

const STAGES = [
  { key: 'novo', label: 'Novo', color: 'bg-tinta-500' },
  { key: 'em_atendimento', label: 'Em atendimento', color: 'bg-acento-500' },
  { key: 'aguardando', label: 'Aguardando', color: 'bg-sinal-espera' },
  { key: 'finalizado', label: 'Finalizado', color: 'bg-sinal-ok' },
];

export function CRMKanban({ clinicId }: CRMKanbanProps) {
  const [conversations, setConversations] = useState<KanbanConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroCarregar, setErroCarregar] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, [clinicId]);

  const loadConversations = async () => {
    try {
      setErroCarregar(false);
      const { data, error } = await supabase
        .from("crm_conversations")
        .select(`*, contact:crm_contacts(id, name, phone, tags)`)
        .eq("clinica_id", clinicId)
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      setConversations((data as any) || []);
    } catch (error) {
      console.error("Erro ao carregar kanban:", error);
      setErroCarregar(true);
    } finally {
      setLoading(false);
    }
  };

  const moveConversation = async (convId: string, newStage: string) => {
    try {
      const { error } = await supabase
        .from("crm_conversations")
        .update({ kanban_stage: newStage })
        .eq("id", convId);

      if (error) throw error;

      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, kanban_stage: newStage } : c)
      );
    } catch (error) {
      console.error("Erro ao mover conversa:", error);
      toast.error("Erro ao mover conversa");
    }
  };

  const handleDragStart = (e: React.DragEvent, convId: string) => {
    e.dataTransfer.setData('text/plain', convId);
    setDragging(convId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const convId = e.dataTransfer.getData('text/plain');
    if (convId) {
      moveConversation(convId, stage);
    }
    setDragging(null);
  };

  if (erroCarregar) {
    return (
      <div className="rounded-lg border bg-card">
        <EstadoErro titulo="Não foi possível carregar o funil" onTentarDeNovo={loadConversations} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex gap-3 overflow-hidden" aria-busy="true" aria-label="Carregando">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="w-72 shrink-0 space-y-2 rounded-lg border bg-muted/40 p-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)] overflow-x-auto pb-4">
      {STAGES.map(stage => {
        const stageConvs = conversations.filter(c => c.kanban_stage === stage.key);

        return (
          <div
            key={stage.key}
            className="flex-shrink-0 w-72 flex flex-col bg-muted/30 rounded-lg"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.key)}
          >
            <div className="p-3 border-b flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
              <span className="font-medium text-sm">{stage.label}</span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {stageConvs.length}
              </Badge>
            </div>

            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2">
                {stageConvs.map(conv => (
                  <Card
                    key={conv.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, conv.id)}
                    className={`p-3 cursor-grab active:cursor-grabbing transition-colors duration-150 hover:bg-muted/40 ${
                      dragging === conv.id ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {conv.contact?.name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {conv.contact?.name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {conv.contact?.phone}
                        </div>
                      </div>
                      {conv.unread_count > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                    {conv.last_message_at && (
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(new Date(conv.last_message_at), "dd/MM HH:mm")}
                      </div>
                    )}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {conv.contact?.tags?.map(tag => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                ))}

                {stageConvs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    Nenhuma conversa
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
