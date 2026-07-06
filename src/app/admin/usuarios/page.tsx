import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ADMIN_EMAIL } from "@/lib/constants";
import { ResetPwdButton } from "./reset-button";
import {
  CrearUsuarioButton,
  EditarUsuarioButton,
  EliminarUsuarioButton,
} from "./user-crud";
import { Users, Mail, Phone, Calendar, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Usuarios | Admin | Cumbre Impacto",
};

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "short" }).format(d);
}

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?from=/admin/usuarios");
  if (session.user.email !== ADMIN_EMAIL) redirect("/login?from=/admin");

  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const where = query
    ? {
        OR: [
          { nombreCompleto: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query.toLowerCase() } },
          { telefono: { contains: query.replace(/\s+/g, "") } },
        ],
      }
    : {};

  const usuarios = await prisma.user.findMany({
    where,
    select: {
      id: true,
      nombreCompleto: true,
      email: true,
      telefono: true,
      rol: true,
      debeCambiarContrasena: true,
      creadoEn: true,
      reserva: {
        select: {
          id: true,
          estado: true,
          invitados: { select: { id: true, codigo: true } },
        },
      },
    },
    orderBy: { creadoEn: "desc" },
    take: 200,
  });

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-ember-bright" />
          <div>
            <h1 className="font-display text-2xl md:text-3xl text-cream">
              Usuarios
            </h1>
            <p className="text-ash text-lg">
              {usuarios.length} {usuarios.length === 1 ? "registrado" : "registrados"}
              {query && ` (buscando "${query}")`}
            </p>
          </div>
        </div>
        <CrearUsuarioButton />
      </div>

      {/* Buscador */}
      <form className="mb-6 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          type="search"
          placeholder="Buscar por nombre, email o teléfono..."
          className="flex-1 rounded-md border border-taller-iron bg-taller-night/60 px-3 py-2 text-bone placeholder:text-ash/60 focus:border-ember-bright focus:outline-none focus:ring-1 focus:ring-ember-bright/40 font-body text-lg"
        />
        <button
          type="submit"
          className="rounded-md bg-ember-rust px-4 py-2 text-cream font-subhead text-lg uppercase tracking-wider hover:bg-ember-bright transition-colors"
        >
          Buscar
        </button>
      </form>

      {usuarios.length === 0 ? (
        <div className="rounded-md border border-taller-iron bg-taller-steel/50 p-8 text-center">
          <p className="text-ash">
            {query
              ? `No encontré usuarios con "${query}".`
              : "Aún no hay usuarios registrados."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop: tabla */}
          <div className="hidden md:block rounded-md border border-taller-iron bg-taller-steel/50 overflow-x-auto">
            <table className="w-full text-lg">
              <thead className="bg-taller-night/60">
                <tr className="text-left text-ash font-subhead text-base uppercase tracking-wider">
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Teléfono</th>
                  <th className="px-3 py-2">Reserva</th>
                  <th className="px-3 py-2">Pwd</th>
                  <th className="px-3 py-2">Alta</th>
                  <th className="px-3 py-2 text-right">Accion</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-taller-iron hover:bg-taller-night/30"
                  >
                    <td className="px-3 py-2 text-bone">
                      <div className="flex items-center gap-2">
                        {u.debeCambiarContrasena && (
                          <span title="Debe cambiar contraseña">
                            <AlertCircle className="h-4 w-4 text-ember-bright shrink-0" />
                          </span>
                        )}
                        <span className="font-subhead">{u.nombreCompleto}</span>
                        {u.rol === "ADMIN" && (
                          <span className="text-ember-bright text-sm uppercase">
                            admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-bone font-mono text-base">
                      {u.email}
                    </td>
                    <td className="px-3 py-2 text-bone font-mono text-base">
                      {u.telefono}
                    </td>
                    <td className="px-3 py-2 text-ash text-base">
                      {u.reserva ? (
                        <a
                          href={`/admin/reservas/${u.reserva.id}`}
                          className="hover:text-ember-bright"
                        >
                          {(() => {
                            const codigos = u.reserva.invitados.filter(
                              (i) => i.codigo !== null
                            ).length;
                            return `${codigos} código${codigos === 1 ? "" : "s"} · ${u.reserva.estado}`;
                          })()}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {u.debeCambiarContrasena ? (
                        <span className="text-ember-bright text-base">
                          cambiar
                        </span>
                      ) : (
                        <span className="text-ash text-base">ok</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-ash text-base">
                      {formatDate(u.creadoEn)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <EditarUsuarioButton
                          user={{
                            id: u.id,
                            nombreCompleto: u.nombreCompleto,
                            email: u.email,
                            telefono: u.telefono,
                            rol: u.rol,
                          }}
                        />
                        {u.id !== session.user.id && (
                          <>
                        <ResetPwdButton
                          userId={u.id}
                          userName={u.nombreCompleto}
                          userPhone={u.telefono}
                        />
                            <EliminarUsuarioButton
                              userId={u.id}
                              userName={u.nombreCompleto}
                            />
                          </>
                      )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {usuarios.map((u) => (
              <div
                key={u.id}
                className={cn(
                  "rounded-md border border-taller-iron bg-taller-steel/50 p-3",
                  u.debeCambiarContrasena && "border-ember-rust/40"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-subhead text-bone flex items-center gap-1.5">
                      {u.debeCambiarContrasena && (
                        <AlertCircle className="h-4 w-4 text-ember-bright" />
                      )}
                      {u.nombreCompleto}
                      {u.rol === "ADMIN" && (
                        <span className="text-ember-bright text-lg uppercase">
                          admin
                        </span>
                      )}
                    </p>
                    <p className="text-ash text-base flex items-center gap-1 mt-1">
                      <Mail className="h-4 w-4" /> {u.email}
                    </p>
                    <p className="text-ash text-base flex items-center gap-1">
                      <Phone className="h-4 w-4" /> {u.telefono}
                    </p>
                    {u.reserva && (
                      <p className="text-ash text-base mt-1">
                        Reserva: {(() => {
                          const codigos = u.reserva.invitados.filter(
                            (i) => i.codigo !== null
                          ).length;
                          return `${codigos} código${codigos === 1 ? "" : "s"} · ${u.reserva.estado}`;
                        })()}
                      </p>
                    )}
                    <p className="text-ash text-sm flex items-center gap-1 mt-1">
                      <Calendar className="h-4 w-4" /> Alta{" "}
                      {formatDate(u.creadoEn)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-taller-iron pt-3">
                  <EditarUsuarioButton
                    user={{
                      id: u.id,
                      nombreCompleto: u.nombreCompleto,
                      email: u.email,
                      telefono: u.telefono,
                      rol: u.rol,
                    }}
                  />
                  {u.id !== session.user.id && (
                    <>
                      <ResetPwdButton
                        userId={u.id}
                        userName={u.nombreCompleto}
                        userPhone={u.telefono}
                      />
                      <EliminarUsuarioButton
                        userId={u.id}
                        userName={u.nombreCompleto}
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="mt-6 text-ash text-base">
        Tip: la contraseña se muestra UNA vez al resetearla. Cuídala — no se
        puede volver a recuperar. Para recuperaciones masivas, usar el
        buscador por email.
      </p>
    </main>
  );
}
