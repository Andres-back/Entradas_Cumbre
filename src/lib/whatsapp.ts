import { WHATSAPP_ADMIN_NUMBER } from "@/lib/constants";

export interface WhatsappConfirmacionParams {
  nombre: string;
  telefono: string;
  email?: string;
  taller?: string | null;
  totalAbonado?: number;
  saldoPendiente?: number;
  invitados?: { nombreCompleto: string; telefono: string }[];
  valorTotal: number;
}

export function buildWhatsappConfirmacionUrl(p: WhatsappConfirmacionParams): string {
  return buildWhatsappSimpleUrl(WHATSAPP_ADMIN_NUMBER, whatsappTemplates.confirmacionAporte(p));
}

export const whatsappTemplates = {
  confirmacionAporte(p: WhatsappConfirmacionParams): string {
    return buildPaymentWhatsAppMessage({
      nombre: p.nombre,
      email: p.email,
      taller: p.taller,
      valorTotal: p.valorTotal,
      totalAbonado: p.totalAbonado ?? 0,
      saldoPendiente: p.saldoPendiente ?? p.valorTotal,
    });
  },
};

export function normalizeWhatsAppNumber(numero: string | null | undefined): string {
  const digits = String(numero ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 && digits.startsWith("3")) return `57${digits}`;
  if (digits.length === 12 && digits.startsWith("57")) return digits;
  if (digits.length >= 7 && digits.length <= 15) return digits;
  return "";
}

export function normalizePhoneE164(numero: string): string {
  const normalized = normalizeWhatsAppNumber(numero);
  return normalized ? `+${normalized}` : "";
}

export function buildPaymentWhatsAppMessage(p: {
  nombre: string;
  email?: string | null;
  taller?: string | null;
  valorTotal: number;
  totalAbonado: number;
  saldoPendiente: number;
}): string {
  return [
      `Hola, soy ${p.nombre}.`,
      "",
      "Me inscribi en Cumbre Impacto Putumayo 2026 y deseo coordinar mi pago.",
      "",
      `Taller: ${p.taller || "Pendiente por confirmar"}`,
      `Valor total: $${p.valorTotal.toLocaleString("es-CO")} COP`,
      `Total abonado: $${p.totalAbonado.toLocaleString("es-CO")} COP`,
      `Saldo pendiente: $${p.saldoPendiente.toLocaleString("es-CO")} COP`,
      ...(p.email ? ["", `Mi correo de inscripcion es: ${p.email}.`] : []),
    ].join("\n");
}

export function buildWhatsappSimpleUrl(telefono: string, mensaje: string): string {
  const numero = normalizeWhatsAppNumber(telefono);
  if (!numero) return "";
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
