import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { InvitadoTicketCard } from "@/components/brand/InvitadoTicketCard";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { buildWhatsappSimpleUrl, whatsappTemplates } from "@/lib/whatsapp";
import { getConfiguracion } from "@/lib/constants";
import {
  CheckCircle2,
  Circle,
  MessageCircle,
  Calendar,
  Download,
  LogOut,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AccionesReserva } from "./acciones-reserva";
import { EstadoInvitado, EstadoReserva } from "@prisma/client";

export const metadata = {
  title: "Mi inscripción | Cumbre Impacto",
};

function formatCOP(value: number) {
  return `$ ${value.toLocaleString("es-CO")} COP`;
}

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(d);
}

function formatLocal(telefono: string): string {
  const digits = (telefono ?? "").replace(/\D/g, "");
  if (digits.length < 10) return telefono;
  const d = digits.slice(-10);
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export default async function MiReservaPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?next=/mi-reserva");
  }

  const reserva = await prisma.reserva.findUnique({
    where: { userId: session.user.id },
    include: {
      user: true,
      pagos: { where: { revertido: false }, select: { monto: true } },
      invitados: {
        orderBy: { numero: "asc" },
        include: { mesa: true, taller: true },
      },
    },
  });

  if (!reserva) {
    redirect("/reservar");
  }

  const entrada = reserva.invitados[0] ?? null;
  const cfg = await getConfiguracion();
  const totalAbonado = reserva.pagos.reduce((acc, pago) => acc + pago.monto, 0);
  const saldoPendiente = Math.max(reserva.valorTotal - totalAbonado, 0);
  const waUrl = buildWhatsappSimpleUrl(cfg.organizadorWhatsapp, whatsappTemplates.confirmacionAporte({
    nombre: reserva.user.nombreCompleto,
    telefono: reserva.user.telefono,
    email: reserva.user.email,
    taller: entrada?.taller?.nombre ?? null,
    valorTotal: reserva.valorTotal,
    totalAbonado,
    saldoPendiente,
  }));

  const hasCodigo = !!entrada?.codigo;
  const isCancelado = reserva.estado === EstadoReserva.CANCELADO;
  const isAsistio = reserva.estado === EstadoReserva.ASISTIO;
  const isAportePendiente = reserva.estado === EstadoReserva.PAGO_PENDIENTE;
  const isParcial = reserva.estado === EstadoReserva.PARCIAL;
  const ingresoConfirmado = entrada?.estado === EstadoInvitado.ASISTIO;

  type Step = { key: string; label: string; done: boolean };
  const steps: Step[] = [
    { key: "reg", label: "Inscripción creada", done: true },
    { key: "aporte", label: "Aporte confirmado", done: isParcial || isAsistio },
    { key: "codigo", label: "Código emitido", done: hasCodigo },
    { key: "asistio", label: "Asistió", done: isAsistio },
  ];

  const showStickyCta = !isCancelado && !isAsistio && !hasCodigo;

  return (
    <>
      <SiteHeader />
      <main className={cn("flex-1 px-4", showStickyCta ? "py-6 pb-32" : "py-8 md:py-12")}>
        <div className="container mx-auto max-w-2xl">
          <header className="mb-6 md:mb-8 text-center">
            <p className="font-subhead text-xs md:text-sm uppercase tracking-widest text-ember-bright">
              Tu inscripción
            </p>
            <h1 className="font-display text-2xl md:text-4xl text-cream mt-1.5">
              Hola, {reserva.user.nombreCompleto.split(" ")[0]}
            </h1>
            <p className="text-bone mt-2 md:mt-3 text-sm md:text-base">
              {isCancelado
                ? "Tu inscripción fue cancelada."
                : isAsistio
                ? "Gracias por asistir a la Cumbre."
                : hasCodigo
                ? "Tu ticket ya está listo. Descárgalo y úsalo para ingresar."
                : "Coordina el aporte para activar tu ticket."}
            </p>
          </header>

          {!isCancelado && (
            <ol className="mb-6 md:mb-8 flex items-start justify-between gap-1">
              {steps.map((s, i) => (
                <li key={s.key} className="flex-1 flex flex-col items-center text-center">
                  <div className="flex items-center w-full">
                    {i > 0 && (
                      <div
                        className={cn(
                          "flex-1 h-0.5",
                          s.done && steps[i - 1].done ? "bg-ember-bright" : "bg-taller-iron"
                        )}
                      />
                    )}
                    <div
                      className={cn(
                        "shrink-0 h-9 w-9 md:h-10 md:w-10 rounded-full flex items-center justify-center border-2 transition-colors",
                        s.done ? "bg-ember-rust border-ember-rust" : "bg-taller-steel border-taller-iron"
                      )}
                    >
                      {s.done ? (
                        <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-cream" />
                      ) : (
                        <Circle className="h-4 w-4 md:h-5 md:w-5 text-ash" />
                      )}
                    </div>
                    {i < steps.length - 1 && (
                      <div className={cn("flex-1 h-0.5", steps[i + 1].done ? "bg-ember-bright" : "bg-taller-iron")} />
                    )}
                  </div>
                  <p className={cn("mt-1.5 md:mt-2 font-subhead text-[10px] uppercase tracking-wider leading-tight", s.done ? "text-ember-bright" : "text-ash")}>
                    {s.label}
                  </p>
                </li>
              ))}
            </ol>
          )}

          {!hasCodigo && !isCancelado && entrada && (
            <div className="mt-4 md:mt-6 text-center space-y-2">
              <p className="text-ash text-xs md:text-sm">Inscripción individual:</p>
              <p className="text-bone text-sm font-subhead">
                {entrada.nombreCompleto}{" "}
                <span className="text-ash text-xs font-mono">
                  ({formatLocal(entrada.telefono)})
                </span>
              </p>
            </div>
          )}

          {hasCodigo && entrada && (
            <div className="mt-6 md:mt-8">
              <div className="flex items-center justify-between mb-3 gap-2">
                <p className="font-subhead text-xs uppercase tracking-widest text-ash flex items-center gap-2 min-w-0">
                  <Download className="h-3 w-3 shrink-0" />{" "}
                  <span className="truncate">Ticket personal</span>
                </p>
                <p className="font-display text-xl text-ember-bright shrink-0">
                  {ingresoConfirmado ? 1 : 0}
                  <span className="text-ash text-sm"> / 1</span>
                </p>
              </div>

              <p className="text-ash text-xs text-center mb-3">
                Este código es personal e intransferible.
              </p>

              <InvitadoTicketCard
                numero={entrada.numero}
                nombreCompleto={entrada.nombreCompleto}
                telefono={entrada.telefono}
                codigo={entrada.codigo}
                registradoEn={entrada.registradoEn}
                ultimoReingresoEn={entrada.ultimoReingresoEn}
                reingresos={entrada.reingresos}
                almuerzoEntregadoEn={entrada.almuerzoEntregadoEn}
                refrigerioEntregadoEn={entrada.refrigerioEntregadoEn}
                mesaNumero={entrada.mesa?.numero ?? null}
                silla={entrada.silla}
                estado={entrada.estado}
              />

              {isAsistio && (
                <p className="text-signal-green text-xs mt-4 text-center font-subhead uppercase tracking-widest">
                  Ingreso registrado. Bienvenido a la Cumbre.
                </p>
              )}
            </div>
          )}

          {!hasCodigo && !isCancelado && (
            <div className="mt-5 md:mt-6 text-center">
              <p className="font-display text-2xl md:text-3xl text-ember-bright">
                {formatCOP(reserva.valorTotal)}
              </p>
              <p className="text-ash text-xs mt-1">1 asistente · {formatCOP(reserva.valorTotal)} c/u</p>
              <p className="text-ash text-xs mt-1">
                Abonado: {formatCOP(totalAbonado)} · Saldo: {formatCOP(saldoPendiente)}
              </p>
            </div>
          )}

          {!showStickyCta && !isCancelado && !isAsistio && !hasCodigo && (
            <div className="mt-6 md:mt-8 space-y-4 text-center">
              <p className="text-bone text-sm">
                Coordina el aporte con el equipo organizador por WhatsApp.
              </p>
              {waUrl ? <a href={waUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "whatsapp", size: "lg" }))}>
                <MessageCircle className="h-5 w-5" />
                Comunicarme con el administrador
              </a> : <p className="rounded-md border border-ember-rust/40 p-3 text-sm text-ash">El numero de WhatsApp para pagos todavia no ha sido configurado.</p>}
              <p className="text-ash text-xs">
                Una vez confirmemos el aporte, tu ticket se activa automáticamente.
              </p>
            </div>
          )}

          {showStickyCta && (
            <div className="hidden sm:block mt-6 md:mt-8 space-y-4 text-center">
              <p className="text-bone text-sm">
                Coordina el aporte con el equipo organizador por WhatsApp.
              </p>
              {waUrl ? <a href={waUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "whatsapp", size: "lg" }))}>
                <MessageCircle className="h-5 w-5" />
                Comunicarme con el administrador
              </a> : <p className="rounded-md border border-ember-rust/40 p-3 text-sm text-ash">El numero de WhatsApp para pagos todavia no ha sido configurado.</p>}
            </div>
          )}

          {isAportePendiente && <AccionesReserva />}

          {isAsistio && (
            <div className="mt-6 md:mt-8 text-center">
              <p className="text-bone flex items-center justify-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-ember-bright" />
                Asististe el {reserva.asistioEn && formatDateTime(reserva.asistioEn)}
              </p>
            </div>
          )}

          {isCancelado && reserva.motivoCancelacion && (
            <div className="mt-6 md:mt-8 p-4 rounded-md border border-signal-rust bg-signal-rust/10 text-center">
              <p className="text-ash text-xs uppercase tracking-widest font-subhead">
                Motivo de cancelación
              </p>
              <p className="text-bone text-sm mt-1">{reserva.motivoCancelacion}</p>
            </div>
          )}

          {isCancelado && (
            <div className="mt-6 md:mt-8 text-center">
              <a href="/reservar?editar=1" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
                <Wrench className="h-5 w-5" />
                Inscribirme de nuevo
              </a>
            </div>
          )}

          {showStickyCta && (
            <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 border-t border-taller-iron bg-taller-night/95 backdrop-blur p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
              {waUrl ? <a href={waUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "whatsapp", size: "lg" }), "w-full")}>
                <MessageCircle className="h-5 w-5" />
                Comunicarme con el administrador
              </a> : <p className="text-center text-xs text-ash">WhatsApp de pagos no configurado.</p>}
            </div>
          )}

          <div className="mt-8 md:mt-12 flex flex-col items-center gap-2">
            <form action="/logout" method="POST">
              <Button type="submit" variant="ghost" size="sm" className="text-ash">
                <LogOut className="h-3 w-3" />
                Cerrar sesión
              </Button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
