import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PASSWORD_HINT, passwordSchema } from "@/lib/password";

interface SegurancaTabProps {
  userId: string;
}

const SegurancaTab = ({ userId }: SegurancaTabProps) => {
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changing, setChanging] = useState(false);

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword) {
      toast.error("Informe a senha atual");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    const validation = passwordSchema.safeParse(passwordData.newPassword);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    try {
      setChanging(true);

      // Confere a senha atual antes de trocar: antes o campo era pedido e ignorado,
      // e qualquer pessoa com a sessão aberta trocava a senha.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Usuário sem e-mail na sessão");
      const { error: senhaAtualErro } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword,
      });
      if (senhaAtualErro) {
        toast.error("Senha atual incorreta");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast.success("Senha atualizada com sucesso");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      toast.error("Erro ao alterar senha: " + error.message);
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">Alterar senha</CardTitle>
          <CardDescription>
            Mantenha sua conta segura com uma senha forte
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Senha atual *</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, currentPassword: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova senha *</Label>
            <Input
              id="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, newPassword: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              {PASSWORD_HINT}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar nova senha *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, confirmPassword: e.target.value })
              }
            />
          </div>

          <Button onClick={handlePasswordChange} disabled={changing}>
            {changing ? "Alterando..." : "Alterar senha"}
          </Button>
        </CardContent>
      </Card>

    </div>
  );
};

export default SegurancaTab;
