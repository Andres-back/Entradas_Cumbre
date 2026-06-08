import { WHATSAPP_ADMIN_NUMBER } from "@/lib/constants";

export interface WhatsappConfirmacionParams {
  /** Nombre del titular (quien inicia la reserva). */
  nombre: string;
  telefono: string;
  /** Lista de acompanantes (sin incluir al titular). */
  invitados: { nombreCompleto: string; telefono: string }[];
  valorTotal: number;
}

/**
 * Construye el URL wa.me/... con el mensaje pre-llenado
 * que el usuario envia al admin al confirmar asistencia (o al editar su reserva).
 *
 * El admin usa este mensaje para:
 *  1. Reconocer de inmediato que viene de la app (mismo template siempre).
 *  2. Tener los datos basicos del titular y cada invitado.
 *  3. Responder con los medios de pago disponibles.
 *
 * **El admin NUNCA recibe datos bancarios en este mensaje** (ver [[ADR-005]]).
 * El admin comparte los datos de pago en la conversacion que el usuario inicia.
 *
 * Formato (ADR-011, N invitados con nombre + telefono en formato local):
 *
 *   Hola, me gustaria confirmar mi asistencia a Bajo el Capo.
 *
 *   Titular: Andres (312 435 4040)
 *   Invitado 1: Alexander (300 123 4567)
 *   Invitado 2: Juan (300 765 4321)
 *   Asistentes: 3
 *   Valor a pagar: $75.000 COP
 *
 *   ?Cuales son los medios de pago disponibles?
 *
 * **Nota sobre tildes**: usamos un ASCII-friendly sin tildes ni signos de apertura
 * para que el admin lo vea limpio en WhatsApp y el URL sea mas corto
 * (cada caracter en espanol utf-8 ocupa 2-3 bytes al URL-encodear).
 * Coherente con el resto del sistema: la app SI usa tildes en copy visible
 * (ej. "Saca tu llave" con tilde en el CTA), pero los **mensajes que cruzan
 * la frontera del sistema (WhatsApp, logs, errores)** van en ASCII limpio.
 */
export function buildWhatsappConfirmacionUrl(
  p: WhatsappConfirmacionParams
): string {
  const valorCOP = `$${p.valorTotal.toLocaleString("es-CO")} COP`;
  const totalAsistentes = p.invitados.length + 1; // titular + invitados

  const lineas: string[] = [
    "Hola, me gustaria confirmar mi asistencia a Bajo el Capo.",
    "",
    `Titular: ${p.nombre} (${formatLocal(p.telefono)})`,
  ];

  p.invitados.forEach((inv, i) => {
    lineas.push(
      `Invitado ${i + 1}: ${inv.nombreCompleto} (${formatLocal(inv.telefono)})`
    );
  });

  lineas.push(
    `Asistentes: ${totalAsistentes}`,
    `Valor a pagar: ${valorCOP}`,
    "",
    "?Cuales son los medios de pago disponibles?"
  );

  const texto = lineas.join("\n");
  return `https://wa.me/${WHATSAPP_ADMIN_NUMBER}?text=${encodeURIComponent(texto)}`;
}

/**
 * Formato local colombiano: 10 digitos agrupados como 3-3-4 (300 123 4567).
 * Acepta cualquier entrada con 10 digitos (+57XXXXXXXXXX, 57XXX, 300..., etc).
 * Si no tiene 10 digitos, devuelve el string sin cambios.
 */
function formatLocal(telefono: string): string {
  const digits = telefono.replace(/\D/g, "");
  if (digits.length < 10) return telefono;
  // Tomamos los ultimos 10 digitos
  const d = digits.slice(-10);
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

/**
 * Construye un URL wa.me simple para un mensaje libre.
 * Util para que el admin pueda contactar al usuario desde el panel
 * (ej. desde `/admin/reservas/[id]`).
 *
 * Quita el `+` inicial y espacios del telefono porque `wa.me` no los acepta.
 */
export function buildWhatsappSimpleUrl(
  telefono: string,
  mensaje: string
): string {
  const numero = telefono.replace(/[\s+]/g, "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
