/**
 * Tipos compartidos entre server actions, pages y client components.
 * ADR-011.
 */

import type { EstadoInvitado, EstadoReserva, MedioPago } from "@prisma/client";

export type { EstadoInvitado, EstadoReserva, MedioPago };

/** Invitado serializado (sin tipos Date de Prisma). */
export interface InvitadoResumen {
  id: string;
  numero: number;
  nombreCompleto: string;
  telefono: string;
  estado: EstadoInvitado;
  codigo: string | null;
  mesaId: string | null;
  silla: number | null;
  registradoEn: Date | null;
  ultimoReingresoEn: Date | null;
  reingresos: number;
  almuerzoEntregadoEn: Date | null;
  refrigerioEntregadoEn: Date | null;
  fechaPago: Date | null;
  fechaAsignacion: Date | null;
}

/** Mesa serializada. */
export interface MesaResumen {
  id: string;
  numero: number;
  capacidad: number;
  notas: string | null;
  ocupados: number;
}

/** Resultado de una accion admin generica. */
export type AdminActionResult<T = void> =
  | { error: null; success: true; message?: string; codigo?: string; data?: T }
  | { error: string; success?: false; message?: string; data?: never };

// --- Estados del validador (mismas 5 que antes, semantica igual) ---

export type ValidarEstado =
  | "ok"
  | "reingreso"
  | "completo"
  | "cancelado"
  | "no_pagado"
  | "no_encontrado";

export interface ValidarIngreso {
  id: string;
  numero: number;
  nombreCompleto: string;
  telefono: string;
  estado: EstadoInvitado;
  codigo: string | null;
  mesaId: string | null;
  mesaNumero: number | null;
  silla: number | null;
  registradoEn: Date | null;
  ultimoReingresoEn: Date | null;
  reingresos: number;
  almuerzoEntregadoEn: Date | null;
  refrigerioEntregadoEn: Date | null;
}

export interface ValidarReserva {
  id: string;
  nombre: string;
  telefono: string;
  cantidadAsistentes: number; // total invitados
  cantidadIngresados: number; // # invitados con estado = ASISTIO
  invitados: ValidarIngreso[];
  estado: EstadoReserva;
}

export interface ValidarResult {
  estado: ValidarEstado;
  codigo: string;
  mensaje: string;
  reserva?: ValidarReserva;
  invitado?: ValidarIngreso;
}

export interface ConfirmarIngresoResult {
  success: boolean;
  message?: string;
  error?: string;
  reserva?: ValidarReserva;
  invitado?: ValidarIngreso;
}

export interface OperacionInvitadoResult {
  success: boolean;
  message?: string;
  error?: string;
  reserva?: ValidarReserva;
  invitado?: ValidarIngreso;
}


