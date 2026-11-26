import { useState, useEffect } from "react";
import { EstadoVazio } from "@/components/sistema/EstadoVazio";
import { EstadoErro } from "@/components/sistema/EstadoErro";
import { EsqueletoLista } from "@/components/sistema/EsqueletoLista";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, UserPlus, RefreshCw, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface CRMContatosProps {
  clinicId: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  notes: string | null;
  patient_id: string | null;
  created_at: string;
}

export function CRMContatos({ clinicId }: CRMContatosProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroCarregar, setErroCarregar] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  useEffect(() => {
    loadContacts();
  }, [clinicId]);

  const loadContacts = async () => {
    try {
      setErroCarregar(false);
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("*")
        .eq("clinica_id", clinicId)
        .order("name");

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error("Erro ao carregar contatos:", error);
      setErroCarregar(true);
    } finally {
      setLoading(false);
    }
  };

  const syncPatients = async () => {
    setSyncing(true);
    try {
      // Buscar pacientes com telefone que não estão nos contatos
      const { data: patients, error: pError } = await supabase
        .from("patients")
        .select("id, full_name, phone")
        .eq("clinic_id", clinicId)
        .not("phone", "is", null);

      if (pError) throw pError;
      if (!patients?.length) {
        toast.info("Nenhum paciente com telefone para sincronizar");
        setSyncing(false);
        return;
      }

      // Filtrar pacientes que já existem como contatos
      const existingPhones = new Set(contacts.map(c => c.phone.replace(/\D/g, '')));
      const newPatients = patients.filter(p => 
        p.phone && !existingPhones.has(p.phone.replace(/\D/g, ''))
      );

      if (!newPatients.length) {
        toast.info("Todos os pacientes já estão sincronizados");
        setSyncing(false);
        return;
      }

      const inserts = newPatients.map(p => ({
        clinica_id: clinicId,
        patient_id: p.id,
        name: p.full_name,
        phone: p.phone!.replace(/\D/g, ''),
        tags: ['paciente']
      }));

      const { error } = await supabase
        .from("crm_contacts")
        .upsert(inserts, { onConflict: "clinica_id,phone" });

      if (error) throw error;

      toast.success(`${newPatients.length} contato(s) sincronizado(s)!`);
      loadContacts();
    } catch (error: any) {
      console.error("Erro ao sincronizar:", error);
      toast.error("Erro ao sincronizar pacientes");
    } finally {
      setSyncing(false);
    }
  };

  const addContact = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }
    try {
      const { error } = await supabase
        .from("crm_contacts")
        .insert({
          clinica_id: clinicId,
          name: newName.trim(),
          phone: newPhone.replace(/\D/g, ''),
        });

      if (error) throw error;
      toast.success("Contato adicionado");
      setNewName("");
      setNewPhone("");
      setAddModalOpen(false);
      loadContacts();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error("Este telefone já está cadastrado");
      } else {
        toast.error("Erro ao adicionar contato");
      }
    }
  };

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  if (erroCarregar) {
    return (
      <div className="rounded-lg border bg-card">
        <EstadoErro titulo="Não foi possível carregar os contatos" onTentarDeNovo={loadContacts} />
      </div>
    );
  }

  if (loading) {
    return <EsqueletoLista avatar linhas={8} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contatos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={syncPatients} disabled={syncing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          Sincronizar Pacientes
        </Button>
        <Button onClick={() => setAddModalOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Contato
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        {filtered.length} contato(s)
      </div>

      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="grid gap-2">
          {filtered.map(contact => (
            <Card key={contact.id} className="p-4 flex items-center gap-4 hover:bg-accent/50 transition-colors">
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {contact.name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{contact.name}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {contact.phone}
                </div>
              </div>
              <div className="flex gap-1">
                {contact.tags?.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
          {filtered.length === 0 &&
            (contacts.length ? (
              <EstadoVazio icone={Search} titulo="Nenhum contato encontrado" descricao="Tente outro nome ou telefone." />
            ) : (
              <EstadoVazio
                icone={UserPlus}
                titulo="Nenhum contato ainda"
                descricao="Sincronize os pacientes com telefone ou adicione um contato."
              />
            ))}
        </div>
      </ScrollArea>

      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Contato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancelar</Button>
              <Button onClick={addContact}>Adicionar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
