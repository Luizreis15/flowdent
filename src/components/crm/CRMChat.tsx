import { useState, useEffect, useRef } from "react";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { EstadoErro } from "@/components/sistema/EstadoErro";
import { EsqueletoLista } from "@/components/sistema/EsqueletoLista";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Phone, CheckCheck, Clock, Search, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CRMChatProps {
  clinicId: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
}

interface Conversation {
  id: string;
  contact_id: string;
  status: string;
  last_message_at: string;
  unread_count: number;
  kanban_stage: string;
  contact: Contact;
}

interface Message {
  id: string;
  content: string;
  is_from_me: boolean;
  created_at: string;
  status: string;
  message_type: string;
}

export function CRMChat({ clinicId }: CRMChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [erroCarregar, setErroCarregar] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Nova conversa state
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [firstMessage, setFirstMessage] = useState("");

  useEffect(() => {
    loadConversations();
  }, [clinicId]);

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);

      const channel = supabase
        .channel(`crm-msgs-${selectedId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'crm_messages',
          filter: `conversation_id=eq.${selectedId}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
          scrollToBottom();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const loadConversations = async () => {
    try {
      setErroCarregar(false);
      const { data, error } = await supabase
        .from("crm_conversations")
        .select(`*, contact:crm_contacts(id, name, phone)`)
        .eq("clinica_id", clinicId)
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      setConversations((data as any) || []);
    } catch (error) {
      console.error("Erro ao carregar conversas:", error);
      setErroCarregar(true);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("crm_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark as read
      await supabase
        .from("crm_conversations")
        .update({ unread_count: 0 })
        .eq("id", conversationId);

      // Update local state
      setConversations(prev => prev.map(c =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      ));
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedId) return;

    const conv = conversations.find(c => c.id === selectedId);
    if (!conv) return;

    setSending(true);
    try {
      // Insert message in DB
      const { error: msgError } = await supabase
        .from("crm_messages")
        .insert({
          conversation_id: selectedId,
          content: input.trim(),
          is_from_me: true,
          sender_id: (await supabase.auth.getUser()).data.user?.id,
          message_type: "text",
          status: "pending"
        });

      if (msgError) throw msgError;

      // Send via WhatsApp (Z-API)
      const { error: sendError } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          clinicId,
          phone: conv.contact.phone,
          messageType: 'custom',
          customMessage: input.trim()
        }
      });

      if (sendError) {
        console.warn("WhatsApp send failed:", sendError);
        toast.warning("Mensagem salva, mas falha ao enviar via WhatsApp");
      }

      // Update conversation
      await supabase
        .from("crm_conversations")
        .update({ last_message_at: new Date().toISOString(), status: 'active' })
        .eq("id", selectedId);

      setInput("");
      loadConversations();
    } catch (error) {
      console.error("Erro ao enviar:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const filteredConvs = conversations.filter(c =>
    c.contact?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact?.phone?.includes(search)
  );

  const selectedConv = conversations.find(c => c.id === selectedId);

  const statusIcon = (status: string) => {
    if (status === 'read') return <CheckCheck className="w-3 h-3 text-primary" />;
    if (status === 'delivered') return <CheckCheck className="w-3 h-3 opacity-50" />;
    if (status === 'sent') return <CheckCheck className="w-3 h-3 opacity-30" />;
    return <Clock className="w-3 h-3 opacity-30" />;
  };

  const openNewConversation = async () => {
    try {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("id, name, phone")
        .eq("clinica_id", clinicId)
        .order("name");
      if (error) throw error;
      setAllContacts(data || []);
      setContactSearch("");
      setSelectedContact(null);
      setFirstMessage("");
      setNewConvOpen(true);
    } catch {
      toast.error("Erro ao carregar contatos");
    }
  };

  const startNewConversation = async () => {
    if (!selectedContact || !firstMessage.trim()) {
      toast.error("Selecione um contato e digite uma mensagem");
      return;
    }
    setSending(true);
    try {
      // Check if conversation already exists for this contact
      const { data: existingConv } = await supabase
        .from("crm_conversations")
        .select("id")
        .eq("clinica_id", clinicId)
        .eq("contact_id", selectedContact.id)
        .neq("status", "closed")
        .maybeSingle();

      let convId: string;

      if (existingConv) {
        convId = existingConv.id;
      } else {
        const { data: newConv, error: convErr } = await supabase
          .from("crm_conversations")
          .insert({
            clinica_id: clinicId,
            contact_id: selectedContact.id,
            status: "active",
            kanban_stage: "novo",
          })
          .select("id")
          .single();
        if (convErr) throw convErr;
        convId = newConv.id;
      }

      // Insert message
      const { error: msgErr } = await supabase
        .from("crm_messages")
        .insert({
          conversation_id: convId,
          content: firstMessage.trim(),
          is_from_me: true,
          sender_id: (await supabase.auth.getUser()).data.user?.id,
          message_type: "text",
          status: "pending",
        });
      if (msgErr) throw msgErr;

      // Send via WhatsApp
      await supabase.functions.invoke("send-whatsapp", {
        body: {
          clinicId,
          phone: selectedContact.phone,
          messageType: "custom",
          customMessage: firstMessage.trim(),
        },
      });

      // Update conversation timestamp
      await supabase
        .from("crm_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", convId);

      setNewConvOpen(false);
      toast.success("Conversa iniciada");
      loadConversations();
      setSelectedId(convId);
    } catch (error) {
      console.error("Erro ao iniciar conversa:", error);
      toast.error("Erro ao iniciar conversa");
    } finally {
      setSending(false);
    }
  };

  const filteredNewContacts = allContacts.filter(c =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.phone.includes(contactSearch)
  );

  if (erroCarregar) {
    return (
      <div className="rounded-lg border bg-card">
        <EstadoErro titulo="Não foi possível carregar as conversas" onTentarDeNovo={loadConversations} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-lg border bg-card" aria-busy="true" aria-label="Carregando">
        <div className="w-80 space-y-3 border-r p-3">
          <Skeleton className="h-8" />
          <Skeleton className="h-9" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
        <div className="flex-1" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] border rounded-lg overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-3 border-b space-y-2">
          <Button onClick={openNewConversation} className="w-full" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nova conversa
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {filteredConvs.length === 0 &&
            (search.trim() ? (
              <EstadoVazio titulo="Nenhuma conversa encontrada" descricao="Tente outro nome ou telefone." />
            ) : (
              <EstadoVazio titulo="Nenhuma conversa ainda" descricao="Comece uma em Nova conversa." />
            ))}
          {filteredConvs.map(conv => (
            <div
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className={`p-3 border-b cursor-pointer hover:bg-accent/50 transition-colors ${
                selectedId === conv.id ? 'bg-accent' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-sm">
                    {conv.contact?.name?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm truncate">
                      {conv.contact?.name || conv.contact?.phone}
                    </span>
                    {conv.last_message_at && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(conv.last_message_at), "HH:mm")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {conv.kanban_stage === 'novo' ? 'Novo' :
                       conv.kanban_stage === 'em_atendimento' ? 'Atendendo' :
                       conv.kanban_stage === 'aguardando' ? 'Aguardando' : 'Finalizado'}
                    </Badge>
                    {conv.unread_count > 0 && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            <div className="p-3 border-b flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{selectedConv.contact?.name?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{selectedConv.contact?.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {selectedConv.contact?.phone}
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.is_from_me ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-lg px-3 py-2 ${
                      msg.is_from_me ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] opacity-70">
                          {format(new Date(msg.created_at), "HH:mm")}
                        </span>
                        {msg.is_from_me && statusIcon(msg.status)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Digite sua mensagem..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={sending}
                />
                <Button onClick={sendMessage} disabled={sending || !input.trim()} size="icon">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Nova Conversa */}
      <Dialog open={newConvOpen} onOpenChange={setNewConvOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedContact ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar contato..."
                    value={contactSearch}
                    onChange={e => setContactSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-64">
                  <div className="space-y-1">
                    {filteredNewContacts.map(contact => (
                      <div
                        key={contact.id}
                        onClick={() => setSelectedContact(contact)}
                        className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{contact.name[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{contact.name}</div>
                          <div className="text-xs text-muted-foreground">{contact.phone}</div>
                        </div>
                      </div>
                    ))}
                    {filteredNewContacts.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-4">Nenhum contato encontrado</p>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{selectedContact.name[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{selectedContact.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedContact.phone}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedContact(null)}>
                    Trocar
                  </Button>
                </div>
                <div>
                  <Label>Mensagem *</Label>
                  <Textarea
                    value={firstMessage}
                    onChange={e => setFirstMessage(e.target.value)}
                    placeholder="Digite a primeira mensagem..."
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setNewConvOpen(false)}>Cancelar</Button>
                  <Button onClick={startNewConversation} disabled={sending || !firstMessage.trim()}>
                    {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Enviar
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
