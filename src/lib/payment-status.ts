import { EstadoReserva } from "@prisma/client";
import type { BadgeVariant } from "@/components/ui/badge";

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
