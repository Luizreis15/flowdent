import { ChevronRight, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MobileAlertsProps {
  clinicId: string;
  pendingCount: number;
}

interface Alert {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  action: () => void;
}

const MobileAlerts = ({ clinicId, pendingCount }: MobileAlertsProps) => {
  const navigate = useNavigate();

  const alerts: Alert[] = [];

  if (pendingCount > 0) {
    alerts.push({
      id: "pending-confirmations",
      icon: Clock,
      title: `${pendingCount} confirmação${pendingCount > 1 ? "ões" : ""} pendente${pendingCount > 1 ? "s" : ""}`,
      subtitle: "Pacientes aguardando confirmação",
      colorClass: "text-sinal-espera",
      bgClass: "bg-sinal-espera-tenue",
      borderClass: "border-l-sinal-espera",
      action: () => navigate("/dashboard/agenda"),
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="px-4 mb-5">
      <h2 className="text-label text-muted-foreground mb-2">Alertas</h2>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <button
            key={alert.id}
            onClick={alert.action}
            className={`w-full flex items-center gap-3 p-3 rounded-card border-l-4 ${alert.bgClass} ${alert.borderClass} press-scale text-left shadow-sm`}
          >
            <div className={`p-2 rounded-btn bg-white/80 ${alert.colorClass}`}>
              <alert.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body font-semibold text-foreground truncate">{alert.title}</p>
              <p className="text-caption text-muted-foreground truncate">{alert.subtitle}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileAlerts;
