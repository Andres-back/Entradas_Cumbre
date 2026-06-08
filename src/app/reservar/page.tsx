import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getConfiguracion, toValidDate } from "@/lib/constants";
import { ReservarForm, type ReservaPrefill } from "./reservar-form";
import { AgregarInvitadosForm } from "./agregar-form";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { Calendar, MessageCircle, Ticket, Wrench } from "lucide-react";
import { EstadoReserva } from "@prisma/client";

export const metadata = {
  title: "Saca tu llave | Bajo el Capó",
};

export default async function ReservarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/registro?next=/reservar");
  }

  const sp = await searchParams;
  const editando = sp.editar === "1";
  const agregando = sp.agregar === "1";

  const reservaExistente = await prisma.reserva.findUnique({
    where: { userId: session.user.id },
    include: { invitados: { orderBy: { numero: "asc" } } },
  });

  // Datos del titular para el mensaje de WhatsApp que se construye en
  // el cliente tras el success (ver `buildWhatsappConfirmacionUrl`).
  const userData = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { nombreCompleto: true, telefono: true },
  });
  const userNombre = userData?.nombreCompleto ?? "";
  const userTelefono = userData?.telefono ?? "";

  // Si NO hay reserva, siempre mostramos el form (nueva reserva).
  if (!reservaExistente) {
    // nada, seguimos al form mas abajo.
  }
  // Modo agregar personas: requiere reserva en PARCIAL o PAGO_PENDIENTE
  else if (agregando) {
    if (
      reservaExistente.estado !== EstadoReserva.PARCIAL &&
      reservaExistente.estado !== EstadoReserva.PAGO_PENDIENTE
    ) {
      redirect("/mi-reserva");
    }
    // sigue al form de agregar mas abajo
  }
  // Si hay reserva y NO es modo edicion, redirigir a mi-reserva.
  else if (!editando) {
    redirect("/mi-reserva");
  }
  // Si hay reserva y estamos en modo edicion, solo permitir PAGO_PENDIENTE o CANCELADO.
  else if (
    reservaExistente.estado !== EstadoReserva.PAGO_PENDIENTE &&
    reservaExistente.estado !== EstadoReserva.CANCELADO
  ) {
    redirect("/mi-reserva");
  }
  // else: modo edicion + reserva en PAGO_PENDIENTE o CANCELADO → prefillamos.

  // Si esta PAGO_PENDIENTE o CANCELADO (modo edicion), prefillamos el form
  // con los datos actuales. CANCELADO ademas se re-anima al enviar.
  const prefill: ReservaPrefill | undefined = reservaExistente
    ? {
        cantidad: reservaExistente.invitados.length,
        invitados: reservaExistente.invitados
          .filter((i) => i.numero > 0)
          .map((i) => ({
            nombreCompleto: i.nombreCompleto,
            telefono: stripCountryCode(i.telefono),
          })),
        editingExisting: reservaExistente.estado === EstadoReserva.PAGO_PENDIENTE,
      }
    : undefined;

  const cfg = await getConfiguracion();
  // Re-hidratar por si unstable_cache serializo la fecha a string.
  const fechaCfg = toValidDate(cfg.fecha, new Date("2026-06-20T18:00:00-05:00"));
  const fechaFmt = fechaCfg.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const horaFmt = fechaCfg.toLocaleTimeString("es-CO", {
    hour: "numeric",
    minute: "2-digit",
  });
  const lugarFmt = cfg.barrio ? ` · ${cfg.barrio}` : "";

  const pasos = [
    {
      icon: Wrench,
      title: "Saca tu llave",
      desc: "Reserva tu cupo aquí en la app.",
    },
    {
      icon: MessageCircle,
      title: "Coordina el pago",
      desc: "Fredy te comparte los datos por WhatsApp.",
    },
    {
      icon: Ticket,
      title: "Recibe tu código",
      desc: "Una vez confirmemos el pago, activas tu código de entrada.",
    },
    {
      icon: Calendar,
      title: "Llega al taller",
      desc: `${fechaFmt} · ${horaFmt}${lugarFmt}.`,
    },
  ];

  return (
    <>
      <SiteHeader />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-2xl">
          {agregando ? (
            <>
              <header className="mb-8 text-center">
                <p className="font-subhead text-sm uppercase tracking-widest text-ember-bright">
                  Bajo el Capó
                </p>
                <h1 className="font-display text-4xl md:text-5xl text-cream mt-2">
                  Agregar personas
                </h1>
                <p className="text-bone mt-3 max-w-md mx-auto">
                  Sumá más personas a tu grupo. Las que ya están no se modifican.
                </p>
              </header>
              <AgregarInvitadosForm
                precioPorPersona={cfg.precioPorPersona}
                actuales={reservaExistente!.invitados.length}
              />
            </>
          ) : (
            <>
              <header className="mb-8 text-center">
                <p className="font-subhead text-sm uppercase tracking-widest text-ember-bright">
                  Bajo el Capó
                </p>
                <h1 className="font-display text-4xl md:text-5xl text-cream mt-2">
                  {prefill?.editingExisting ? "Edita tu reserva" : "Saca tu llave"}
                </h1>
                <p className="text-bone mt-3 max-w-md mx-auto">
                  {prefill?.editingExisting
                    ? "Cambia la cantidad de personas o los nombres. Tu cupo se mantiene."
                    : "Esto es lo que pasa después. Si te late, sigue."}
                </p>
              </header>

              <ol className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
            {pasos.map((p, i) => {
              const Icon = p.icon;
              return (
                <li
                  key={p.title}
                  className="relative flex flex-col items-center gap-2 p-3 rounded-md border border-taller-iron bg-taller-steel/60 text-center"
                >
                  <span className="absolute -top-2 -left-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ember-rust font-subhead text-xs text-cream">
                    {i + 1}
                  </span>
                  <Icon className="h-6 w-6 text-ember-bright" strokeWidth={1.5} />
                  <p className="font-subhead text-xs uppercase tracking-wider text-bone">
                    {p.title}
                  </p>
                  <p className="text-ash text-[11px] leading-snug">
                    {p.desc}
                  </p>
                </li>
              );
            })}
          </ol>

          {prefill?.editingExisting && (
            <div className="mb-6 p-3 rounded-md border border-ember-rust/40 bg-ember-rust/5 text-bone text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4 text-ember-bright shrink-0" />
              <span>
                Estás editando una reserva existente. Los cambios se aplican
                sobre la misma (no se crea una nueva).
              </span>
            </div>
          )}

          <ReservarForm
            prefill={prefill}
            userNombre={userNombre}
            userTelefono={userTelefono}
            precioPorPersona={cfg.precioPorPersona}
          />
          </>
          )}
        </div>
      </main>
    </>
  );
}

/** Quita cualquier prefijo (+57, 57, +, espacios) y deja solo los 10 digitos. */
function stripCountryCode(s: string): string {
  return s.replace(/\D/g, "").slice(-10);
}
