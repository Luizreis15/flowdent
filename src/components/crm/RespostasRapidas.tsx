import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, Loader2, MessageSquare, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RespostasRapidasProps {
  clinicId: string;
}

interface QuickReply {
  id: string;
  title: string;
  content: string;
  shortcut: string | null;
  category: string;
  created_at: string;
}

const CATEGORIES = [
  { value: 'geral', label: 'Geral' },
  { value: 'saudacao', label: 'Saudação' },
  { value: 'agendamento', label: 'Agendamento' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'pos_atendimento', label: 'Pós-Atendimento' },
];

export function RespostasRapidas({ clinicId }: RespostasRapidasProps) {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [category, setCategory] = useState("geral");

  useEffect(() => {
    loadReplies();
  }, [clinicId]);

  const loadReplies = async () => {
    try {
      const { data, error } = await supabase
        .from("crm_quick_replies")
        .select("*")
        .eq("clinica_id", clinicId)
        .order("category", { ascending: true });

      if (error) throw error;
      setReplies(data || []);
    } catch (error) {
      console.error("Erro ao carregar respostas:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setShortcut("");
    setCategory("geral");
    setCreating(false);
    setEditing(null);
  };

  const startEdit = (reply: QuickReply) => {
    setEditing(reply.id);
    setTitle(reply.title);
    setContent(reply.content);
    setShortcut(reply.shortcut || "");
    setCategory(reply.category);
    setCreating(false);
  };

  const save = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Título e conteúdo são obrigatórios");
      return;
    }

    try {
      if (editing) {
        const { error } = await supabase
          .from("crm_quick_replies")
          .update({ title: title.trim(), content: content.trim(), shortcut: shortcut.trim() || null, category })
          .eq("id", editing);
        if (error) throw error;
        toast.success("Resposta atualizada");
      } else {
        const { error } = await supabase
          .from("crm_quick_replies")
          .insert({
            clinica_id: clinicId,
            title: title.trim(),
            content: content.trim(),
            shortcut: shortcut.trim() || null,
            category,
          });
        if (error) throw error;
        toast.success("Resposta criada");
      }
      resetForm();
      loadReplies();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar resposta");
    }
  };

  const deleteReply = async (id: string) => {
    try {
      const { error } = await supabase
        .from("crm_quick_replies")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Resposta removida");
      loadReplies();
    } catch (error) {
      toast.error("Erro ao remover");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Respostas Rápidas</h3>
          <p className="text-sm text-muted-foreground">
            Crie templates para agilizar o atendimento. Use atalhos como <code className="bg-muted px-1 rounded">/bv</code> no chat.
          </p>
        </div>
        {!creating && !editing && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Resposta
          </Button>
        )}
      </div>

      {(creating || editing) && (
        <Card className="p-4 space-y-3 border-primary/30">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Título *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Boas-vindas" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Atalho</Label>
                <Input value={shortcut} onChange={e => setShortcut(e.target.value)} placeholder="/bv" />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div>
            <Label>Conteúdo *</Label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Olá {paciente}! Bem-vindo(a) à nossa clínica..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Variáveis: {'{paciente}'}, {'{data}'}, {'{hora}'}, {'{profissional}'}
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={resetForm}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={save}>
              <Save className="w-4 h-4 mr-2" />
              {editing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </Card>
      )}

      <ScrollArea className="h-[calc(100vh-18rem)]">
        <div className="space-y-2">
          {replies.map(reply => (
            <Card key={reply.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{reply.title}</span>
                    {reply.shortcut && (
                      <Badge variant="secondary" className="text-xs font-mono">
                        {reply.shortcut}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {CATEGORIES.find(c => c.value === reply.category)?.label || reply.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-2">
                    {reply.content}
                  </p>
                </div>
                <div className="flex gap-1 ml-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(reply)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteReply(reply.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {replies.length === 0 && !creating && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Nenhuma resposta rápida cadastrada</p>
              <p className="text-sm mt-1">Crie templates para agilizar seu atendimento</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
