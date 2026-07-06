import { customAlphabet, nanoid } from "nanoid";
import { CODE_ALPHABET, CODE_LENGTH, CODE_PREFIX } from "./constants";

const generate = customAlphabet(CODE_ALPHABET, CODE_LENGTH);

/**
 * Genera un codigo de entrada tipo `CI-A7K2P9M3`.
 * Longitud: 8 caracteres del alfabeto sin ambiguos (sin 0/O, 1/I/L).
 * Prefijo: CI (Cumbre Impacto).
 */
export function generateEntradaCode(): string {
  return `${CODE_PREFIX}-${generate()}`;
}

/**
 * Genera una contrasena temporal de 10 caracteres.
 * Usa el alfabeto sin ambiguos (mismo que el codigo de entrada).
 * La contrasena es legible, facil de dictar por WhatsApp y
 * no contiene 0/O, 1/I/L que se confunden.
 *
 * El usuario DEBE cambiarla al primer login
 * (User.debeCambiarContrasena = true se setea al asignarla).
 */
export function generateTempPassword(): string {
  // 10 chars para un balance entre seguridad y facilidad de dictado.
  return customAlphabet(CODE_ALPHABET, 10)();
}

/**
 * Genera un token opaco (para futuras features como "link magico" de reset).
 * No se usa actualmente (hoy se hace via pwd temporal) pero queda disponible.
 */
export function generateOpaqueToken(): string {
  return nanoid(32);
}


