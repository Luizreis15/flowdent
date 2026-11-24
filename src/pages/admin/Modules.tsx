import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Settings, Flag, Loader2 } from "lucide-react";

interface Module {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  rollout_percentage: number | null;
  module_id: string | null;
}

const AdminModules = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [moduleForm, setModuleForm] = useState({ code: "", name: "", description: "" });
  const [flagForm, setFlagForm] = useState({ key: "", name: "", description: "", module_id: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [modulesRes, flagsRes] = await Promise.all([
        supabase.from("system_modules").select("*").order("name"),
        supabase.from("feature_flags").select("*").order("name"),
      ]);

      setModules(modulesRes.data || []);
      setFlags(flagsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModule = async (module: Module) => {
    try {
      await supabase
        .from("system_modules")
        .update({ is_active: !module.is_active })
        .eq("id", module.id);
      
      toast.success(`Módulo ${!module.is_active ? "ativado" : "desativado"}`);
      loadData();
    } catch (error) {
      toast.error("Erro ao atualizar módulo");
    }
  };

  const handleToggleFlag = async (flag: FeatureFlag) => {
    try {
      await supabase
        .from("feature_flags")
        .update({ is_enabled: !flag.is_enabled })
        .eq("id", flag.id);
      
      toast.success(`Feature flag ${!flag.is_enabled ? "ativada" : "desativada"}`);
      loadData();
    } catch (error) {
      toast.error("Erro ao atualizar flag");
    }
  };

  const handleCreateModule = async () => {
    if (!moduleForm.code || !moduleForm.name) {
      toast.error("Código e nome são obrigatórios");
      return;
    }

    setSaving(true);
    try {
      await supabase.from("system_modules").insert(moduleForm);
      toast.success("Módulo criado");
      setShowModuleModal(false);
      setModuleForm({ code: "", name: "", description: "" });
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar módulo");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFlag = async () => {
    if (!flagForm.key || !flagForm.name) {
      toast.error("Key e nome são obrigatórios");
      return;
    }

    setSaving(true);
    try {
      await supabase.from("feature_flags").insert({
        ...flagForm,
        module_id: flagForm.module_id || null,
      });
      toast.success("Feature flag criada");
      setShowFlagModal(false);
      setFlagForm({ key: "", name: "", description: "", module_id: "" });
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar flag");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Módulos e Feature Flags</h1>
        <p className="text-slate-400">Gerenciar funcionalidades do sistema</p>
      </div>

      {/* Modules Section */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Módulos do Sistema
            </CardTitle>
            <CardDescription className="text-slate-400">
              Ative ou desative módulos inteiros
            </CardDescription>
          </div>
          <Button onClick={() => setShowModuleModal(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Novo Módulo
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {modules.map((module) => (
              <div
                key={module.id}
                className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg"
              >
                <div>
                  <p className="text-white font-medium">{module.name}</p>
                  <p className="text-slate-400 text-sm">{module.code}</p>
                  {module.description && (
                    <p className="text-slate-500 text-xs mt-1">{module.description}</p>
                  )}
                </div>
                <Switch
                  checked={module.is_active}
                  onCheckedChange={() => handleToggleModule(module)}
                />
              </div>
            ))}
            {modules.length === 0 && (
              <p className="text-center text-slate-500 py-4">Nenhum módulo cadastrado</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags Section */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Feature Flags
            </CardTitle>
            <CardDescription className="text-slate-400">
              Controle funcionalidades específicas
            </CardDescription>
          </div>
          <Button onClick={() => setShowFlagModal(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Nova Flag
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg"
              >
                <div>
                  <p className="text-white font-medium">{flag.name}</p>
                  <p className="text-slate-400 text-sm">{flag.key}</p>
                  {flag.description && (
                    <p className="text-slate-500 text-xs mt-1">{flag.description}</p>
                  )}
                  {flag.rollout_percentage !== null && (
                    <p className="text-xs text-amber-400 mt-1">
                      Rollout: {flag.rollout_percentage}%
                    </p>
                  )}
                </div>
                <Switch
                  checked={flag.is_enabled}
                  onCheckedChange={() => handleToggleFlag(flag)}
                />
              </div>
            ))}
            {flags.length === 0 && (
              <p className="text-center text-slate-500 py-4">Nenhuma flag cadastrada</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Module Modal */}
      <Dialog open={showModuleModal} onOpenChange={setShowModuleModal}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Novo Módulo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-200">Código *</Label>
              <Input
                value={moduleForm.code}
                onChange={(e) => setModuleForm({ ...moduleForm, code: e.target.value })}
                placeholder="Ex: crm_module"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Nome *</Label>
              <Input
                value={moduleForm.name}
                onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })}
                placeholder="Ex: Módulo CRM"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Descrição</Label>
              <Textarea
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModuleModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateModule} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Flag Modal */}
      <Dialog open={showFlagModal} onOpenChange={setShowFlagModal}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Nova Feature Flag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-200">Key *</Label>
              <Input
                value={flagForm.key}
                onChange={(e) => setFlagForm({ ...flagForm, key: e.target.value })}
                placeholder="Ex: new_dashboard"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Nome *</Label>
              <Input
                value={flagForm.name}
                onChange={(e) => setFlagForm({ ...flagForm, name: e.target.value })}
                placeholder="Ex: Novo Dashboard"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Descrição</Label>
              <Textarea
                value={flagForm.description}
                onChange={(e) => setFlagForm({ ...flagForm, description: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFlagModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateFlag} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminModules;
