import { cn } from "@/lib/utils";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { TypewriterCode } from "./TypewriterCode";

export type TicketEstado = "pendiente" | "confirmado" | "asistio" | "cancelado";

interface TicketStubProps {
  nombre: string;
  codigo?: string | null;
  fecha?: string;
  hora?: string;
  estado?: TicketEstado;
  className?: string;
  /** Si true, anima el codigo con typewriter. Default: true si hay codigo. */
  typewriter?: boolean;
}

const estadoLabel: Record<TicketEstado, string> = {
  pendiente: "Pendiente de pago",
  confirmado: "Listo para entrar",
  asistio: "Asististe",
  cancelado: "Cancelado",
};

const estadoVariant: Record<TicketEstado, BadgeVariant> = {
  pendiente: "pending",
  confirmado: "paid",
  asistio: "success",
  cancelado: "cancelled",
};

const estadoDot: Record<TicketEstado, string> = {
  pendiente: "bg-signal-rust",
  confirmado: "bg-ember-bright",
  asistio: "bg-signal-green",
  cancelado: "bg-ash",
};

/**
 * Ticket stub para /mi-reserva.
 * Perforacion lateral estilo ticket viejo, codigo mono vintage,
 * badge de estado con dot pulsante.
 */
export function TicketStub({
  nombre,
  codigo,
  fecha = "Sábado 20 de junio",
  hora = "6:00 pm",
  estado = "pendiente",
  className,
  typewriter = true,
}: TicketStubProps) {
  return (
    <article
      className={cn(
        "relative bg-taller-steel border border-taller-iron rounded-lg overflow-hidden shadow-card",
        className
      )}
    >
      {/* Perforacion izquierda */}
      <div className="absolute left-0 top-0 bottom-0 w-3 flex flex-col justify-around pointer-events-none">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-taller-night -translate-x-1/2"
          />
        ))}
      </div>

      <div className="p-8 pl-10">
        <p className="font-subhead text-xs uppercase tracking-widest text-ember-bright">
          Reserva
        </p>
        <h2 className="font-display text-3xl text-cream mt-1">BAJO EL CAPÓ</h2>
        <p className="text-bone text-sm mt-1">
          {fecha} &middot; {hora}
        </p>

        <div className="mt-4">
          <p className="text-ash text-xs uppercase tracking-widest">Hola,</p>
          <p className="font-display text-xl text-cream">{nombre}</p>
        </div>

        <div className="mt-6 pt-6 border-t border-dashed border-taller-iron">
          <p className="text-ash text-xs uppercase tracking-widest">Tu llave</p>
          {codigo && typewriter ? (
            <p className="font-mono text-2xl md:text-3xl text-ember-bright tracking-widest mt-1">
              <TypewriterCode text={codigo} />
            </p>
          ) : (
            <p className="font-mono text-2xl md:text-3xl text-ember-bright tracking-widest mt-1">
              {codigo ?? "— — — — — — — —"}
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              estadoDot[estado],
              estado === "confirmado" && "animate-ember-pulse"
            )}
          />
          <Badge variant={estadoVariant[estado]}>{estadoLabel[estado]}</Badge>
        </div>
      </div>
    </article>
  );
}
