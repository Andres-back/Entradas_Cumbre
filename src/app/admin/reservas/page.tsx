import Link from "next/link";
import { prisma } from "@/lib/db";
import { EstadoReserva } from "@prisma/client";
import ReservasTable from "./reservas-table";

export const metadata = {
  title: "Reservas | Admin",
};

type Filtro = "TODOS" | "PAGO_PENDIENTE" | "PARCIAL" | "ASISTIO" | "CANCELADO";

export default async function AdminReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const params = await searchParams;
  const filtroEstado = (params.estado ?? "TODOS") as Filtro;

  const where =
    filtroEstado === "TODOS"
      ? {}
      : { estado: filtroEstado as EstadoReserva };

  const reservas = await prisma.reserva.findMany({
    where,
    orderBy: { creadaEn: "desc" },
    include: {
      user: { select: { nombreCompleto: true, telefono: true, email: true } },
      invitados: {
        orderBy: { numero: "asc" },
        include: { mesa: true },
      },
    },
  });

  const tabs: { value: Filtro; label: string }[] = [
    { value: "TODOS", label: "Todos" },
    { value: "PAGO_PENDIENTE", label: "Pago pendiente" },
    { value: "PARCIAL", label: "Pago parcial" },
    { value: "ASISTIO", label: "Asistió" },
    { value: "CANCELADO", label: "Cancelado" },
  ];

  return (
    <main className="px-3 py-4 md:px-8 md:py-8">
      <div className="mb-4 md:mb-6">
        <p className="text-ash text-sm md:text-base uppercase tracking-widest font-subhead">
          Gestión
        </p>
        <h1 className="font-display text-2xl md:text-3xl text-cream mt-1">
          Reservas
        </h1>
        <p className="text-bone text-base md:text-lg mt-1">
          {reservas.length} {reservas.length === 1 ? "reserva" : "reservas"}
        </p>
      </div>

      <div className="mb-4 md:mb-6 flex gap-1.5 md:gap-2 overflow-x-auto pb-2 -mx-3 px-3 md:mx-0 md:px-0">
        {tabs.map((t) => {
          const active = filtroEstado === t.value;
          return (
            <Link
              key={t.value}
              href={t.value === "TODOS" ? "/admin/reservas" : `/admin/reservas?estado=${t.value}`}
              className={
                active
                  ? "px-3 py-2 md:py-1.5 rounded-md text-base font-subhead uppercase tracking-wider bg-ember-rust text-cream whitespace-nowrap"
                  : "px-3 py-2 md:py-1.5 rounded-md text-base font-subhead uppercase tracking-wider bg-taller-steel text-bone hover:border hover:border-ember-rust whitespace-nowrap"
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <ReservasTable reservas={reservas} />
    </main>
  );
}
