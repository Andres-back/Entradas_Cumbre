import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getConfiguracion, toValidDate } from "@/lib/constants";
import { ReservarForm, type ReservaPrefill } from "./reservar-form";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { Calendar, MessageCircle, Ticket, Wrench } from "lucide-react";
import { EstadoReserva } from "@prisma/client";

export const metadata = {
  title: "Realiza tu inscripción | Cumbre Impacto",
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

  const reservaExistente = await prisma.reserva.findUnique({
    where: { userId: session.user.id },
    include: { invitados: { orderBy: { numero: "asc" } } },
  });

  const userData = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { nombreCompleto: true, telefono: true },
  });
  const userNombre = userData?.nombreCompleto ?? "";
  const userTelefono = userData?.telefono ?? "";

  if (reservaExistente && !editando) {
    redirect("/mi-reserva");
  }

  if (
    reservaExistente &&
    editando &&
    reservaExistente.estado !== EstadoReserva.PAGO_PENDIENTE &&
    reservaExistente.estado !== EstadoReserva.CANCELADO
  ) {
    redirect("/mi-reserva");
  }

  const prefill: ReservaPrefill | undefined = reservaExistente
    ? {
        editingExisting: reservaExistente.estado === EstadoReserva.PAGO_PENDIENTE,
      }
    : undefined;

  const cfg = await getConfiguracion();
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
      title: "Realiza tu inscripción",
      desc: "Reserva tu cupo personal en la app.",
    },
    {
      icon: MessageCircle,
      title: "Coordina el aporte",
      desc: "El equipo organizador te comparte los datos por WhatsApp.",
    },
    {
      icon: Ticket,
      title: "Recibe tu código",
      desc: "Al confirmar el aporte, se activa tu código de entrada.",
    },
    {
      icon: Calendar,
      title: "Llega al Cumbre",
      desc: `${fechaFmt} · ${horaFmt}${lugarFmt}.`,
    },
  ];

  return (
    <>
      <SiteHeader />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-2xl">
          <header className="mb-8 text-center">
            <p className="font-subhead text-sm uppercase tracking-widest text-ember-bright">
              Cumbre Impacto
            </p>
            <h1 className="font-display text-4xl md:text-5xl text-cream mt-2">
              {prefill?.editingExisting ? "Edita tu inscripción" : "Realiza tu inscripción"}
            </h1>
            <p className="text-bone mt-3 max-w-md mx-auto">
              {prefill?.editingExisting
                ? "Actualiza tu cupo personal. No se crean invitados ni grupos."
                : "Cada persona debe registrarse de forma individual. Esta inscripción es solo para ti."}
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
                  <p className="text-ash text-[11px] leading-snug">{p.desc}</p>
                </li>
              );
            })}
          </ol>

          {prefill?.editingExisting && (
            <div className="mb-6 p-3 rounded-md border border-ember-rust/40 bg-ember-rust/5 text-bone text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4 text-ember-bright shrink-0" />
              <span>
                Estás editando una inscripción existente. Los cambios se aplican sobre la misma.
              </span>
            </div>
          )}

          <ReservarForm
            prefill={prefill}
            userNombre={userNombre}
            userTelefono={userTelefono}
            precioPorPersona={cfg.precioPorPersona}
          />
        </div>
      </main>
    </>
  );
}
