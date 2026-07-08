import { EstadoReserva } from "@prisma/client";
import type { BadgeVariant } from "@/components/ui/badge";

export type EstadoPago = "SIN_PAGO" | "PARCIAL" | "PAGADO";

export function calcularEstadoPago(valorTotal: number, pagosValidos: { monto: number }[]): EstadoPago {
  const totalAbonado = pagosValidos.reduce((acc, p) => acc + p.monto, 0);
  return _calcularEstadoPagoDesdeTotal(valorTotal, totalAbonado);
}

function _calcularEstadoPagoDesdeTotal(valorTotal: number, totalAportado: number): EstadoPago {
  if (totalAportado <= 0) return "SIN_PAGO";
  if (totalAportado >= valorTotal) return "PAGADO";
  return "PARCIAL";
}

/** Suma de montos de pagos no revertidos. */
export function sumarPagos(pagos: { monto: number; revertido?: boolean }[]): number {
  return pagos.filter((p) => !p.revertido).reduce((acc, p) => acc + p.monto, 0);
}

export function paymentProgress(valorTotal: number, totalAportado: number) {
  const saldoPendiente = Math.max(valorTotal - totalAportado, 0);
  const pagadoCompleto = valorTotal > 0 && totalAportado >= valorTotal;
  const pagadoParcial = totalAportado > 0 && !pagadoCompleto;

  return {
    saldoPendiente,
    pagadoCompleto,
    pagadoParcial,
    label: pagadoCompleto ? "Aporte pagado" : pagadoParcial ? "Aporte parcial" : "Aporte pendiente",
  };
}

export function reservaEstadoLabel(
  estado: EstadoReserva,
  valorTotal: number,
  totalAportado: number
) {
  if (estado === EstadoReserva.CANCELADO) return "Cancelado";
  if (estado === EstadoReserva.ASISTIO) return "Asistió";
  return paymentProgress(valorTotal, totalAportado).label;
}

export function reservaEstadoVariant(
  estado: EstadoReserva,
  valorTotal: number,
  totalAportado: number
): BadgeVariant {
  if (estado === EstadoReserva.CANCELADO) return "cancelled";
  if (estado === EstadoReserva.ASISTIO) return "success";
  const progress = paymentProgress(valorTotal, totalAportado);
  if (progress.pagadoCompleto) return "success";
  if (progress.pagadoParcial) return "paid";
  return "pending";
}

export function reservaEstadoLabelSimple(estado: EstadoReserva, valorTotal: number, pagosValidos: { monto: number }[]): string {
  if (estado === EstadoReserva.CANCELADO) return "Cancelado";
  if (estado === EstadoReserva.ASISTIO) return "Asistió";
  const ep = calcularEstadoPago(valorTotal, pagosValidos);
  if (ep === "PAGADO") return "Pagado";
  if (ep === "PARCIAL") return "Abono parcial";
  return "Aporte pendiente";
}
