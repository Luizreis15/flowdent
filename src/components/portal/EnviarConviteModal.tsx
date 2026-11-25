import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface EnviarConviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Paciente já escolhido (ex.: aberto da ficha). Sem ele, o modal mostra a busca de paciente. */
  patientId?: string;
  patientEmail?: string;
  patientName?: string;
  /** Chamado depois de gerar um convite, para a lista de convites recarregar */
  onConviteGerado?: () => void;
}

interface PacienteBusca {
  id: string;
  full_name: string;
  email: string | null;
}

const EnviarConviteModal = ({
  open,
  onOpenChange,
  patientId,
  patientEmail = "",
  patientName = "",
  onConviteGerado,
}: EnviarConviteModalProps) => {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paciente, setPaciente] = useState<PacienteBusca | null>(
    patientId ? { id: patientId, full_name: patientName, email: patientEmail } : null,
  );
  const [email, setEmail] = useState(patientEmail);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<PacienteBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Antes o modal abria sem paciente na tela do Portal e o convite sempre falhava.
  // Agora a busca é no servidor (por nome, até 8 resultados), sem carregar os ~780 pacientes.
  useEffect(() => {
    if (patientId || paciente || busca.trim().length < 2 || !clinicId) {
      setResultados([]);
      return;
    }
    const termo = busca.trim().replace(/[%,()]/g, " ");
    const t = setTimeout(async () => {
      setBuscando(true);
      const { data } = await supabase
        .from("patients")
        .select("id, full_name, email")
        .eq("clinic_id", clinicId)
        .ilike("full_name", `%${termo}%`)
        .order("full_name")
        .limit(8);
      setResultados(data || []);
      setBuscando(false);
    }, 250);
    return () => clearTimeout(t);
  }, [busca, paciente, patientId, clinicId]);

  const escolherPaciente = (p: PacienteBusca) => {
    setPaciente(p);
    setEmail(p.email || "");
    setBusca("");
  };

  const generateInvite = async () => {
    if (!paciente) return;
    setLoading(true);

    try {
      const { data: existingInvite } = await supabase
        .from("patient_portal_invites")
        .select("token")
        .eq("patient_id", paciente.id)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      let token = existingInvite?.token ?? "";

      if (!token) {
        token = crypto.randomUUID();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const { error: inviteError } = await supabase.from("patient_portal_invites").insert({
          patient_id: paciente.id,
          email,
          token,
          invited_by: user.id,
        });
        if (inviteError) throw inviteError;
      }

      setInviteLink(`${window.location.origin}/portal/auth?token=${token}`);
      onConviteGerado?.();
    } catch (error: any) {
      toast({ title: "Não foi possível gerar o convite", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({ title: "Link copiado", description: "Envie ao paciente pelo canal que preferir." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setInviteLink("");
    setCopied(false);
    setBusca("");
    setResultados([]);
    setPaciente(patientId ? { id: patientId, full_name: patientName, email: patientEmail } : null);
    setEmail(patientEmail);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar para o portal</DialogTitle>
          <DialogDescription>
            O link vale por 7 dias. O paciente cria a senha e passa a entrar pelo portal.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              Convite para <span className="font-medium">{paciente?.full_name}</span>
            </p>
            <div className="break-all rounded-md border bg-muted/40 p-3 font-mono text-[13px] text-foreground">
              {inviteLink}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Fechar
              </Button>
              <Button onClick={copyLink}>
                {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                {copied ? "Copiado" : "Copiar link"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="busca-paciente">Paciente</Label>
              {paciente ? (
                <div className="flex h-9 items-center justify-between rounded-md border bg-muted/40 px-3">
                  <span className="truncate text-sm text-foreground">{paciente.full_name}</span>
                  {!patientId && (
                    <button
                      type="button"
                      onClick={() => setPaciente(null)}
                      className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Trocar paciente"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="busca-paciente"
                    className="pl-9"
                    placeholder="Buscar pelo nome"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    autoComplete="off"
                    autoFocus
                  />
                  {busca.trim().length >= 2 && (
                    <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-md border bg-popover shadow-sm">
                      {buscando ? (
                        <p className="px-3 py-2 text-[13px] text-muted-foreground">Buscando…</p>
                      ) : resultados.length ? (
                        <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
                          {resultados.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={false}
                                onClick={() => escolherPaciente(p)}
                                className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                              >
                                <span className="text-sm text-foreground">{p.full_name}</span>
                                <span className="text-xs text-muted-foreground">{p.email || "Sem e-mail no cadastro"}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="px-3 py-2 text-[13px] text-muted-foreground">Nenhum paciente com esse nome</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail do paciente</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@paciente.com"
              />
              <p className="text-xs text-muted-foreground">O paciente usa este e-mail para entrar no portal.</p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={generateInvite} disabled={loading || !paciente || !email}>
                {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Gerar link
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EnviarConviteModal;
