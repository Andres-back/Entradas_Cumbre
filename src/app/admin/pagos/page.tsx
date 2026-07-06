import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Wallet, CheckCircle2, AlertCircle } from "lucide-react";
import { EstadoReserva } from "@prisma/client";

export const metadata = {
  title: "Aportes | Admin",
};

const estadoVariant: Record<EstadoReserva, BadgeVariant> = {
  PAGO_PENDIENTE: "pending",
  PARCIAL: "paid",
  ASISTIO: "success",
  CANCELADO: "cancelled",
};

const estadoLabel: Record<EstadoReserva, string> = {
  PAGO_PENDIENTE: "Aporte pendiente",
  PARCIAL: "Aporte parcial",
  ASISTIO: "Asistió",
  CANCELADO: "Cancelado",
};

function formatCOP(value: number) {
  return `$ ${value.toLocaleString("es-CO")} COP`;
}

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export default async function AdminAportesPage() {
  const [pagos, pendientes, reservaPendientes] = await Promise.all([
    prisma.pago.findMany({
      where: { revertido: false },
      orderBy: { registradoEn: "desc" },
      include: {
        reserva: {
          include: { user: { select: { nombreCompleto: true, telefono: true } } },
        },
      },
    }),
    prisma.pago.aggregate({
      where: { revertido: false },
      _sum: { monto: true },
      _count: true,
    }),
    prisma.reserva.findMany({
      where: { estado: { in: [EstadoReserva.PAGO_PENDIENTE] } },
      orderBy: { creadaEn: "asc" },
      include: { user: { select: { nombreCompleto: true, telefono: true } } },
    }),
  ]);

  const totalRecaudado = pendientes._sum.monto ?? 0;

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-ash text-base uppercase tracking-widest font-subhead">
            Conciliación
          </p>
          <h1 className="font-display text-3xl text-cream mt-1">Aportes</h1>
          <p className="text-bone text-lg mt-1">
            Vista consolidada de aportes confirmados vs reservas pendientes.
          </p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Wallet className="h-9 w-9 text-ember-bright" />
              <div>
                <p className="text-ash text-base uppercase tracking-widest font-subhead">
                  Recaudado
                </p>
                <p className="font-display text-2xl text-cream">
                  {formatCOP(totalRecaudado)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-9 w-9 text-signal-green" />
              <div>
                <p className="text-ash text-base uppercase tracking-widest font-subhead">
                  Aportes registrados
                </p>
                <p className="font-display text-2xl text-cream">
                  {pendientes._count}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-ember-rust/40">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-9 w-9 text-ember-rust" />
              <div>
                <p className="text-ash text-base uppercase tracking-widest font-subhead">
                  Por confirmar
                </p>
                <p className="font-display text-2xl text-cream">
                  {reservaPendientes.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reservas pendientes de aporte */}
      {reservaPendientes.length > 0 && (
        <Card className="mb-8 border-ember-rust/40">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-ember-rust" />
              Esperando aporte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-taller-iron">
              {reservaPendientes.map((r) => (
                <li key={r.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-bone font-subhead truncate">
                      {r.user.nombreCompleto}
                    </p>
                    <p className="text-ash text-base">
                      {r.user.telefono} ·{" "}
                      {formatCOP(r.valorTotal)}
                    </p>
                  </div>
                  <Badge variant="pending">Aporte pendiente</Badge>
                  <Link
                    href={`/admin/reservas/${r.id}`}
                    className="text-ember-bright text-base uppercase tracking-wider font-subhead hover:underline"
                  >
                    Gestionar
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Historial de aportes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Historial de aportes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pagos.length === 0 ? (
            <p className="text-ash text-lg py-8 text-center">
              Aún no hay aportes confirmados.
            </p>
          ) : (
            <>
              {/* Tabla desktop */}
              <table className="w-full text-lg hidden md:table">
                <thead className="border-b border-taller-iron text-ash text-base uppercase tracking-widest font-subhead">
                  <tr>
                    <th className="text-left py-3 px-4">Fecha</th>
                    <th className="text-left py-3 px-4">Asistente</th>
                    <th className="text-left py-3 px-4">Medio</th>
                    <th className="text-left py-3 px-4">Ref</th>
                    <th className="text-right py-3 px-4">Monto</th>
                    <th className="text-left py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-taller-iron">
                  {pagos.map((p) => (
                    <tr key={p.id} className="hover:bg-taller-steel/30">
                      <td className="py-3 px-4 text-ash text-base">
                        {formatDateTime(p.registradoEn)}
                      </td>
                      <td className="py-3 px-4 text-bone">
                        <Link
                          href={`/admin/reservas/${p.reservaId}`}
                          className="hover:text-ember-bright"
                        >
                          {p.reserva.user.nombreCompleto}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-bone">{p.medio}</td>
                      <td className="py-3 px-4 font-mono text-ash text-base">
                        {p.referencia ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-right text-ember-bright font-mono">
                        {formatCOP(p.monto)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            estadoVariant[p.reserva.estado] ?? "default"
                          }
                        >
                          {estadoLabel[p.reserva.estado]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Cards mobile */}
              <ul className="md:hidden space-y-3 p-3">
                {pagos.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-md border border-taller-iron bg-taller-steel/30 p-3"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-bone font-subhead">
                        {p.reserva.user.nombreCompleto}
                      </p>
                      <Badge
                        variant={estadoVariant[p.reserva.estado] ?? "default"}
                      >
                        {estadoLabel[p.reserva.estado]}
                      </Badge>
                    </div>
                    <p className="text-ash text-base">{p.medio} · Ref {p.referencia ?? "—"}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-ash text-base">
                        {formatDateTime(p.registradoEn)}
                      </p>
                      <p className="text-ember-bright font-mono text-lg">
                        {formatCOP(p.monto)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}


