import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Copy, CheckCircle2 } from "lucide-react";

interface EnviarConviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string;
  patientEmail?: string;
  patientName?: string;
}

const EnviarConviteModal = ({ 
  open, 
  onOpenChange, 
  patientId, 
  patientEmail = "", 
  patientName = ""
}: EnviarConviteModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(patientEmail);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const generateInvite = async () => {
    if (!patientId) {
      toast({
        title: "Erro",
        description: "Paciente não selecionado.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Verificar se já existe convite ativo
      const { data: existingInvite } = await supabase
        .from("patient_portal_invites")
        .select("*")
        .eq("patient_id", patientId)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      let token = "";

      if (existingInvite) {
        token = existingInvite.token;
      } else {
        // Gerar novo token
        token = crypto.randomUUID();

        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) throw new Error("Usuário não autenticado");

        // Criar convite
        const { error: inviteError } = await supabase
          .from("patient_portal_invites")
          .insert({
            patient_id: patientId,
            email: email,
            token: token,
            invited_by: user.id,
          });

        if (inviteError) throw inviteError;
      }

      // Gerar link
      const link = `${window.location.origin}/portal/auth?token=${token}`;
      setInviteLink(link);

      toast({
        title: "Convite gerado",
        description: "Link criado com sucesso. Copie e envie ao paciente.",
      });

    } catch (error: any) {
      toast({
        title: "Erro ao gerar convite",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({
      title: "Link copiado",
      description: "O link foi copiado para a área de transferência.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setInviteLink("");
    setCopied(false);
    setEmail(patientEmail);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Convite - Portal do Paciente</DialogTitle>
          <DialogDescription>
            Gere um link de convite para {patientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail do Paciente</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@paciente.com"
            />
          </div>

          {!inviteLink ? (
            <Button 
              onClick={generateInvite} 
              disabled={loading || !email}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando convite...
                </>
              ) : (
                "Gerar Link de Convite"
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg break-all text-sm">
                {inviteLink}
              </div>
              <Button 
                onClick={copyLink} 
                className="w-full"
                variant={copied ? "outline" : "default"}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Link Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Link
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Este link expira em 7 dias
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnviarConviteModal;
