import { Calendar, DollarSign, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Metric {
  label: string;
  value: string | number;
  color: string;
  type?: "appointments" | "revenue" | "patients" | "pending";
}

interface MobileMetricsProps {
  metrics: Metric[];
}

const getMetricConfig = (type: string) => {
  switch (type) {
    case "appointments":
      return {
        bgClass: "bg-acao-tenue",
        borderClass: "border-l-primary",
        textClass: "text-primary",
        icon: Calendar,
      };
    case "revenue":
      return {
        bgClass: "bg-sinal-ok-tenue",
        borderClass: "border-l-sinal-ok",
        textClass: "text-sinal-ok",
        icon: DollarSign,
      };
    case "patients":
      return {
        bgClass: "bg-acento-50",
        borderClass: "border-l-acento-600",
        textClass: "text-acento-600",
        icon: Users,
      };
    case "pending":
      return {
        bgClass: "bg-sinal-espera-tenue",
        borderClass: "border-l-sinal-espera",
        textClass: "text-sinal-espera",
        icon: Clock,
      };
    default:
      return {
        bgClass: "bg-card",
        borderClass: "border-l-border",
        textClass: "text-foreground",
        icon: Calendar,
      };
  }
};

const MobileMetrics = ({ metrics }: MobileMetricsProps) => {
  return (
    <div className="w-full max-w-full px-4 overflow-hidden">
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {metrics.map((metric, index) => {
          const config = getMetricConfig(metric.type || "");
          const Icon = config.icon;
          
          return (
            <div
              key={index}
              className={cn(
                "min-w-[130px] min-h-[80px] flex-shrink-0 rounded-card border-l-4 p-3 snap-start",
                "shadow-sm transition-shadow hover:shadow-md",
                config.bgClass,
                config.borderClass
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("p-1.5 rounded-btn bg-white/60", config.textClass)}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-caption text-foreground/70 truncate max-w-[70px]">
                  {metric.label}
                </span>
              </div>
              <p className={cn("text-xl font-bold", config.textClass)}>
                {metric.value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MobileMetrics;
