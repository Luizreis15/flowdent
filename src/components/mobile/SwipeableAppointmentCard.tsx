import { useState, useRef, memo } from "react";
import { useDrag } from "@use-gesture/react";
import { animated, useSpring } from "@react-spring/web";
import { Check, X, MessageCircle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SwipeableAppointmentCardProps {
  appointment: {
    id: string;
    appointment_date: string;
    title: string;
    status: string | null;
    patient_id: string;
    patients: { full_name: string } | null;
    profissionais: { nome: string } | null;
  };
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onSendMessage: (id: string, patientId: string) => void;
  onClick: () => void;
}

const SWIPE_THRESHOLD = 80;

const getStatusConfig = (status: string | null) => {
  switch (status?.toLowerCase()) {
    case "confirmed":
    case "confirmado":
      return {
        variant: "default" as const,
        label: "Confirmado",
        borderClass: "border-l-sinal-ok",
        bgClass: "bg-sinal-ok-tenue",
        avatarClass: "bg-sinal-ok/20 text-sinal-ok",
      };
    case "cancelled":
    case "cancelado":
      return {
        variant: "destructive" as const,
        label: "Cancelado",
        borderClass: "border-l-sinal-alerta",
        bgClass: "bg-sinal-espera-tenue",
        avatarClass: "bg-sinal-alerta/20 text-sinal-alerta",
      };
    case "completed":
    case "concluido":
      return {
        variant: "secondary" as const,
        label: "Concluído",
        borderClass: "border-l-muted-foreground",
        bgClass: "bg-muted/50",
        avatarClass: "bg-muted text-muted-foreground",
      };
    case "scheduled":
    case "agendado":
      return {
        variant: "outline" as const,
        label: "Agendado",
        borderClass: "border-l-primary",
        bgClass: "bg-acao-tenue",
        avatarClass: "bg-primary/20 text-primary",
      };
    case "no_show":
      return {
        variant: "destructive" as const,
        label: "Faltou",
        borderClass: "border-l-sinal-alerta",
        bgClass: "bg-sinal-espera-tenue",
        avatarClass: "bg-sinal-alerta/20 text-sinal-alerta",
      };
    case "waiting":
      return {
        variant: "outline" as const,
        label: "Aguardando",
        borderClass: "border-l-sinal-espera",
        bgClass: "bg-sinal-espera-tenue",
        avatarClass: "bg-sinal-espera/20 text-sinal-espera",
      };
    default:
      return {
        variant: "outline" as const,
        label: status || "Pendente",
        borderClass: "border-l-sinal-espera",
        bgClass: "bg-sinal-espera-tenue",
        avatarClass: "bg-sinal-espera/20 text-sinal-espera",
      };
  }
};

const SwipeableAppointmentCard = memo(({
  appointment,
  onConfirm,
  onCancel,
  onSendMessage,
  onClick,
}: SwipeableAppointmentCardProps) => {
  const [swiped, setSwiped] = useState<"left" | "right" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [{ x }, api] = useSpring(() => ({ x: 0 }));

  const bind = useDrag(
    ({ down, movement: [mx], direction: [xDir] }) => {
      if (swiped) return;
      const clampedX = Math.max(-120, Math.min(120, mx));

      if (!down) {
        if (Math.abs(mx) > SWIPE_THRESHOLD) {
          const direction = xDir > 0 ? "right" : "left";
          setSwiped(direction);
          api.start({ x: direction === "right" ? 120 : -120 });

          setTimeout(() => {
            setSwiped(null);
            api.start({ x: 0 });
          }, 300);

          if (direction === "right") {
            onConfirm(appointment.id);
          } else {
            onCancel(appointment.id);
          }
        } else {
          api.start({ x: 0 });
        }
      } else {
        api.start({ x: clampedX, immediate: true });
      }
    },
    { axis: "x", filterTaps: true }
  );

  const statusConfig = getStatusConfig(appointment.status);
  const patient = appointment.patients;
  const professional = appointment.profissionais;
  const patientInitials = patient?.full_name
    ? patient.full_name.split(" ").map(n => n[0]).slice(0, 2).join("")
    : "P";

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-card min-h-[72px]">
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        <div className="flex-1 bg-gradient-to-r from-sinal-ok to-emerald-500 flex items-center justify-start px-4">
          <div className="flex items-center gap-2 text-white">
            <div className="p-2 rounded-full bg-white/20">
              <Check className="h-5 w-5" />
            </div>
            <span className="text-body font-medium">Confirmar</span>
          </div>
        </div>
        <div className="flex-1 bg-gradient-to-l from-sinal-alerta to-red-500 flex items-center justify-end px-4">
          <div className="flex items-center gap-2 text-white">
            <span className="text-body font-medium">Cancelar</span>
            <div className="p-2 rounded-full bg-white/20">
              <X className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main card */}
      <animated.div
        {...bind()}
        style={{ x, touchAction: "pan-y" }}
        className="relative"
      >
        <div
          className={cn(
            "cursor-pointer press-scale border-l-4 border-none shadow-sm rounded-card",
            statusConfig.borderClass,
            statusConfig.bgClass
          )}
          onClick={onClick}
        >
          <div className="p-3 flex items-center gap-3">
            <div className={cn(
              "h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-caption",
              statusConfig.avatarClass
            )}>
              {patientInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-body text-foreground truncate">
                {patient?.full_name || "Paciente"}
              </p>
              <p className="text-caption text-muted-foreground truncate">
                {appointment.title}
                {professional ? ` • ${professional.nome}` : ""}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-body text-foreground">
                {format(parseISO(appointment.appointment_date), "HH:mm", { locale: ptBR })}
              </p>
              <Badge variant={statusConfig.variant} className="chip mt-0.5">
                {statusConfig.label}
              </Badge>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSendMessage(appointment.id, appointment.patient_id);
                }}
                className="p-2 rounded-full hover:bg-white/50 transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-primary" />
              </button>
              <ChevronRight className="h-4 w-4 text-foreground/30" />
            </div>
          </div>
        </div>
      </animated.div>
    </div>
  );
});

SwipeableAppointmentCard.displayName = "SwipeableAppointmentCard";

export default SwipeableAppointmentCard;
