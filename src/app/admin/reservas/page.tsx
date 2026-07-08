import Link from "next/link";
import { prisma } from "@/lib/db";
import { EstadoReserva } from "@prisma/client";
import ReservasTable from "./reservas-table";

export const metadata = {
  title: "Inscripciones | Admin",
};

type Filtro = "TODOS" | "PAGO_PENDIENTE" | "PARCIAL" | "ASISTIO" | "CANCELADO";

export default async function AdminReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; tallerId?: string }>;
}) {
  const params = await searchParams;
  const filtroEstado = (params.estado ?? "TODOS") as Filtro;
  const tallerId = params.tallerId ?? "TODOS";
  const query = new URLSearchParams();
  if (filtroEstado !== "TODOS") query.set("estado", filtroEstado);
  if (tallerId !== "TODOS") query.set("tallerId", tallerId);
  const exportHref = `/admin/reservas/export${query.toString() ? `?${query}` : ""}`;

  const where = {
    ...(filtroEstado === "TODOS" ? {} : { estado: filtroEstado as EstadoReserva }),
    ...(tallerId === "TODOS" ? {} : tallerId === "SIN_TALLER" ? { user: { tallerId: null } } : { user: { tallerId } }),
  };

  const [reservas, talleres] = await Promise.all([
    prisma.reserva.findMany({
      where,
      orderBy: { creadaEn: "desc" },
      include: {
        user: { select: { nombreCompleto: true, telefono: true, email: true, taller: { select: { nombre: true } } } },
        invitados: {
          orderBy: { numero: "asc" },
          include: { mesa: true, taller: { select: { nombre: true } } },
        },
        pagos: {
          where: { revertido: false },
          select: { monto: true },
        },
      },
    }),
    prisma.taller.findMany({
      orderBy: [{ activo: "desc" }, { orden: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, activo: true },
    }),
  ]);

  const tabs: { value: Filtro; label: string }[] = [
    { value: "TODOS", label: "Todos" },
    { value: "PAGO_PENDIENTE", label: "Aporte pendiente" },
    { value: "PARCIAL", label: "Aporte parcial" },
    { value: "ASISTIO", label: "Asistió" },
    { value: "CANCELADO", label: "Cancelado" },
  ];

  return (
    <main className="px-3 py-4 md:px-8 md:py-8">
      <div className="mb-4 flex flex-col gap-4 md:mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-ash text-sm md:text-base uppercase tracking-widest font-subhead">
            Gestión
          </p>
          <h1 className="font-display text-2xl md:text-3xl text-cream mt-1">
            Inscripciones
          </h1>
          <p className="text-bone text-base md:text-lg mt-1">
            {reservas.length} {reservas.length === 1 ? "persona" : "personas"}
          </p>
        </div>
        <Link
          href="/admin/inscripciones/nueva"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-ember-rust px-4 font-subhead uppercase tracking-wider text-cream"
        >
          + Inscribir persona
        </Link>
        <Link
          href={exportHref}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-ember-rust/40 px-4 font-subhead uppercase tracking-wider text-bone"
        >
          Exportar CSV
        </Link>
      </div>

      <div className="mb-4 grid gap-3 rounded-md border border-taller-iron bg-taller-steel/30 p-3 md:mb-6 md:grid-cols-2">
        <FilterSelect label="Estado" name="estado" value={filtroEstado} tallerId={tallerId} options={tabs.map((t) => ({ value: t.value, label: t.label }))} />
        <FilterSelect
          label="Taller"
          name="tallerId"
          value={tallerId}
          estado={filtroEstado}
          options={[
            { value: "TODOS", label: "Todos los talleres" },
            { value: "SIN_TALLER", label: "Sin taller" },
            ...talleres.map((t) => ({ value: t.id, label: `${t.nombre}${t.activo ? "" : " (inactivo)"}` })),
          ]}
        />
      </div>

      <ReservasTable reservas={reservas} />
    </main>
  );
}

function FilterSelect({
  label,
  name,
  value,
  estado,
  tallerId,
  options,
}: {
  label: string;
  name: "estado" | "tallerId";
  value: string;
  estado?: string;
  tallerId?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <form action="/admin/reservas" className="block">
      {name !== "estado" && <input type="hidden" name="estado" value={estado ?? "TODOS"} />}
      {name !== "tallerId" && <input type="hidden" name="tallerId" value={tallerId ?? "TODOS"} />}
      <label className="block">
        <span className="mb-1 block font-subhead text-xs uppercase tracking-widest text-ash">{label}</span>
        <select
          name={name}
          defaultValue={value}
          className="h-11 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-bone"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button className="mt-2 min-h-10 rounded-md border border-ember-rust/40 px-3 font-subhead text-xs uppercase tracking-wider text-bone">
          Aplicar
        </button>
      </label>
    </form>
  );
}
