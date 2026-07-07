import { WHATSAPP_ADMIN_NUMBER } from "@/lib/constants";

export interface WhatsappConfirmacionParams {
  nombre: string;
  telefono: string;
  invitados?: { nombreCompleto: string; telefono: string }[];
  valorTotal: number;
}

export function buildWhatsappConfirmacionUrl(p: WhatsappConfirmacionParams): string {
  return buildWhatsappSimpleUrl(WHATSAPP_ADMIN_NUMBER, whatsappTemplates.confirmacionAporte(p));
}

export const whatsappTemplates = {
  confirmacionAporte(p: WhatsappConfirmacionParams): string {
    return [
      "Hola, quiero reportar mi aporte para Cumbre Impacto Putumayo 2026.",
      "",
      `Participante: ${p.nombre}`,
      `WhatsApp: ${formatLocal(p.telefono)}`,
      "Entradas: 1",
      `Valor a confirmar: $${p.valorTotal.toLocaleString("es-CO")} COP`,
      "",
      "Por favor validen el pago y habiliten mi codigo de entrada.",
    ].join("\n");
  },
};

function formatLocal(telefono: string): string {
  const digits = telefono.replace(/\D/g, "");
  if (digits.length < 10) return telefono;
  const d = digits.slice(-10);
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export function buildWhatsappSimpleUrl(telefono: string, mensaje: string): string {
  const numero = telefono.replace(/\D/g, "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
