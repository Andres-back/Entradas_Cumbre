import { WHATSAPP_ADMIN_NUMBER } from "@/lib/constants";

export interface WhatsappConfirmacionParams {
  nombre: string;
  telefono: string;
  invitados?: { nombreCompleto: string; telefono: string }[];
  valorTotal: number;
}

export function buildWhatsappConfirmacionUrl(
  p: WhatsappConfirmacionParams
): string {
  const valorCOP = `$${p.valorTotal.toLocaleString("es-CO")} COP`;

  const lineas: string[] = [
    "Hola, me gustaria confirmar mi asistencia a Cumbre Impacto.",
    "",
    `Titular: ${p.nombre} (${formatLocal(p.telefono)})`,
    "Asistentes: 1",
    `Aporte a pagar: ${valorCOP}`,
    "",
    "?Cuales son los medios de aporte disponibles?",
  ];

  const texto = lineas.join("\n");
  return `https://wa.me/${WHATSAPP_ADMIN_NUMBER}?text=${encodeURIComponent(texto)}`;
}

function formatLocal(telefono: string): string {
  const digits = telefono.replace(/\D/g, "");
  if (digits.length < 10) return telefono;
  const d = digits.slice(-10);
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export function buildWhatsappSimpleUrl(
  telefono: string,
  mensaje: string
): string {
  const numero = telefono.replace(/[\s+]/g, "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
