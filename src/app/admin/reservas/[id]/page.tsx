import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import {
  ArrowLeft,
  Phone,
  Mail,
  Users,
  User,
  Calendar,
  MessageCircle,
  Clock,
  Armchair,
  RotateCcw,
  Utensils,
  Coffee,
  ScanLine,
} from "lucide-react";
import { buildWhatsappSimpleUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { MarcarPagadoForm } from "./marcar-pagado-form";
import { CancelarForm } from "./cancelar-form";
import { ReactivarButton } from "./action-buttons";
import { ResetPwdButton } from "../../usuarios/reset-button";
import { getConfiguracion } from "@/lib/constants";
import { EstadoInvitado, EstadoReserva } from "@prisma/client";

export const metadata = {
  title: "Detalle reserva | Admin",
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
  ASISTIO: "AsistiÃ³",
  CANCELADO: "Cancelado",
};

const invitadoEstadoVariant: Record<EstadoInvitado, BadgeVariant> = {
  PENDIENTE_PAGO: "pending",
  PAGADO: "paid",
  ASISTIO: "success",
};

const invitadoEstadoLabel: Record<EstadoInvitado, string> = {
  PENDIENTE_PAGO: "Pendiente",
  PAGADO: "Pagado",
  ASISTIO: "AsistiÃ³",
};

function formatCOP(value: number) {
  return `$ ${value.toLocaleString("es-CO")}`;
}

function formatDateTime(d: Date | null) {
  if (!d) return "â€”";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function formatLocal(telefono: string): string {
  const digits = (telefono ?? "").replace(/\D/g, "");
  if (digits.length < 10) return telefono;
  const d = digits.slice(-10);
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export default async function AdminReservaDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const config = await getConfiguracion();

  const reserva = await prisma.reserva.findUnique({
    where: { id },
    include: {
      user: true,
      pagos: { orderBy: { registradoEn: "desc" } },
      invitados: {
        orderBy: { numero: "asc" },
        include: { mesa: true },
      },
    },
  });

  if (!reserva) notFound();

  const estadoActivo = reserva.estado !== "CANCELADO";
  const waUrl = buildWhatsappSimpleUrl(
    reserva.user.telefono,
    `Hola ${reserva.user.nombreCompleto.split(" ")[0]}, te escribo de Cumbre Impacto.`
  );

  const invitadosPagados = reserva.invitados.filter(
    (i) => i.estado === EstadoInvitado.PAGADO
  );
  const invitadosAsistieron = reserva.invitados.filter(
    (i) => i.estado === EstadoInvitado.ASISTIO
  );
  const almuerzosEntregados = reserva.invitados.filter(
    (i) => i.almuerzoEntregadoEn
  ).length;
  const refrigeriosEntregados = reserva.invitados.filter(
    (i) => i.refrigerioEntregadoEn
  ).length;
  const totalReingresos = reserva.invitados.reduce(
    (acc, i) => acc + i.reingresos,
    0
  );
  const invitadosConMesa = reserva.invitados.filter(
    (i) => i.mesaId && i.silla
  );
  const invitadosOperativos = invitadosPagados.length + invitadosAsistieron.length;
  const totalAportado = reserva.pagos
    .filter((p) => !p.revertido)
    .reduce((acc, pago) => acc + pago.monto, 0);
  const saldoPendiente = Math.max(reserva.valorTotal - totalAportado, 0);

  const estadoDisplay =
    reserva.estado === EstadoReserva.PARCIAL
      ? `${invitadosPagados.length + invitadosAsistieron.length}/${reserva.invitados.length} confirmados`
      : estadoLabel[reserva.estado];

  return (
    <main className="px-3 py-4 md:px-8 md:py-8 max-w-3xl">
      <Link
        href="/admin/reservas"
        className="text-ash text-base md:text-lg font-subhead uppercase tracking-wider hover:text-ember-bright inline-flex items-center gap-1 mb-3 md:mb-4 min-h-[44px] md:min-h-0"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a reservas
      </Link>

      <div className="flex items-start justify-between gap-3 md:gap-4 mb-4 md:mb-6 flex-wrap">
        <div>
          <p className="text-ash text-sm md:text-base uppercase tracking-widest font-subhead">
            Reserva
          </p>
          <h1 className="font-display text-xl md:text-3xl text-cream mt-1">
            {reserva.invitados.length}{" "}
            {reserva.invitados.length === 1 ? "asistente" : "asistentes"}
          </h1>
        </div>
        <Badge variant={estadoVariant[reserva.estado]} className="text-base md:text-lg">
          {estadoDisplay}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-ember-bright" /> Titular
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-lg">
            <p className="text-bone font-subhead">
              {reserva.user.nombreCompleto}
            </p>
            <p className="text-ash flex items-center gap-1.5 text-base">
              <Phone className="h-4 w-4" />{" "}
              <span className="font-mono">{formatLocal(reserva.user.telefono)}</span>
            </p>
            {reserva.user.email && (
              <p className="text-ash flex items-center gap-1.5 text-base break-all">
                <Mail className="h-4 w-4 shrink-0" /> {reserva.user.email}
              </p>
            )}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-ember-bright text-base uppercase tracking-wider font-subhead hover:underline mt-2 min-h-[44px] md:min-h-0"
            >
              <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
            </a>
            <div className="pt-3 mt-3 border-t border-taller-iron">
              <p className="text-ash text-sm uppercase tracking-widest font-subhead mb-2">
                ContraseÃ±a
              </p>
              <ResetPwdButton
                userId={reserva.user.id}
                userName={reserva.user.nombreCompleto}
                userPhone={reserva.user.telefono}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-ember-bright" /> Grupo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-lg">
            <div className="flex items-baseline justify-between">
              <p className="text-bone text-base">
                {reserva.invitados.length}{" "}
                {reserva.invitados.length === 1 ? "asistente" : "asistentes"}
              </p>
              <p className="font-display text-2xl md:text-3xl text-ember-bright">
                {invitadosAsistieron.length}
                <span className="text-ash text-lg">
                  {" "}
                  / {reserva.invitados.length}
                </span>
              </p>
            </div>
            <div className="flex items-baseline justify-between text-base text-ash">
              <span>Pagados</span>
              <span className="text-bone">
                {invitadosPagados.length + invitadosAsistieron.length}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-base text-ash">
              <span>Con mesa</span>
              <span className="text-bone">{invitadosConMesa.length}</span>
            </div>
            <div className="flex items-baseline justify-between text-base text-ash">
              <span>Almuerzos</span>
              <span className="text-bone">{almuerzosEntregados}</span>
            </div>
            <div className="flex items-baseline justify-between text-base text-ash">
              <span>Refrigerios</span>
              <span className="text-bone">{refrigeriosEntregados}</span>
            </div>
            <div className="flex items-baseline justify-between text-base text-ash">
              <span>Reingresos</span>
              <span className="text-bone">{totalReingresos}</span>
            </div>
            <p className="font-display text-2xl md:text-3xl text-ember-bright mt-2">
              {formatCOP(reserva.valorTotal)}
            </p>
            <p className="text-ash text-sm">
              {formatCOP(config.precioPorPersona)} c/u Â· esperado mÃ¡ximo
            </p>
            <div className="pt-2 mt-2 border-t border-taller-iron text-base">
              <div className="flex items-baseline justify-between text-ash">
                <span>Abonado</span>
                <span className="text-bone">{formatCOP(totalAportado)}</span>
              </div>
              <div className="flex items-baseline justify-between text-ash">
                <span>Saldo</span>
                <span className="text-ember-bright">{formatCOP(saldoPendiente)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4 md:mb-6">
        <CardHeader>
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-ember-bright" /> Asistentes (
            {reserva.invitados.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {reserva.invitados.map((inv) => (
              <li
                key={inv.id}
                className={cn(
                  "flex items-center gap-1.5 md:gap-2 p-2 rounded-md border text-base md:text-lg",
                  inv.estado === EstadoInvitado.ASISTIO
                    ? "border-signal-green/30 bg-signal-green/5"
                    : inv.estado === EstadoInvitado.PAGADO
                    ? "border-ember-bright/30 bg-ember-bright/5"
                    : "border-taller-iron bg-taller-steel/50"
                )}
              >
                <span className="font-display text-ash text-base w-7 md:w-8 text-center shrink-0">
                  #{inv.numero}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-bone font-subhead truncate text-base md:text-lg">
                    {inv.nombreCompleto}
                  </p>
                  <p className="text-ash text-sm font-mono">
                    {formatLocal(inv.telefono)}
                  </p>
                </div>
                {inv.codigo && (
                  <span
                    className="font-mono text-ember-bright text-sm tracking-widest shrink-0 hidden md:inline"
                    title={inv.codigo}
                  >
                    {inv.codigo}
                  </span>
                )}
                {inv.mesa && inv.silla ? (
                  <span className="text-ash text-sm shrink-0 flex items-center gap-0.5">
                    <Armchair className="h-4 w-4" />
                    M{inv.mesa.numero}/S{inv.silla}
                  </span>
                ) : null}
                <Badge
                  variant={invitadoEstadoVariant[inv.estado]}
                  className="shrink-0 text-sm"
                >
                  {invitadoEstadoLabel[inv.estado]}
                </Badge>
                {inv.codigo && (
                  <Link
                    href={`/admin/validar?codigo=${inv.codigo}`}
                    className="inline-flex items-center gap-1 rounded-md bg-ember-rust px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider text-cream shadow-sm transition-all hover:bg-ember-bright hover:shadow-ember active:scale-[0.97] shrink-0"
                    title={`Validar ${inv.codigo}`}
                  >
                    <ScanLine className="h-4 w-4" />
                    Validar
                  </Link>
                )}
                {inv.registradoEn && (
                  <span className="text-ash text-sm shrink-0 hidden sm:flex items-center gap-0.5">
                    <Clock className="h-4 w-4" />
                    {new Date(inv.registradoEn).toLocaleTimeString("es-CO", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                )}
                {inv.reingresos > 0 && (
                  <span className="text-ember-bright text-sm shrink-0 hidden sm:flex items-center gap-0.5">
                    <RotateCcw className="h-4 w-4" />
                    {inv.reingresos}
                  </span>
                )}
                {inv.almuerzoEntregadoEn && (
                  <span className="text-signal-green text-sm shrink-0 hidden sm:flex items-center gap-0.5">
                    <Utensils className="h-4 w-4" />
                    Almuerzo
                  </span>
                )}
                {inv.refrigerioEntregadoEn && (
                  <span className="text-signal-green text-sm shrink-0 hidden sm:flex items-center gap-0.5">
                    <Coffee className="h-4 w-4" />
                    Refrigerio
                  </span>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {reserva.pagos.length > 0 && (
        <Card className="mb-4 md:mb-6">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Aportes registrados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-base md:text-lg">
            {reserva.pagos.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "p-2.5 md:p-3 rounded-md border",
                  p.revertido
                    ? "border-taller-iron bg-taller-shadow/40 opacity-60"
                    : "border-taller-iron bg-taller-steel/50"
                )}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-bone font-subhead text-base md:text-lg">{p.medio}</p>
                  <p className="text-ember-bright font-mono text-lg md:text-xl">
                    {formatCOP(p.monto)}
                  </p>
                </div>
                {p.invitadosCubiertos.length > 0 && (
                  <p className="text-ash text-sm md:text-base mt-1">
                    Cubre {p.invitadosCubiertos.length} asistente
                    {p.invitadosCubiertos.length === 1 ? "" : "s"}
                  </p>
                )}
                {p.referencia && (
                  <p className="text-ash text-sm md:text-base mt-1">
                    Ref: <span className="text-bone font-mono">{p.referencia}</span>
                  </p>
                )}
                {p.notasInternas && (
                  <p className="text-ash text-sm md:text-base mt-1">
                    {p.notasInternas}
                  </p>
                )}
                <p className="text-ash text-sm mt-1">
                  {formatDateTime(p.registradoEn)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3 md:space-y-4">
        {reserva.estado === "CANCELADO" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Reserva cancelada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reserva.motivoCancelacion && (
                <p className="text-ash text-base md:text-lg">
                  <span className="text-bone font-subhead">Motivo:</span>{" "}
                  {reserva.motivoCancelacion}
                </p>
              )}
              <ReactivarButton reservaId={reserva.id} />
            </CardContent>
          </Card>
        ) : estadoActivo ? (
          <>
            {saldoPendiente > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">
                    Registrar aporte o abono
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MarcarPagadoForm
                    reservaId={reserva.id}
                    valorTotal={reserva.valorTotal}
                    totalPagado={totalAportado}
                    saldoPendiente={saldoPendiente}
                  />
                </CardContent>
              </Card>
            )}

            {invitadosOperativos > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Asignar mesas</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    href="/admin/mesas"
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-ember-bright/40 bg-taller-steel text-bone px-3 py-2 text-lg hover:border-ember-bright min-h-[44px] sm:min-h-0"
                  >
                    <Armchair className="h-5 w-5" />
                    Ir a mesas
                  </Link>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg text-signal-rust">
                  Cancelar reserva
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CancelarForm reservaId={reserva.id} />
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Grupo completo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-bone text-base md:text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-ember-bright" />
                Completado el {formatDateTime(reserva.asistioEn)}
              </p>
              <p className="text-ash text-sm md:text-base mt-1">
                {invitadosAsistieron.length} / {reserva.invitados.length}{" "}
                asistentes registrados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="mt-4 md:mt-6">
        <CardHeader>
          <CardTitle className="text-sm md:text-base uppercase tracking-widest text-ash">
            AuditorÃ­a
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0.5 text-sm md:text-base text-ash">
          <p>Creada: {formatDateTime(reserva.creadaEn)}</p>
          <p>Ãšltima act: {formatDateTime(reserva.actualizadaEn)}</p>
          {reserva.confirmadaEn && (
            <p>Confirmada: {formatDateTime(reserva.confirmadaEn)}</p>
          )}
          {reserva.asistioEn && (
            <p>AsistiÃ³: {formatDateTime(reserva.asistioEn)}</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

