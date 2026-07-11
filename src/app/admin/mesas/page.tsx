import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid3x3, UserCheck, Info } from "lucide-react";
import { MesaCard, type InvitadoSinMesa } from "./mesa-card";
import { CrearMesaForm } from "./crear-mesa-form";
import { EstadoInvitado, EstadoReserva } from "@prisma/client";

export const metadata = {
  title: "Mesas | Admin",
};

function formatLocal(telefono: string): string {
  const digits = (telefono ?? "").replace(/\D/g, "");
  if (digits.length < 10) return telefono;
  const d = digits.slice(-10);
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export default async function AdminMesasPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?next=/admin/mesas");
  }

  const [mesas, sinMesa] = await Promise.all([
    prisma.mesa.findMany({
      orderBy: { numero: "asc" },
      include: {
        invitados: {
          where: { silla: { not: null } },
          orderBy: { silla: "asc" },
          include: {
            reserva: {
              include: {
                user: { select: { nombreCompleto: true, telefono: true } },
              },
            },
          },
        },
      },
    }),
    prisma.invitado.findMany({
      where: {
        mesaId: null,
        estado: { in: [EstadoInvitado.PAGADO, EstadoInvitado.ASISTIO] },
        reserva: { estado: { not: EstadoReserva.CANCELADO } },
      },
      orderBy: [{ reserva: { creadaEn: "asc" } }, { numero: "asc" }],
      include: {
        reserva: {
          include: {
            user: { select: { nombreCompleto: true } },
          },
        },
      },
    }),
  ]);

  const invitadosSinMesa: InvitadoSinMesa[] = sinMesa.map((inv) => ({
    id: inv.id,
    numero: inv.numero,
    nombreCompleto: inv.nombreCompleto,
    telefono: inv.telefono,
    reserva: { user: { nombreCompleto: inv.reserva.user.nombreCompleto } },
  }));

  const capacidadTotal = mesas.reduce((acc, m) => acc + m.capacidad, 0);
  const ocupadosTotal = mesas.reduce(
    (acc, m) => acc + m.invitados.length,
    0
  );
  const libresTotal = capacidadTotal - ocupadosTotal;

  return (
    <main className="px-3 py-4 md:px-8 md:py-8">
      <div className="mb-4 md:mb-6">
        <p className="text-ash text-sm md:text-base uppercase tracking-widest font-subhead">
          Distribución
        </p>
        <h1 className="font-display text-2xl md:text-3xl text-cream mt-1 flex items-center gap-2">
          <Grid3x3 className="h-6 w-6 md:h-7 md:w-7 text-ember-bright" /> Mesas
        </h1>
        <p className="text-bone text-base md:text-lg mt-1">
          {mesas.length} mesas · {ocupadosTotal}/{capacidadTotal} ocupadas ·{" "}
          {libresTotal} libres
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 md:gap-6">
        <div className="space-y-3 md:space-y-4 order-1 stagger-children">
          {mesas.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-ash text-lg">
                  No hay mesas. Cree la primera desde el panel lateral.
                </p>
              </CardContent>
            </Card>
          )}

          {mesas.map((mesa) => (
            <MesaCard
              key={mesa.id}
              mesa={{
                id: mesa.id,
                numero: mesa.numero,
                capacidad: mesa.capacidad,
                invitados: mesa.invitados.map((i) => ({
                  id: i.id,
                  nombreCompleto: i.nombreCompleto,
                  telefono: i.telefono,
                  silla: i.silla,
                  estado: i.estado,
                  reserva: {
                    user: {
                      nombreCompleto: i.reserva.user.nombreCompleto,
                      telefono: i.reserva.user.telefono,
                    },
                  },
                })),
              }}
              invitadosSinMesa={invitadosSinMesa}
            />
          ))}
        </div>

        <div className="space-y-3 md:space-y-4 order-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Grid3x3 className="h-5 w-5 text-ember-bright" /> Crear mesa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CrearMesaForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-ember-bright" /> Sin asignar
                ({invitadosSinMesa.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invitadosSinMesa.length === 0 ? (
                <p className="text-ash text-base">
                  Todas las personas ya tienen mesa asignada.
                </p>
              ) : (
                <ul className="space-y-1.5 text-base max-h-72 overflow-y-auto">
                  {invitadosSinMesa.slice(0, 30).map((inv) => (
                    <li
                      key={inv.id}
                      className="rounded-md border border-taller-iron bg-taller-steel/30 px-2 py-1.5"
                      title={`Reserva de ${inv.reserva.user.nombreCompleto}`}
                    >
                      <p className="text-bone font-subhead truncate">
                        #{inv.numero} · {inv.nombreCompleto}
                      </p>
                      <p className="text-ash font-mono">
                        {formatLocal(inv.telefono)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-ash text-sm mt-3 flex items-center gap-1">
                <Info className="h-4 w-4" />
                Haga clic en una silla libre para asignar.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}


