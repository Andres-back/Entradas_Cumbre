import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ADMIN_NAME } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import {
  ArrowRight,
  Users,
  CheckCircle2,
  Wallet,

} from "lucide-react";
import { EstadoReserva } from "@prisma/client";
import DashboardCharts from "./dashboard-charts";

export const metadata = {
  title: "Panel admin | Bajo el Capó",
};

const estadoVariant: Record<EstadoReserva, BadgeVariant> = {
  PAGO_PENDIENTE: "pending",
  PARCIAL: "paid",
  ASISTIO: "success",
  CANCELADO: "cancelled",
};

const estadoLabel: Record<EstadoReserva, string> = {
  PAGO_PENDIENTE: "Pago pendiente",
  PARCIAL: "Pago parcial",
  ASISTIO: "Asistió",
  CANCELADO: "Cancelado",
};

function formatCOP(value: number) {
  return `$ ${value.toLocaleString("es-CO")} COP`;
}

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user) return null;

  const hace7Dias = new Date();
  hace7Dias.setDate(hace7Dias.getDate() - 7);
  hace7Dias.setHours(0, 0, 0, 0);

  const [todas, ultimas, estadoAgrupado, reservas7Dias] = await Promise.all([
    prisma.reserva.findMany({
      where: { estado: { not: EstadoReserva.CANCELADO } },
      select: {
        estado: true,
        valorTotal: true,
        invitados: { select: { id: true } },
      },
    }),
    prisma.reserva.findMany({
      take: 8,
      orderBy: { creadaEn: "desc" },
      include: {
        user: { select: { nombreCompleto: true } },
        invitados: { select: { id: true } },
      },
    }),
    prisma.reserva.groupBy({
      by: ["estado"],
      _count: { id: true },
    }),
    prisma.reserva.findMany({
      where: { creadaEn: { gte: hace7Dias } },
      select: { creadaEn: true },
    }),
  ]);

  const totalReservas = todas.length;
  const totalAsistentes = todas.reduce(
    (acc, r) => acc + r.invitados.length,
    0
  );
  // "Confirmadas" = al menos 1 invitado pagado
  const confirmadas = todas.filter(
    (r) => r.estado === EstadoReserva.PARCIAL || r.estado === EstadoReserva.ASISTIO
  );
  const totalConfirmados = confirmadas.reduce(
    (acc, r) => acc + r.invitados.length,
    0
  );
  const totalRecaudado = await prisma.pago
    .aggregate({
      where: { revertido: false },
      _sum: { monto: true },
    })
    .then((r) => r._sum.monto ?? 0);

  const estadoDistribucion = estadoAgrupado
    .map((e) => ({
      estado: estadoLabel[e.estado],
      count: e._count.id,
    }))
    .sort((a, b) => b.count - a.count);

  const diasMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
    diasMap[key] = 0;
  }
  reservas7Dias.forEach((r) => {
    const key = r.creadaEn.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
    if (key in diasMap) diasMap[key]++;
  });
  const reservasPorDia = Object.entries(diasMap).map(([dia, count]) => ({ dia, count }));

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-ash text-base uppercase tracking-widest font-subhead">
            Dashboard
          </p>
          <h1 className="font-display text-3xl text-cream mt-1">
            Hola, {session.user.name ?? ADMIN_NAME}
          </h1>
          <p className="text-bone text-lg mt-1">
            Resumen del taller en tiempo real.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8 stagger-children">
        <MetricCard
          icon={Users}
          label="Reservas"
          value={totalReservas}
          numeric
          sub={`${totalAsistentes} invitados`}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Confirmadas"
          value={totalConfirmados}
          numeric
          sub={`${confirmadas.length} reservas`}
        />
        <MetricCard
          icon={Wallet}
          label="Recaudado"
          value={formatCOP(totalRecaudado)}
        />
      </div>

      <DashboardCharts
        estadoDistribucion={estadoDistribucion}
        reservasPorDia={reservasPorDia}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Últimas reservas</CardTitle>
            <Link
              href="/admin/reservas"
              className="text-ember-bright text-lg font-subhead uppercase tracking-wider flex items-center gap-1 hover:underline"
            >
              Ver todas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {ultimas.length === 0 ? (
            <p className="text-ash text-lg py-6 text-center">
              Aún no hay reservas. Comparte el link del evento para empezar.
            </p>
          ) : (
            <ul className="divide-y divide-taller-iron stagger-children">
              {ultimas.map((r) => (
                <li key={r.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-bone font-subhead truncate">
                      {r.user.nombreCompleto}
                    </p>
                    <p className="text-ash text-base">
                      {r.invitados.length}{" "}
                      {r.invitados.length === 1 ? "invitado" : "invitados"} ·{" "}
                      {formatCOP(r.valorTotal)}
                    </p>
                  </div>
                  <Badge variant={estadoVariant[r.estado]}>
                    {estadoLabel[r.estado]}
                  </Badge>
                  <Link
                    href={`/admin/reservas/${r.id}`}
                    className="text-ember-bright text-base uppercase tracking-wider font-subhead hover:underline"
                  >
                    Ver
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  variant?: "default" | "warning";
  numeric?: boolean;
}

function MetricCard({ icon: Icon, label, value, sub = "", variant = "default", numeric }: MetricCardProps) {
  return (
    <Card className={`hover-lift ${variant === "warning" ? "border-ember-rust" : ""}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-ash text-base uppercase tracking-widest font-subhead">
              {label}
            </p>
            <p className="font-display text-2xl md:text-3xl text-cream mt-1 animate-counter-tick">
              {numeric && typeof value === "number" ? (
                <AnimatedNumber value={value} />
              ) : (
                value
              )}
            </p>
            {sub && <p className="text-ash text-base mt-1">{sub}</p>}

          </div>
          <Icon
            className={
              variant === "warning"
                ? "h-6 w-6 text-ember-rust"
                : "h-6 w-6 text-ember-bright"
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
