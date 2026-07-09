import Link from "next/link";
import { prisma } from "@/lib/db";
import { parseReservaFilters, buildReservaWhere } from "@/lib/inscripcion-service";
import { ROL_PIC_LABELS, ROL_PIC_OPTIONS } from "@/lib/pic";
import ReservasTable from "./reservas-table";

export const metadata = { title: "Inscripciones | Admin" };

function normalizeIglesia(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default async function AdminReservasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const filters = parseReservaFilters(params);

  const where = buildReservaWhere(filters);

  const [reservas, talleres, iglesiasRaw] = await Promise.all([
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
    prisma.user.findMany({
      where: { iglesia: { not: null }, reserva: { isNot: null } },
      select: { iglesia: true },
      distinct: ["iglesia"],
    }),
  ]);

  const iglesiaMap = new Map<string, string>();
  for (const u of iglesiasRaw) {
    if (!u.iglesia) continue;
    const key = normalizeIglesia(u.iglesia);
    if (!iglesiaMap.has(key)) iglesiaMap.set(key, u.iglesia);
  }
  const iglesias = Array.from(iglesiaMap.values()).sort((a, b) => a.localeCompare(b));

  function q(extra: Record<string, string>): string {
    const merged = { ...params, ...extra };
    const clean = Object.fromEntries(Object.entries(merged).filter(([, v]) => v && v !== "TODOS"));
    const usp = new URLSearchParams(clean);
    return usp.toString() ? `?${usp}` : "";
  }

  const tabs = [
    { value: "", label: "Todos" },
    { value: "PAGO_PENDIENTE", label: "Aporte pendiente" },
    { value: "PARCIAL", label: "Aporte parcial" },
    { value: "ASISTIO", label: "Asistió" },
    { value: "CANCELADO", label: "Cancelado" },
  ];

  return (
    <main className="px-3 py-4 md:px-8 md:py-8">
      <div className="mb-4 flex flex-col gap-4 md:mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-ash text-sm md:text-base uppercase tracking-widest font-subhead">Gestión</p>
          <h1 className="font-display text-2xl md:text-3xl text-cream mt-1">Inscripciones</h1>
          <p className="text-bone text-base md:text-lg mt-1">
            {reservas.length} {reservas.length === 1 ? "persona" : "personas"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/reservas/export${q({})}`}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-ember-rust/40 px-4 font-subhead uppercase tracking-wider text-bone"
          >
            Exportar CSV
          </Link>
          <Link
            href="/admin/inscripciones/nueva"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-ember-rust px-4 font-subhead uppercase tracking-wider text-cream"
          >
            + Inscribir persona
          </Link>
        </div>
      </div>

      <form action="/admin/reservas" className="mb-4 grid gap-3 rounded-md border border-taller-iron bg-taller-steel/30 p-3 md:grid-cols-3 lg:grid-cols-5">
        <div>
          <label className="block">
            <span className="mb-1 block font-subhead text-xs uppercase tracking-widest text-ash">Buscar</span>
            <input
              name="search"
              defaultValue={params.search ?? ""}
              placeholder="Nombre, correo, documento..."
              className="h-11 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-bone"
            />
          </label>
        </div>
        <div>
          <label className="block">
            <span className="mb-1 block font-subhead text-xs uppercase tracking-widest text-ash">Estado</span>
            <select name="estadoPago" defaultValue={params.estadoPago ?? "TODOS"} className="h-11 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-bone">
              {tabs.map((t) => (
                <option key={t.value} value={t.value || "TODOS"}>{t.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <label className="block">
            <span className="mb-1 block font-subhead text-xs uppercase tracking-widest text-ash">Rol PIC</span>
            <select name="rolPic" defaultValue={params.rolPic ?? "TODOS"} className="h-11 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-bone">
              <option value="TODOS">Todos los roles</option>
              <option value="__PENDIENTE__">Campo pendiente</option>
              {ROL_PIC_OPTIONS.map((rol) => (
                <option key={rol} value={rol}>{ROL_PIC_LABELS[rol]}</option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <label className="block">
            <span className="mb-1 block font-subhead text-xs uppercase tracking-widest text-ash">Iglesia</span>
            <select name="iglesia" defaultValue={params.iglesia ?? "TODOS"} className="h-11 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-bone">
              <option value="TODOS">Todas las iglesias</option>
              <option value="__PENDIENTE__">Campo pendiente</option>
              {iglesias.map((ig) => (
                <option key={ig} value={ig}>{ig}</option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <label className="block">
            <span className="mb-1 block font-subhead text-xs uppercase tracking-widest text-ash">Taller</span>
            <select name="tallerId" defaultValue={params.tallerId ?? "TODOS"} className="h-11 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-bone">
              <option value="TODOS">Todos los talleres</option>
              <option value="SIN_TALLER">Sin taller</option>
              {talleres.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}{t.activo ? "" : " (inactivo)"}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="md:col-span-3 lg:col-span-5 flex gap-2">
          <button className="min-h-10 rounded-md bg-ember-rust px-4 font-subhead text-xs uppercase tracking-wider text-cream">
            Aplicar filtros
          </button>
          <Link
            href="/admin/reservas"
            className="min-h-10 inline-flex items-center rounded-md border border-taller-iron px-4 font-subhead text-xs uppercase tracking-wider text-ash"
          >
            Limpiar filtros
          </Link>
        </div>
      </form>

      <ReservasTable reservas={reservas} />
    </main>
  );
}
