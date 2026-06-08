/**
 * Constantes globales del sistema.
 * Los datos del evento son editables desde /admin/evento (modelo Configuracion).
 * Aqui solo quedan las constantes tecnicas (no editables) y los fallbacks
 * para cuando la BD no esta disponible.
 */

import { prisma } from "@/lib/db";

// ============================================================
// CONSTANTES TECNICAS (no editables desde UI)
// ============================================================

export const MAX_POR_RESERVA = 30; // ADR-011: tope defensivo

export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 8;
export const CODE_PREFIX = "BC";

// Mesas (ADR-011)
export const MESA_CAPACIDAD_DEFAULT = 8;
export const MESA_CAPACIDAD_MIN = 1;
export const MESA_CAPACIDAD_MAX = 20;

// ============================================================
// DATOS DEL EVENTO (editables desde /admin/evento)
// Con cache de 60s via unstable_cache. Se invalida en revalidatePath.
// ============================================================

import { unstable_cache } from "next/cache";

export type ConfiguracionData = {
  id: string;
  nombre: string;
  fecha: Date;
  puertas: string;
  lugar: string;
  barrio: string | null;
  ciudad: string | null;
  precioPorPersona: number;
  organizadorNombre: string;
  organizadorEmail: string;
  organizadorTelefono: string;
  organizadorWhatsapp: string;
  actualizadoEn: Date;
  actualizadoPorId: string | null;
};

/**
 * Garantiza que el valor sea un Date valido. Si unstable_cache nos devuelve
 * un string ISO (por serializacion), lo re-hidrata. Si esta corrupto o
 * ausente, cae al fallback provisto.
 *
 * Usar siempre que se vaya a formatear una fecha de Configuracion con
 * Intl.DateTimeFormat, .toLocaleDateString, etc.
 */
export function toValidDate(
  value: Date | string | number | null | undefined,
  fallback: Date
): Date {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return fallback;
}

const _getConfiguracionRaw = unstable_cache(
  async () => {
    return prisma.configuracion.findUnique({ where: { id: "singleton" } });
  },
  ["configuracion-singleton"],
  { revalidate: 60, tags: ["configuracion"] }
);

export async function getConfiguracion(): Promise<ConfiguracionData> {
  const row = await _getConfiguracionRaw();
  if (row) {
    // unstable_cache serializa el resultado para guardarlo: los Date se vuelven
    // strings ISO. Hay que re-hidratar antes de devolver para que los
    // consumidores (Intl.DateTimeFormat, .toISOString, etc.) funcionen.
    return {
      ...row,
      fecha: row.fecha instanceof Date ? row.fecha : new Date(row.fecha),
      actualizadoEn:
        row.actualizadoEn instanceof Date
          ? row.actualizadoEn
          : new Date(row.actualizadoEn),
    };
  }
  // Fallback: si por algun motivo no existe la fila singleton,
  // devolver valores por defecto (mismos que el seed).
  return {
    id: "singleton",
    nombre: "Bajo el Capo",
    fecha: new Date("2026-06-20T18:00:00-05:00"),
    puertas: "5:45 pm",
    lugar: "Iglesia Cruzada Cristiana Fuente de Agua Viva",
    barrio: "Barrio San Francisco",
    ciudad: null,
    precioPorPersona: 25000,
    organizadorNombre: "Fredy",
    organizadorEmail: "fredy@gmail.com",
    organizadorTelefono: "+573118268444",
    organizadorWhatsapp: "573118268444",
    actualizadoEn: new Date(),
    actualizadoPorId: null,
  };
}

// ============================================================
// FALLBACKS / CONSTANTES LEGACY (para scripts y seeds)
// Estos se mantienen por compatibilidad pero la UI debe usar getConfiguracion().
// ============================================================

export const PRECIO_PERSONA = Number(process.env.EVENT_PRICE_COP ?? 25000);
export const AFORO = Number(process.env.EVENT_AFORO ?? 150);
export const EVENT_DATE = process.env.EVENT_DATE ?? "2026-06-20T18:00:00-05:00";
export const EVENT_NOMBRE = "Bajo el Capo";
export const EVENT_LUGAR = "Iglesia Cruzada Cristiana Fuente de Agua Viva";
export const EVENT_BARRIO = "Barrio San Francisco";

export const WHATSAPP_ADMIN_NUMBER =
  process.env.WHATSAPP_ADMIN_NUMBER ?? "573118268444";
export const WHATSAPP_ADMIN_DISPLAY = "+57 311 826 8444";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "fredy@gmail.com";
export const ADMIN_NAME = process.env.ADMIN_NAME ?? "Fredy";
export const ADMIN_TELEFONO = process.env.ADMIN_TELEFONO ?? "+573118268444";
