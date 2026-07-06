/**
 * Constantes globales del sistema.
 * Los datos oficiales del evento viven en src/config/event.ts.
 * La fila Configuracion de la base de datos puede sobrescribir datos operativos
 * desde /admin/evento; este archivo provee fallbacks seguros.
 */

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { EVENT_CONFIG } from "@/config/event";

export const MAX_POR_RESERVA = 30;

export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 8;
export const CODE_PREFIX = "CI";

export const MESA_CAPACIDAD_DEFAULT = 8;
export const MESA_CAPACIDAD_MIN = 1;
export const MESA_CAPACIDAD_MAX = 20;

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
    return {
      ...row,
      fecha: row.fecha instanceof Date ? row.fecha : new Date(row.fecha),
      actualizadoEn:
        row.actualizadoEn instanceof Date
          ? row.actualizadoEn
          : new Date(row.actualizadoEn),
    };
  }

  return {
    id: "singleton",
    nombre: EVENT_CONFIG.name,
    fecha: new Date(`${EVENT_CONFIG.startDate}T00:00:00-05:00`),
    puertas: "",
    lugar: EVENT_CONFIG.venue,
    barrio: EVENT_CONFIG.address,
    ciudad: EVENT_CONFIG.city,
    precioPorPersona: EVENT_CONFIG.registrationContribution,
    organizadorNombre: process.env.ADMIN_NAME ?? "Fredy",
    organizadorEmail: process.env.ADMIN_EMAIL?.toLowerCase() ?? "fredy@gmail.com",
    organizadorTelefono: process.env.ADMIN_TELEFONO ?? "",
    organizadorWhatsapp: process.env.WHATSAPP_ADMIN_NUMBER ?? "",
    actualizadoEn: new Date(),
    actualizadoPorId: null,
  };
}

export const PRECIO_PERSONA = Number(
  process.env.EVENT_PRICE_COP ?? EVENT_CONFIG.registrationContribution
);
export const AFORO = Number(process.env.EVENT_CAPACITY ?? 0);
export const EVENT_DATE =
  process.env.EVENT_DATE ?? `${EVENT_CONFIG.startDate}T00:00:00-05:00`;
export const EVENT_NOMBRE = EVENT_CONFIG.name;
export const EVENT_LUGAR = EVENT_CONFIG.venue;
export const EVENT_BARRIO = EVENT_CONFIG.address;

export const WHATSAPP_ADMIN_NUMBER = process.env.WHATSAPP_ADMIN_NUMBER ?? "";
export const WHATSAPP_ADMIN_DISPLAY = process.env.WHATSAPP_ADMIN_DISPLAY ?? "";

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "fredy@gmail.com").toLowerCase();
export const ADMIN_NAME = process.env.ADMIN_NAME ?? "Fredy";
export const ADMIN_TELEFONO = process.env.ADMIN_TELEFONO ?? "";


