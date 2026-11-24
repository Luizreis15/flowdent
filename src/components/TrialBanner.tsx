import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface TrialBannerProps {
  daysLeft: number;
}

export default function TrialBanner({ daysLeft }: TrialBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const hiddenUntil = localStorage.getItem("trialBannerHiddenUntil");
    if (hiddenUntil) {
      const hiddenDate = new Date(hiddenUntil);
      if (hiddenDate > new Date()) {
        setIsVisible(false);
      } else {
        localStorage.removeItem("trialBannerHiddenUntil");
      }
    }
  }, []);

  const handleClose = () => {
    const hiddenUntil = new Date();
    hiddenUntil.setHours(hiddenUntil.getHours() + 24);
    localStorage.setItem("trialBannerHiddenUntil", hiddenUntil.toISOString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Sparkles className="h-5 w-5 shrink-0" />
            <p className="text-sm md:text-base font-medium">
              Seu Teste Grátis expira em <strong>{daysLeft} dias</strong>. 
              Não perca o controle da sua clínica!
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/dashboard/assinatura")}
              className="shrink-0 bg-white text-yellow-700 hover:bg-white/90"
            >
              Assinar agora
            </Button>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-white/20 rounded transition-colors shrink-0"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
