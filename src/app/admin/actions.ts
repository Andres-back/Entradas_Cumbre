"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { EstadoInvitado, EstadoReserva, MedioPago, Prisma, Rol } from "@prisma/client";

import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import {
  MESA_CAPACIDAD_MAX,
  MESA_CAPACIDAD_MIN,
  getConfiguracion,
} from "@/lib/constants";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { generateEntradaCode, generateTempPassword } from "@/lib/code";
import { hashPassword, verifyPassword } from "@/lib/password";
import { ROL_PIC_OPTIONS } from "@/lib/pic";
import { buildTemporaryPasswordPlan } from "@/lib/temporary-password";
import { normalizePhoneE164, normalizeWhatsAppNumber } from "@/lib/whatsapp";

import type {
  AdminActionResult,
  ConfirmarIngresoResult,
  OperacionInvitadoResult,
  ValidarIngreso,
  ValidarReserva,
  ValidarResult,
} from "@/lib/types";

// ============================================================
// Helpers
// ============================================================

const idSchema = z.string().regex(/^[a-z0-9]{25}$/, "ID inválido");

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login?next=/admin");
  }
  return session;
}

function normalizeCode(input: string): string {
  const trimmed = input.trim().toUpperCase().replace(/\s+/g, "");
  if (trimmed.length === 10 && !trimmed.includes("-")) {
    return `${trimmed.slice(0, 2)}-${trimmed.slice(2)}`;
  }
  return trimmed;
}

const CODE_REGEX = /^CI-[A-Z2-9]{8}$/;

const phoneSchema = z
  .string()
  .trim()
  .transform((value) => normalizePhoneE164(value))
  .pipe(z.string().min(1, "Telefono invalido: usa entre 7 y 15 digitos"));

const optionalDateSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? new Date(`${value}T00:00:00-05:00`) : null))
  .refine((value) => !value || !Number.isNaN(value.getTime()), "Fecha invalida")
  .refine((value) => !value || value <= new Date(), "La fecha no puede ser futura");

// ============================================================
// Serializers
// ============================================================

type ReservaForSerialize = {
  id: string;
  estado: EstadoReserva;
  user: { nombreCompleto: string; telefono: string };
  invitados: {
    id: string;
    numero: number;
    nombreCompleto: string;
    telefono: string;
    estado: EstadoInvitado;
    codigo: string | null;
    mesaId: string | null;
    mesa?: { numero: number } | null;
    silla: number | null;
    registradoEn: Date | null;
    ultimoReingresoEn: Date | null;
    reingresos: number;
    almuerzoEntregadoEn: Date | null;
    refrigerioEntregadoEn: Date | null;
  }[];
};

type InvitadoForSerialize = ReservaForSerialize["invitados"][number];

function serializeInvitado(invitado: InvitadoForSerialize): ValidarIngreso {
  return {
    id: invitado.id,
    numero: invitado.numero,
    nombreCompleto: invitado.nombreCompleto,
    telefono: invitado.telefono,
    estado: invitado.estado,
    codigo: invitado.codigo,
    mesaId: invitado.mesaId,
    mesaNumero: invitado.mesa?.numero ?? null,
    silla: invitado.silla,
    registradoEn: invitado.registradoEn,
    ultimoReingresoEn: invitado.ultimoReingresoEn,
    reingresos: invitado.reingresos,
    almuerzoEntregadoEn: invitado.almuerzoEntregadoEn,
    refrigerioEntregadoEn: invitado.refrigerioEntregadoEn,
  };
}

function serializeReserva(reserva: ReservaForSerialize): ValidarReserva {
  const cantidadIngresados = reserva.invitados.filter(
    (i) => i.estado === EstadoInvitado.ASISTIO
  ).length;
  return {
    id: reserva.id,
    estado: reserva.estado,
    cantidadAsistentes: reserva.invitados.length,
    cantidadIngresados,
    invitados: reserva.invitados
      .sort((a, b) => a.numero - b.numero)
      .map(serializeInvitado),
    nombre: reserva.user.nombreCompleto,
    telefono: reserva.user.telefono,
  };
}

// ============================================================
// VALIDAR CODIGO (validador puerta, ADR-011)
// ============================================================

export async function validarCodigo(
  _prev: ValidarResult | null,
  formData: FormData
): Promise<ValidarResult> {
  await requireAdmin();
  const raw = String(formData.get("codigo") ?? "");
  const codigo = normalizeCode(raw);

  if (!CODE_REGEX.test(codigo)) {
    return {
      estado: "no_encontrado",
      codigo: raw,
      mensaje: "Código inválido. Verifica el formato CI-XXXXXXXX.",
    };
  }

  const invitado = await prisma.invitado.findUnique({
    where: { codigo },
    include: {
      mesa: { select: { numero: true } },
      reserva: {
        include: {
          user: { select: { nombreCompleto: true, telefono: true } },
          invitados: {
            orderBy: { numero: "asc" },
            include: { mesa: { select: { numero: true } } },
          },
        },
      },
    },
  });

  if (!invitado) {
    return {
      estado: "no_encontrado",
      codigo,
      mensaje: "No encontré ningún código de entrada con ese valor.",
    };
  }

  const reservaPayload = serializeReserva(invitado.reserva);
  const invitadoPayload = serializeInvitado(invitado);

  if (invitado.reserva.estado === EstadoReserva.CANCELADO) {
    return {
      estado: "cancelado",
      codigo,
      mensaje: "Reserva cancelada. Código sin vigencia.",
      reserva: reservaPayload,
      invitado: invitadoPayload,
    };
  }

  if (invitado.estado === EstadoInvitado.PENDIENTE_PAGO) {
    return {
      estado: "no_pagado",
      codigo,
      mensaje: "Invitado aporte pendiente. Código aún no habilitado.",
      reserva: reservaPayload,
      invitado: invitadoPayload,
    };
  }

  if (invitado.estado === EstadoInvitado.ASISTIO || invitado.registradoEn !== null) {
    return {
      estado: "reingreso",
      codigo,
      mensaje: `Primer ingreso a las ${
        invitado.registradoEn?.toLocaleTimeString("es-CO", {
          hour: "numeric",
          minute: "2-digit",
        }) ?? "?"
      }. Reingreso permitido.`,
      reserva: reservaPayload,
      invitado: invitadoPayload,
    };
  }

  return {
    estado: "ok",
    codigo,
    mensaje: "Válido. Dejar entrar.",
    reserva: reservaPayload,
    invitado: invitadoPayload,
  };
}

// ============================================================
// CONFIRMAR INGRESO (1 persona entra)
// ============================================================

export async function confirmarIngreso(
  invitadoId: string
): Promise<ConfirmarIngresoResult> {
  await requireAdmin();
  const idResult = idSchema.safeParse(invitadoId);
  if (!idResult.success) return { success: false, error: "ID de invitado inválido." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const invitado = await tx.invitado.findUnique({
        where: { id: invitadoId },
        include: {
          mesa: { select: { numero: true } },
          reserva: {
            include: {
              user: { select: { nombreCompleto: true, telefono: true } },
              invitados: {
                orderBy: { numero: "asc" },
                include: { mesa: { select: { numero: true } } },
              },
            },
          },
        },
      });

      if (!invitado) throw new Error("INVITADO_NO_EXISTE");
      if (invitado.estado === EstadoInvitado.ASISTIO || invitado.registradoEn !== null) {
        throw new Error("INVITADO_YA_ENTRO");
      }
      if (invitado.estado !== EstadoInvitado.PAGADO) {
        throw new Error("INVITADO_NO_PAGADO");
      }
      if (invitado.reserva.estado === EstadoReserva.CANCELADO) {
        throw new Error("RESERVA_CANCELADA");
      }

    const ahora = new Date();
    await tx.invitado.update({
      where: { id: invitadoId },
      data: { estado: EstadoInvitado.ASISTIO, registradoEn: ahora },
    });

    // Contar invitados en estado ASISTIO de la reserva
    const totalAsistieron = await tx.invitado.count({
      where: { reservaId: invitado.reservaId, estado: EstadoInvitado.ASISTIO },
    });
    // Y total que ya "pasaron" (PAGADO + ASISTIO)
    const totalPagados = await tx.invitado.count({
      where: {
        reservaId: invitado.reservaId,
        estado: { in: [EstadoInvitado.PAGADO, EstadoInvitado.ASISTIO] },
      },
    });

    const grupoCompleto = totalAsistieron === totalPagados;
    const newReservaEstado =
      grupoCompleto && totalPagados > 0
        ? EstadoReserva.ASISTIO
        : invitado.reserva.estado === EstadoReserva.PAGO_PENDIENTE
        ? EstadoReserva.PARCIAL
        : invitado.reserva.estado;

    await tx.reserva.update({
      where: { id: invitado.reservaId },
      data: {
        ...(grupoCompleto && totalPagados > 0
          ? { estado: EstadoReserva.ASISTIO, asistioEn: ahora }
          : {
              estado: newReservaEstado,
            }),
      },
    });

    const updated = await tx.reserva.findUniqueOrThrow({
      where: { id: invitado.reservaId },
      include: {
        user: { select: { nombreCompleto: true, telefono: true } },
        invitados: {
          orderBy: { numero: "asc" },
          include: { mesa: { select: { numero: true } } },
        },
      },
    });

    const invitadoUpdated = updated.invitados.find((i) => i.id === invitadoId)!;
    return {
      message: grupoCompleto
        ? `Grupo completo. ${totalAsistieron}/${updated.invitados.length}.`
        : `Persona adentro. ${totalAsistieron}/${updated.invitados.length} en el grupo.`,
      reserva: serializeReserva(updated),
      invitado: serializeInvitado(invitadoUpdated),
    };
  });

  revalidatePath("/admin/validar");
  revalidatePath("/admin/reservas");
  revalidatePath(`/admin/reservas/${result.reserva.id}`);
  revalidatePath("/admin/mesas");
  revalidatePath("/mi-reserva");
  return { success: true, ...result };
  } catch (err) {
    if (err instanceof Error) {
      const msg = err.message;
      if (msg === "INVITADO_NO_EXISTE") return { success: false, error: "Invitado no encontrado." };
      if (msg === "INVITADO_YA_ENTRO") return { success: false, error: "Este invitado ya ingresó." };
      if (msg === "INVITADO_NO_PAGADO") return { success: false, error: "El invitado no ha confirmado todavía." };
      if (msg === "RESERVA_CANCELADA") return { success: false, error: "La reserva fue cancelada." };
    }
    throw err;
  }
}

export async function confirmarReingreso(
  invitadoId: string
): Promise<OperacionInvitadoResult> {
  await requireAdmin();
  const idResult = idSchema.safeParse(invitadoId);
  if (!idResult.success) return { success: false, error: "ID de invitado inválido." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const invitado = await tx.invitado.findUnique({
        where: { id: invitadoId },
        include: {
          mesa: { select: { numero: true } },
          reserva: {
            include: {
              user: { select: { nombreCompleto: true, telefono: true } },
              invitados: {
                orderBy: { numero: "asc" },
                include: { mesa: { select: { numero: true } } },
              },
            },
          },
        },
      });

      if (!invitado) throw new Error("INVITADO_NO_EXISTE");
      if (invitado.reserva.estado === EstadoReserva.CANCELADO) {
        throw new Error("RESERVA_CANCELADA");
      }
      if (invitado.estado !== EstadoInvitado.ASISTIO || !invitado.registradoEn) {
        throw new Error("INVITADO_SIN_INGRESO");
      }

      const ahora = new Date();
      await tx.invitado.update({
        where: { id: invitadoId },
        data: {
          reingresos: { increment: 1 },
          ultimoReingresoEn: ahora,
        },
      });

      const updated = await tx.reserva.findUniqueOrThrow({
        where: { id: invitado.reservaId },
        include: {
          user: { select: { nombreCompleto: true, telefono: true } },
          invitados: {
            orderBy: { numero: "asc" },
            include: { mesa: { select: { numero: true } } },
          },
        },
      });

      const invitadoUpdated = updated.invitados.find((i) => i.id === invitadoId)!;
      return {
        message: `Reingreso registrado. Total: ${invitadoUpdated.reingresos}.`,
        reserva: serializeReserva(updated),
        invitado: serializeInvitado(invitadoUpdated),
      };
    });

    revalidatePath("/admin/validar");
    revalidatePath("/admin/reservas");
    revalidatePath(`/admin/reservas/${result.reserva.id}`);
    revalidatePath("/mi-reserva");
    return { success: true, ...result };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "INVITADO_NO_EXISTE") return { success: false, error: "Invitado no encontrado." };
      if (err.message === "RESERVA_CANCELADA") return { success: false, error: "La reserva fue cancelada." };
      if (err.message === "INVITADO_SIN_INGRESO") return { success: false, error: "Primero registra el ingreso inicial." };
    }
    throw err;
  }
}

export async function marcarAlmuerzoEntregado(
  invitadoId: string
): Promise<OperacionInvitadoResult> {
  await requireAdmin();
  const idResult = idSchema.safeParse(invitadoId);
  if (!idResult.success) return { success: false, error: "ID de invitado inválido." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const invitado = await tx.invitado.findUnique({
        where: { id: invitadoId },
        include: {
          mesa: { select: { numero: true } },
          reserva: {
            include: {
              user: { select: { nombreCompleto: true, telefono: true } },
              invitados: {
                orderBy: { numero: "asc" },
                include: { mesa: { select: { numero: true } } },
              },
            },
          },
        },
      });

      if (!invitado) throw new Error("INVITADO_NO_EXISTE");
      if (invitado.reserva.estado === EstadoReserva.CANCELADO) {
        throw new Error("RESERVA_CANCELADA");
      }
      if (invitado.estado === EstadoInvitado.PENDIENTE_PAGO) {
        throw new Error("INVITADO_NO_PAGADO");
      }
      if (invitado.almuerzoEntregadoEn) {
        throw new Error("ALMUERZO_YA_ENTREGADO");
      }

      await tx.invitado.update({
        where: { id: invitadoId },
        data: { almuerzoEntregadoEn: new Date() },
      });

      const updated = await tx.reserva.findUniqueOrThrow({
        where: { id: invitado.reservaId },
        include: {
          user: { select: { nombreCompleto: true, telefono: true } },
          invitados: {
            orderBy: { numero: "asc" },
            include: { mesa: { select: { numero: true } } },
          },
        },
      });

      const invitadoUpdated = updated.invitados.find((i) => i.id === invitadoId)!;
      return {
        message: `Almuerzo entregado a ${invitadoUpdated.nombreCompleto.split(" ")[0]}.`,
        reserva: serializeReserva(updated),
        invitado: serializeInvitado(invitadoUpdated),
      };
    });

    revalidatePath("/admin/validar");
    revalidatePath("/admin/reservas");
    revalidatePath(`/admin/reservas/${result.reserva.id}`);
    revalidatePath("/mi-reserva");
    return { success: true, ...result };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "INVITADO_NO_EXISTE") return { success: false, error: "Invitado no encontrado." };
      if (err.message === "RESERVA_CANCELADA") return { success: false, error: "La reserva fue cancelada." };
      if (err.message === "INVITADO_NO_PAGADO") return { success: false, error: "El invitado no ha confirmado aporte." };
      if (err.message === "ALMUERZO_YA_ENTREGADO") return { success: false, error: "El almuerzo ya fue entregado." };
    }
    throw err;
  }
}

export async function marcarRefrigerioEntregado(
  invitadoId: string
): Promise<OperacionInvitadoResult> {
  await requireAdmin();
  const idResult = idSchema.safeParse(invitadoId);
  if (!idResult.success) return { success: false, error: "ID de invitado inválido." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const invitado = await tx.invitado.findUnique({
        where: { id: invitadoId },
        include: {
          mesa: { select: { numero: true } },
          reserva: {
            include: {
              user: { select: { nombreCompleto: true, telefono: true } },
              invitados: {
                orderBy: { numero: "asc" },
                include: { mesa: { select: { numero: true } } },
              },
            },
          },
        },
      });

      if (!invitado) throw new Error("INVITADO_NO_EXISTE");
      if (invitado.reserva.estado === EstadoReserva.CANCELADO) {
        throw new Error("RESERVA_CANCELADA");
      }
      if (invitado.estado === EstadoInvitado.PENDIENTE_PAGO) {
        throw new Error("INVITADO_NO_PAGADO");
      }
      if (invitado.refrigerioEntregadoEn) {
        throw new Error("REFRIGERIO_YA_ENTREGADO");
      }

      await tx.invitado.update({
        where: { id: invitadoId },
        data: { refrigerioEntregadoEn: new Date() },
      });

      const updated = await tx.reserva.findUniqueOrThrow({
        where: { id: invitado.reservaId },
        include: {
          user: { select: { nombreCompleto: true, telefono: true } },
          invitados: {
            orderBy: { numero: "asc" },
            include: { mesa: { select: { numero: true } } },
          },
        },
      });

      const invitadoUpdated = updated.invitados.find((i) => i.id === invitadoId)!;
      return {
        message: `Refrigerio entregado a ${invitadoUpdated.nombreCompleto.split(" ")[0]}.`,
        reserva: serializeReserva(updated),
        invitado: serializeInvitado(invitadoUpdated),
      };
    });

    revalidatePath("/admin/validar");
    revalidatePath("/admin/reservas");
    revalidatePath(`/admin/reservas/${result.reserva.id}`);
    revalidatePath("/mi-reserva");
    return { success: true, ...result };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "INVITADO_NO_EXISTE") return { success: false, error: "Invitado no encontrado." };
      if (err.message === "RESERVA_CANCELADA") return { success: false, error: "La reserva fue cancelada." };
      if (err.message === "INVITADO_NO_PAGADO") return { success: false, error: "El invitado no ha confirmado aporte." };
      if (err.message === "REFRIGERIO_YA_ENTREGADO") return { success: false, error: "El refrigerio ya fue entregado." };
    }
    throw err;
  }
}

// ============================================================
// MARCAR INVITADOS PAGADOS (admin, ADR-011: pago por invitado)
// ============================================================

const marcarPagadoSchema = z.object({
  invitadoIds: z.array(z.string().min(1)).min(1, "Selecciona al menos un invitado"),
  medio: z.nativeEnum(MedioPago),
  referencia: z.string().max(120).optional().nullable(),
  notasInternas: z.string().max(500).optional().nullable(),
});

export async function marcarInvitadosPagados(
  _prev: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  const adminId = session.user.id;

  // invitadoIds viene como CSV (porque el form no soporta arrays nativos).
  const invitadoIdsRaw = formData.getAll("invitadoIds").map(String);
  const parsed = marcarPagadoSchema.safeParse({
    invitadoIds: invitadoIdsRaw,
    medio: formData.get("medio"),
    referencia: formData.get("referencia") || null,
    notasInternas:
      formData.get("notas") || formData.get("notasInternas") || null,
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Datos inválidos." };
  }

  const { invitadoIds, medio, referencia, notasInternas } = parsed.data;
  const config = await getConfiguracion();
  const monto = invitadoIds.length * config.precioPorPersona;

  let resultado;
  try {
    resultado = await prisma.$transaction(async (tx) => {
      const invitados = await tx.invitado.findMany({
        where: { id: { in: invitadoIds } },
        include: { reserva: { select: { id: true, estado: true } } },
      });
      if (invitados.length !== invitadoIds.length) {
        throw new Error("ALGUN_INVITADO_NO_EXISTE");
      }
      for (const inv of invitados) {
        if (inv.estado !== EstadoInvitado.PENDIENTE_PAGO) {
          throw new Error("INVITADO_YA_PAGADO");
        }
        if (inv.reserva.estado === EstadoReserva.CANCELADO) {
          throw new Error("RESERVA_CANCELADA");
        }
      }

      const reservaIds = new Set(invitados.map((i) => i.reserva.id));
      if (reservaIds.size !== 1) {
        throw new Error("INVITADOS_DE_DIFERENTES_RESERVAS");
      }
      const reservaId = invitados[0].reserva.id;

      const codigosAsignados: string[] = [];
      for (const inv of invitados) {
        let attempts = 0;
        let code: string | null = null;
        while (attempts < 5) {
          const candidate = generateEntradaCode();
          try {
            await tx.invitado.update({
              where: { id: inv.id, estado: EstadoInvitado.PENDIENTE_PAGO },
              data: {
                estado: EstadoInvitado.PAGADO,
                codigo: candidate,
                adminIdPago: adminId,
                fechaPago: new Date(),
              },
            });
            code = candidate;
            break;
          } catch (err) {
            if (
              err instanceof Prisma.PrismaClientKnownRequestError &&
              err.code === "P2002"
            ) {
              attempts++;
              continue;
            }
            throw err;
          }
        }
        if (!code) throw new Error("NO_SE_PUDO_GENERAR_CODIGO");
        codigosAsignados.push(code);
      }

      await tx.pago.create({
        data: {
          reservaId,
          medio,
          referencia,
          notasInternas,
          monto,
          adminId,
          invitadosCubiertos: invitadoIds,
        },
      });

      const totalPagadosAhora = await tx.invitado.count({
        where: {
          reservaId,
          estado: { in: [EstadoInvitado.PAGADO, EstadoInvitado.ASISTIO] },
        },
      });
      const nuevoEstado =
        totalPagadosAhora > 0
          ? EstadoReserva.PARCIAL
          : EstadoReserva.PAGO_PENDIENTE;

      await tx.reserva.update({
        where: { id: reservaId },
        data: { estado: nuevoEstado },
      });

      return { reservaId, codigosAsignados };
    });
  } catch (err) {
    if (err instanceof Error) {
      const msg = err.message;
      if (msg === "ALGUN_INVITADO_NO_EXISTE") return { error: "Uno o más invitados no existen. Refrescá la página." };
      if (msg === "INVITADO_YA_PAGADO") return { error: "Uno de los invitados ya fue marcado como confirmado." };
      if (msg === "RESERVA_CANCELADA") return { error: "La reserva fue cancelada." };
      if (msg === "INVITADOS_DE_DIFERENTES_RESERVAS") return { error: "Los invitados pertenecen a distintas reservas." };
      if (msg === "NO_SE_PUDO_GENERAR_CODIGO") return { error: "No se pudo generar un código único. Intentá de nuevo." };
    }
    throw err;
  }

  revalidatePath("/admin/reservas");
  revalidatePath(`/admin/reservas/${resultado.reservaId}`);
  revalidatePath("/admin/pagos");
  revalidatePath("/admin");
  revalidatePath("/admin/mesas");
  revalidatePath("/mi-reserva");

  return {
    error: null,
    success: true,
    message: `Aporte registrado. ${invitadoIds.length} invitado${
      invitadoIds.length === 1 ? "" : "s"
    } confirmado${invitadoIds.length === 1 ? "" : "s"}.`,
    codigo: resultado.codigosAsignados[0],
  };
}

// ============================================================
// ASIGNAR MESA (admin, ADR-011)
// ============================================================

const asignarMesaSchema = z.object({
  invitadoId: idSchema,
  mesaId: idSchema,
  silla: z.coerce.number().int().min(1),
});

export async function asignarMesa(
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  const adminId = session.user.id;

  const parsed = asignarMesaSchema.safeParse({
    invitadoId: formData.get("invitadoId"),
    mesaId: formData.get("mesaId"),
    silla: formData.get("silla"),
  });
  if (!parsed.success) {
    return { error: "Datos inválidos." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const mesa = await tx.mesa.findUnique({
        where: { id: parsed.data.mesaId },
      });
      if (!mesa) throw new Error("MESA_NO_EXISTE");
      if (parsed.data.silla > mesa.capacidad) {
        throw new Error("SILLA_FUERA_DE_RANGO");
      }
      const invitado = await tx.invitado.findUnique({
        where: { id: parsed.data.invitadoId },
      });
      if (!invitado) throw new Error("INVITADO_NO_EXISTE");

      // Verificar que la silla esté libre en esta mesa
      const ocupado = await tx.invitado.findFirst({
        where: {
          mesaId: parsed.data.mesaId,
          silla: parsed.data.silla,
          NOT: { id: parsed.data.invitadoId },
        },
      });
      if (ocupado) {
        throw new Error("SILLA_OCUPADA");
      }

      await tx.invitado.update({
        where: { id: parsed.data.invitadoId },
        data: {
          mesaId: parsed.data.mesaId,
          silla: parsed.data.silla,
          adminIdAsignacion: adminId,
          fechaAsignacion: new Date(),
        },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Esa silla ya está ocupada. Elija otra." };
    }
    if (err instanceof Error) {
      if (err.message === "SILLA_OCUPADA") return { error: "Esa silla ya está ocupada por otra persona." };
      if (err.message === "MESA_NO_EXISTE") return { error: "La mesa no existe. Recargue la página." };
      if (err.message === "INVITADO_NO_EXISTE") return { error: "La persona no existe. Recargue la página." };
      if (err.message === "SILLA_FUERA_DE_RANGO") return { error: "La silla está fuera del rango de la mesa." };
    }
    throw err;
  }

  revalidatePath("/admin/mesas");
  revalidatePath("/admin/reservas");
  revalidatePath("/mi-reserva");
  return { error: null, success: true, message: "Mesa asignada." };
}

/** Quita la mesa+silla de un invitado. */
export async function quitarDeMesa(
  invitadoId: string
): Promise<AdminActionResult> {
  await requireAdmin();
  const idResult = idSchema.safeParse(invitadoId);
  if (!idResult.success) return { error: "ID de invitado inválido." };
  try {
    await prisma.invitado.update({
      where: { id: invitadoId },
      data: { mesaId: null, silla: null, fechaAsignacion: null },
    });
  } catch {
    return { error: "Error al quitar la mesa. Intentá de nuevo." };
  }
  revalidatePath("/admin/mesas");
  revalidatePath("/admin/reservas");
  revalidatePath("/mi-reserva");
  return { error: null, success: true, message: "Mesa removida." };
}

// ============================================================
// MESAS: crear, eliminar, cambiar capacidad
// ============================================================

const crearMesaSchema = z.object({
  capacidad: z.coerce
    .number()
    .int()
    .min(MESA_CAPACIDAD_MIN, `Mínimo ${MESA_CAPACIDAD_MIN} sillas`)
    .max(MESA_CAPACIDAD_MAX, `Máximo ${MESA_CAPACIDAD_MAX} sillas`),
});

export async function crearMesa(
  formData: FormData
): Promise<AdminActionResult> {
  await requireAdmin();
  const parsed = crearMesaSchema.safeParse({
    capacidad: formData.get("capacidad") ?? 8,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    const mesa = await prisma.$transaction(async (tx) => {
      const last = await tx.mesa.findFirst({
        orderBy: { numero: "desc" },
        select: { numero: true },
      });
      const nextNumero = (last?.numero ?? 0) + 1;
      return tx.mesa.create({
        data: { numero: nextNumero, capacidad: parsed.data.capacidad },
      });
    });
    revalidatePath("/admin/mesas");
    return {
      error: null,
      success: true,
      message: `Mesa ${mesa.numero} creada.`,
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Alguien más creó una mesa al mismo tiempo. Intentalo de nuevo." };
    }
    throw err;
  }
}

export async function eliminarMesa(mesaId: string): Promise<AdminActionResult> {
  await requireAdmin();
  const idResult = idSchema.safeParse(mesaId);
  if (!idResult.success) return { error: "ID de mesa inválido." };
  try {
    await prisma.$transaction(async (tx) => {
      const ocupados = await tx.invitado.count({
        where: { mesaId, silla: { not: null } },
      });
      if (ocupados > 0) {
        throw new Error(
          `No se puede eliminar: hay ${ocupados} invitado${ocupados === 1 ? "" : "s"} sentado${ocupados === 1 ? "" : "s"}.`
        );
      }
      // Limpiar sillas huerfanas (seguridad: mesaId=null pero silla seteada)
      await tx.invitado.updateMany({
        where: { mesaId, silla: { not: null } },
        data: { silla: null },
      });
      await tx.mesa.delete({ where: { id: mesaId } });
    });
    revalidatePath("/admin/mesas");
    return { error: null, success: true, message: "Mesa eliminada." };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("No se puede eliminar")) {
      return { error: err.message };
    }
    throw err;
  }
}

const cambiarCapacidadSchema = z.object({
  mesaId: idSchema,
  capacidad: z.coerce
    .number()
    .int()
    .min(MESA_CAPACIDAD_MIN)
    .max(MESA_CAPACIDAD_MAX),
});

export async function cambiarCapacidadMesa(
  formData: FormData
): Promise<AdminActionResult> {
  await requireAdmin();
  const parsed = cambiarCapacidadSchema.safeParse({
    mesaId: formData.get("mesaId"),
    capacidad: formData.get("capacidad"),
  });
  if (!parsed.success) {
    return { error: "Datos inválidos." };
  }

  // Si la nueva capacidad es menor, asegurar que no hay sillas fuera de rango
  const fueraDeRango = await prisma.invitado.count({
    where: { mesaId: parsed.data.mesaId, silla: { gt: parsed.data.capacidad } },
  });
  if (fueraDeRango > 0) {
    return {
      error: `Hay ${fueraDeRango} invitado${
        fueraDeRango === 1 ? "" : "s"
      } sentado${fueraDeRango === 1 ? "" : "s"} en sillas que exceden la nueva capacidad. Muévelos primero.`,
    };
  }

  await prisma.mesa.update({
    where: { id: parsed.data.mesaId },
    data: { capacidad: parsed.data.capacidad },
  });
  revalidatePath("/admin/mesas");
  return { error: null, success: true, message: "Capacidad actualizada." };
}

// ============================================================
// CANCELAR RESERVA (admin)
// ============================================================

export async function cancelarReserva(
  reservaId: string,
  formData: FormData
): Promise<AdminActionResult> {
  await requireAdmin();
  const idResult = idSchema.safeParse(reservaId);
  if (!idResult.success) return { error: "ID de reserva inválido." };
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (motivo.length < 5) {
    return { error: "El motivo es obligatorio (mínimo 5 caracteres)." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const confirmados = await tx.invitado.count({
        where: { reservaId, estado: { in: [EstadoInvitado.PAGADO, EstadoInvitado.ASISTIO] } },
      });
      if (confirmados > 0) {
        throw new Error(
          `Hay ${confirmados} invitado${confirmados === 1 ? "" : "s"} que ya pagó${confirmados === 1 ? "" : "aron"}. Antes de cancelar, revértelos o coordiná el reembolso.`
        );
      }

      await tx.reserva.update({
        where: { id: reservaId },
        data: {
          estado: EstadoReserva.CANCELADO,
          motivoCancelacion: motivo,
          canceladaEn: new Date(),
        },
      });
    });
  } catch (err) {
    if (err instanceof Error) return { error: err.message };
    throw err;
  }

  revalidatePath("/admin/reservas");
  revalidatePath(`/admin/reservas/${reservaId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/mesas");
  return { error: null, success: true, message: "Reserva cancelada." };
}

// ============================================================
// REACTIVAR RESERVA (admin)
// ============================================================

export async function reactivarReserva(
  reservaId: string
): Promise<AdminActionResult> {
  await requireAdmin();
  const idResult = idSchema.safeParse(reservaId);
  if (!idResult.success) return { error: "ID de reserva inválido." };

  // Consultar estado real de los invitados para asignar el estado correcto
  const confirmadosAhora = await prisma.invitado.count({
    where: { reservaId, estado: { in: [EstadoInvitado.PAGADO, EstadoInvitado.ASISTIO] } },
  });
  const nuevoEstado = confirmadosAhora > 0 ? EstadoReserva.PARCIAL : EstadoReserva.PAGO_PENDIENTE;

  await prisma.reserva.update({
    where: { id: reservaId },
    data: {
      estado: nuevoEstado,
      motivoCancelacion: null,
      canceladaEn: null,
    },
  });
  revalidatePath("/admin/reservas");
  revalidatePath(`/admin/reservas/${reservaId}`);
  revalidatePath("/admin/mesas");
  return { error: null, success: true, message: "Reserva reactivada." };
}

// ============================================================
// RESETEAR CONTRASENA DE USUARIO (admin, ADR-009)
// ============================================================

export type ResetearContrasenaResult = {
  success: boolean;
  error?: string;
  contrasenaTemporal?: string;
};

export async function resetearContrasenaUsuario(
  userId: string
): Promise<ResetearContrasenaResult> {
  const session = await requireAdmin();
  const idResult = idSchema.safeParse(userId);
  if (!idResult.success) return { success: false, error: "ID de usuario inválido." };
  if (userId === session.user.id) {
    return {
      success: false,
      error: "Usa /admin/cuenta para cambiar tu propia contraseña.",
    };
  }
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, nombreCompleto: true },
  });
  if (!target) {
    return { success: false, error: "Usuario no encontrado." };
  }
  const pwd = generateTempPassword();
  const passwordHash = await hashPassword(pwd);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, debeCambiarContrasena: true },
  });
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/reservas");
  return { success: true, contrasenaTemporal: pwd };
}

// ============================================================
// CAMBIAR MI CONTRASENA (admin, ADR-009)
// ============================================================

const cambiarMiSchema = z
  .object({
    actual: z.string().min(1, "Ingresa tu contraseña actual"),
    nueva: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .max(72, "Máximo 72 caracteres"),
    confirmar: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .max(72, "Máximo 72 caracteres"),
  })
  .refine((d) => d.nueva === d.confirmar, {
    path: ["confirmar"],
    message: "No coinciden",
  });

export type CambiarMiContrasenaState = {
  error: string | null;
  fieldErrors?: { actual?: string; nueva?: string; confirmar?: string };
  success?: boolean;
};

export async function cambiarMiContrasena(
  _prev: CambiarMiContrasenaState,
  formData: FormData
): Promise<CambiarMiContrasenaState> {
  const session = await requireAdmin();
  const parsed = cambiarMiSchema.safeParse({
    actual: String(formData.get("actual") ?? ""),
    nueva: String(formData.get("nueva") ?? ""),
    confirmar: String(formData.get("confirmar") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors: CambiarMiContrasenaState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "actual" || key === "nueva" || key === "confirmar") {
        fieldErrors[key] = issue.message;
      }
    }
    return { error: "Revisa los datos.", fieldErrors };
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Sesion invalida." };
  const ok = await verifyPassword(parsed.data.actual, user.passwordHash);
  if (!ok) {
    return {
      error: "La contraseña actual no coincide.",
      fieldErrors: { actual: "Incorrecta" },
    };
  }
  const newHash = await hashPassword(parsed.data.nueva);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, debeCambiarContrasena: false },
  });
  await signOut({ redirect: false });
  return { error: null, success: true };
}

// ============================================================
// ACTUALIZAR CONFIGURACION DEL EVENTO (admin)
// ============================================================

const actualizarConfiguracionSchema = z
  .object({
    nombre: z.string().min(1, "Requerido").max(100),
    fecha: z.coerce.date({ invalid_type_error: "Fecha invalida" }),
    puertas: z.string().min(1, "Requerido").max(20),
    lugar: z.string().min(1, "Requerido").max(200),
    barrio: z.string().max(100).optional().nullable(),
    ciudad: z.string().max(100).optional().nullable(),
    precioPorPersona: z.coerce
      .number()
      .int()
      .min(0, "No puede ser negativo")
      .max(10000000, "Maximo $10.000.000"),
    organizadorNombre: z.string().min(1, "Requerido").max(100),
    organizadorEmail: z.string().email("Email inválido").max(200),
    organizadorTelefono: z
      .string()
      .min(7, "Teléfono inválido")
      .max(20)
      .regex(/^\+?[0-9\s-]+$/, "Solo dígitos, espacios, guiones y opcional +"),
    organizadorWhatsapp: z
      .string()
      .trim()
      .transform((value) => normalizeWhatsAppNumber(value))
      .pipe(z.string().min(1, "WhatsApp invalido")),
  });

export type ActualizarConfiguracionState = {
  error: string | null;
  fieldErrors?: Partial<Record<keyof z.infer<typeof actualizarConfiguracionSchema>, string>>;
  success?: boolean;
  message?: string;
};

export async function actualizarConfiguracion(
  _prev: ActualizarConfiguracionState,
  formData: FormData
): Promise<ActualizarConfiguracionState> {
  const session = await requireAdmin();
  const adminId = session.user.id;

  // Normalizar strings opcionales: vacios -> null
  const barrio = String(formData.get("barrio") ?? "").trim();
  const ciudad = String(formData.get("ciudad") ?? "").trim();

  const parsed = actualizarConfiguracionSchema.safeParse({
    nombre: String(formData.get("nombre") ?? "").trim(),
    fecha: formData.get("fecha"),
    puertas: String(formData.get("puertas") ?? "").trim(),
    lugar: String(formData.get("lugar") ?? "").trim(),
    barrio: barrio || null,
    ciudad: ciudad || null,
    precioPorPersona: formData.get("precioPorPersona"),
    organizadorNombre: String(formData.get("organizadorNombre") ?? "").trim(),
    organizadorEmail: String(formData.get("organizadorEmail") ?? "").trim(),
    organizadorTelefono: String(formData.get("organizadorTelefono") ?? "").trim(),
    organizadorWhatsapp: String(formData.get("organizadorWhatsapp") ?? "").trim(),
  });

  if (!parsed.success) {
    const fieldErrors: ActualizarConfiguracionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") {
        fieldErrors[key as keyof typeof fieldErrors] = issue.message;
      }
    }
    return { error: "Revisa los datos.", fieldErrors };
  }

  await prisma.configuracion.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...parsed.data, actualizadoPorId: adminId },
    update: { ...parsed.data, actualizadoPorId: adminId },
  });

  revalidateTag("configuracion", "max");
  revalidatePath("/");
  revalidatePath("/admin/evento");

  return {
    error: null,
    success: true,
    message: "Configuración actualizada.",
  };
}

// ============================================================
// CRUD USUARIOS (admin)
// ============================================================

const adminUsuarioSchema = z.object({
  nombreCompleto: z.string().min(3, "Nombre muy corto").max(80),
  email: z.string().email("Email inválido").toLowerCase(),
  telefono: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^\d{10}$/, "Celular colombiano de 10 dígitos"))
    .transform((digits) => `+57${digits}`),
  rol: z.nativeEnum(Rol).default(Rol.USUARIO),
});

const crearUsuarioSchema = adminUsuarioSchema.extend({
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});

export async function crearUsuarioAdmin(
  _prev: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  await requireAdmin();
  const parsed = crearUsuarioSchema.safeParse({
    nombreCompleto: formData.get("nombreCompleto"),
    email: formData.get("email"),
    telefono: formData.get("telefono"),
    rol: formData.get("rol") || Rol.USUARIO,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await prisma.user.create({
      data: {
        nombreCompleto: parsed.data.nombreCompleto,
        email: parsed.data.email,
        telefono: parsed.data.telefono,
        rol: parsed.data.rol,
        passwordHash: await hashPassword(parsed.data.password),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Ya existe un usuario con ese email." };
    }
    throw err;
  }

  revalidatePath("/admin/usuarios");
  return { error: null, success: true, message: "Usuario creado." };
}

export async function editarUsuarioAdmin(
  _prev: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const idResult = idSchema.safeParse(userId);
  if (!idResult.success) return { error: "ID de usuario inválido." };

  const parsed = adminUsuarioSchema.safeParse({
    nombreCompleto: formData.get("nombreCompleto"),
    email: formData.get("email"),
    telefono: formData.get("telefono"),
    rol: formData.get("rol") || Rol.USUARIO,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  if (userId === session.user.id && parsed.data.rol !== Rol.ADMIN) {
    return { error: "No puedes quitarte tu propio rol admin." };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        nombreCompleto: parsed.data.nombreCompleto,
        email: parsed.data.email,
        telefono: parsed.data.telefono,
        rol: parsed.data.rol,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Ya existe un usuario con ese email." };
    }
    throw err;
  }

  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/reservas");
  revalidatePath("/mi-reserva");
  return { error: null, success: true, message: "Usuario actualizado." };
}

export async function eliminarUsuarioAdmin(userId: string): Promise<AdminActionResult> {
  const session = await requireAdmin();
  const idResult = idSchema.safeParse(userId);
  if (!idResult.success) return { error: "ID de usuario inválido." };
  if (userId === session.user.id) {
    return { error: "No puedes eliminar tu propio usuario." };
  }

  const dependenciasAdmin = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      pagosRegistrados: { select: { id: true }, take: 1 },
      invitadosPagados: { select: { id: true }, take: 1 },
      invitadosAsignados: { select: { id: true }, take: 1 },
      configuracionesEditadas: { select: { id: true }, take: 1 },
    },
  });
  if (!dependenciasAdmin) return { error: "Usuario no encontrado." };
  if (
    dependenciasAdmin.pagosRegistrados.length ||
    dependenciasAdmin.invitadosPagados.length ||
    dependenciasAdmin.invitadosAsignados.length ||
    dependenciasAdmin.configuracionesEditadas.length
  ) {
    return {
      error:
        "No se puede eliminar: tiene acciones administrativas registradas. Cambia sus datos o rol en lugar de borrarlo.",
    };
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/reservas");
  revalidatePath("/admin");
  return { error: null, success: true, message: "Usuario eliminado." };
}

// ============================================================
// CRUD INSCRIPCIONES INDIVIDUALES (admin)
// ============================================================

const reservaAdminSchema = z.object({
  nombreCompleto: z.string().trim().min(3, "Nombre muy corto").max(120),
  email: z.string().trim().email("Email invalido").toLowerCase(),
  telefono: phoneSchema,
  documento: z.string().trim().regex(/^[A-Za-z0-9-]*$/, "Solo letras, numeros y guiones").max(30).optional().nullable(),
  fechaNacimiento: optionalDateSchema,
  iglesia: z.string().trim().min(2, "Indica la iglesia").max(150),
  departamento: z.string().trim().min(2, "Indica el departamento").max(100),
  ciudad: z.string().trim().min(2, "Indica la ciudad").max(100),
  rolPic: z.enum(ROL_PIC_OPTIONS, { message: "Selecciona el rol PIC" }),
  contactoEmergenciaNombre: z.string().trim().min(3, "Indica contacto de emergencia").max(120),
  contactoEmergenciaTelefono: phoneSchema,
  aprobacionPastor: z.boolean(),
  tallerId: idSchema,
  abonoInicial: z.coerce.number().int().min(0).default(0),
  marcarPagado: z.boolean().default(false),
  medio: z.nativeEnum(MedioPago).optional().nullable(),
  referencia: z.string().trim().max(120).optional().nullable(),
  notasInternas: z.string().trim().max(500).optional().nullable(),
});

function parseReservaAdmin(formData: FormData) {
  return reservaAdminSchema.safeParse({
    nombreCompleto: formData.get("nombreCompleto"),
    email: formData.get("email"),
    telefono: formData.get("telefono"),
    documento: formData.get("documento") || null,
    fechaNacimiento: formData.get("fechaNacimiento") || undefined,
    iglesia: formData.get("iglesia"),
    departamento: formData.get("departamento"),
    ciudad: formData.get("ciudad"),
    rolPic: formData.get("rolPic"),
    contactoEmergenciaNombre: formData.get("contactoEmergenciaNombre"),
    contactoEmergenciaTelefono: formData.get("contactoEmergenciaTelefono"),
    aprobacionPastor: formData.get("aprobacionPastor") === "true",
    tallerId: formData.get("tallerId"),
    abonoInicial: formData.get("abonoInicial") || 0,
    marcarPagado: formData.get("marcarPagado") === "on" || formData.get("marcarPagado") === "true",
    medio: formData.get("medio") || null,
    referencia: formData.get("referencia") || null,
    notasInternas: formData.get("notas") || formData.get("notasInternas") || null,
  });
}

const editarReservaAdminSchema = z.object({
  nombreCompleto: z.string().trim().min(3, "Nombre muy corto").max(120),
  email: z.string().trim().email("Email invalido").toLowerCase(),
  telefono: z.string().trim().min(1, "Telefono requerido").max(20),
  documento: z.string().trim().regex(/^[A-Za-z0-9-]*$/, "Solo letras, numeros y guiones").max(30).optional().nullable().default(null),
  fechaNacimiento: z.string().trim().optional().default("").transform((v) => (v ? new Date(`${v}T00:00:00-05:00`) : null)).nullable(),
  iglesia: z.string().trim().max(150).optional().nullable().default(null),
  departamento: z.string().trim().max(100).optional().nullable().default(null),
  ciudad: z.string().trim().max(100).optional().nullable().default(null),
  rolPic: z.enum(ROL_PIC_OPTIONS).optional().nullable().default(null),
  contactoEmergenciaNombre: z.string().trim().max(120).optional().nullable().default(null),
  contactoEmergenciaTelefono: z.string().trim().max(20).optional().nullable().default(null),
  aprobacionPastor: z.boolean(),
  tallerId: z.string().trim().optional().nullable().default(null),
});

function parseEditarReservaAdmin(formData: FormData) {
  return editarReservaAdminSchema.safeParse({
    nombreCompleto: formData.get("nombreCompleto") || "",
    email: formData.get("email") || "",
    telefono: formData.get("telefono") || "",
    documento: formData.get("documento") || null,
    fechaNacimiento: formData.get("fechaNacimiento") || "",
    iglesia: formData.get("iglesia") || null,
    departamento: formData.get("departamento") || null,
    ciudad: formData.get("ciudad") || null,
    rolPic: formData.get("rolPic") || null,
    contactoEmergenciaNombre: formData.get("contactoEmergenciaNombre") || null,
    contactoEmergenciaTelefono: formData.get("contactoEmergenciaTelefono") || null,
    aprobacionPastor: formData.get("aprobacionPastor") === "true",
    tallerId: formData.get("tallerId") || null,
  });
}

async function habilitarEntradasSiCompleto(
  tx: Prisma.TransactionClient,
  reservaId: string,
  adminId: string
) {
  const pendientes = await tx.invitado.findMany({
    where: { reservaId, estado: EstadoInvitado.PENDIENTE_PAGO },
    select: { id: true },
  });

  for (const inv of pendientes) {
    let code: string | null = null;
    for (let attempts = 0; attempts < 5; attempts++) {
      const candidate = generateEntradaCode();
      try {
        await tx.invitado.update({
          where: { id: inv.id },
          data: {
            estado: EstadoInvitado.PAGADO,
            codigo: candidate,
            adminIdPago: adminId,
            fechaPago: new Date(),
          },
        });
        code = candidate;
        break;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
        throw err;
      }
    }
    if (!code) throw new Error("NO_SE_PUDO_GENERAR_CODIGO");
  }
}

export async function crearReservaAdmin(
  _prev: AdminActionResult<{
    reservaId: string;
    tempPassword: string | null;
    tempPasswordInstruction: string | null;
    tempPasswordMethod: string | null;
  }>,
  formData: FormData
): Promise<AdminActionResult<{
  reservaId: string;
  tempPassword: string | null;
  tempPasswordInstruction: string | null;
  tempPasswordMethod: string | null;
}>> {
  const session = await requireAdmin();
  const adminId = session.user.id;
  const parsed = parseReservaAdmin(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos invalidos." };

  const config = await getConfiguracion();
  const tempPasswordPlan = buildTemporaryPasswordPlan({
    documento: parsed.data.documento,
    telefono: parsed.data.telefono,
  });
  let createdUser = false;
  let reservaId = "";

  try {
    await prisma.$transaction(async (tx) => {
      const taller = await tx.taller.findUnique({ where: { id: parsed.data.tallerId }, select: { activo: true, cupo: true } });
      if (!taller?.activo) throw new Error("TALLER_NO_DISPONIBLE");
      if (taller.cupo !== null) {
        const inscritos = await tx.reserva.count({ where: { estado: { not: EstadoReserva.CANCELADO }, user: { tallerId: parsed.data.tallerId } } });
        if (inscritos >= taller.cupo) throw new Error("TALLER_SIN_CUPO");
      }

      let user = await tx.user.findUnique({ where: { email: parsed.data.email } });
      if (!user) {
        user = await tx.user.create({
          data: {
            nombreCompleto: parsed.data.nombreCompleto,
            email: parsed.data.email,
            telefono: parsed.data.telefono,
            passwordHash: await hashPassword(String(tempPasswordPlan.plaintext)),
            debeCambiarContrasena: true,
            rol: Rol.USUARIO,
          },
        });
        createdUser = true;
      }

      const existing = await tx.reserva.findUnique({ where: { userId: user.id } });
      if (existing) throw new Error("USUARIO_YA_TIENE_RESERVA");

      const perfilData = {
        nombreCompleto: parsed.data.nombreCompleto,
        telefono: parsed.data.telefono,
        documento: parsed.data.documento || null,
        fechaNacimiento: parsed.data.fechaNacimiento,
        iglesia: parsed.data.iglesia,
        departamento: parsed.data.departamento,
        ciudad: parsed.data.ciudad,
        rolPic: parsed.data.rolPic,
        contactoEmergenciaNombre: parsed.data.contactoEmergenciaNombre,
        contactoEmergenciaTelefono: parsed.data.contactoEmergenciaTelefono,
        aprobacionPastor: parsed.data.aprobacionPastor,
        tallerId: parsed.data.tallerId,
      };

      await tx.user.update({ where: { id: user.id }, data: perfilData });

      const reserva = await tx.reserva.create({
        data: {
          userId: user.id,
          valorTotal: config.precioPorPersona,
          estado: EstadoReserva.PAGO_PENDIENTE,
          invitados: { create: { numero: 1, emailContacto: parsed.data.email, ...perfilData } },
        },
      });
      reservaId = reserva.id;

      const montoARegistrar = parsed.data.marcarPagado ? config.precioPorPersona : parsed.data.abonoInicial;
      if (montoARegistrar > config.precioPorPersona) throw new Error("ABONO_SUPERA_SALDO");
      if (montoARegistrar > 0) {
        if (!parsed.data.medio) throw new Error("MEDIO_REQUERIDO");
        await tx.pago.create({
          data: {
            reservaId,
            medio: parsed.data.medio,
            referencia: parsed.data.referencia || null,
            notasInternas: parsed.data.notasInternas || null,
            monto: montoARegistrar,
            adminId,
            invitadosCubiertos: [],
          },
        });
        if (montoARegistrar >= config.precioPorPersona) await habilitarEntradasSiCompleto(tx, reservaId, adminId);
        await tx.reserva.update({
          where: { id: reservaId },
          data: { estado: EstadoReserva.PARCIAL, confirmadaEn: montoARegistrar >= config.precioPorPersona ? new Date() : null },
        });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "USUARIO_YA_TIENE_RESERVA") return { error: "Esta persona ya tiene una inscripcion registrada." };
      if (err.message === "TALLER_NO_DISPONIBLE") return { error: "El taller seleccionado no esta disponible." };
      if (err.message === "TALLER_SIN_CUPO") return { error: "El taller seleccionado no tiene cupos." };
      if (err.message === "ABONO_SUPERA_SALDO") return { error: "El abono no puede superar el total." };
      if (err.message === "MEDIO_REQUERIDO") return { error: "Selecciona un medio de pago para registrar abono." };
    }
    throw err;
  }

  revalidatePath("/admin/reservas");
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/pagos");
  revalidatePath("/admin/talleres");
  revalidatePath("/admin");
  return {
    error: null,
    success: true,
    message: createdUser
      ? `Inscripcion creada. ${tempPasswordPlan.reportLabel}`
      : "Inscripcion creada para la cuenta existente. Contrasena conservada.",
    data: {
      reservaId,
      tempPassword: createdUser && tempPasswordPlan.generatedAutomatically ? tempPasswordPlan.plaintext : null,
      tempPasswordInstruction: createdUser ? tempPasswordPlan.instruction : null,
      tempPasswordMethod: createdUser ? tempPasswordPlan.method : "existente",
    },
  };
}

export async function editarReservaAdmin(
  _prev: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  await requireAdmin();
  const reservaId = String(formData.get("reservaId") ?? "");
  const idResult = idSchema.safeParse(reservaId);
  if (!idResult.success) return { error: "ID de inscripcion invalido." };

  const parsed = parseEditarReservaAdmin(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos invalidos." };

  try {
    await prisma.$transaction(async (tx) => {
      const reserva = await tx.reserva.findUnique({ where: { id: reservaId }, include: { user: true, invitados: { orderBy: { numero: "asc" } } } });
      if (!reserva) throw new Error("RESERVA_NO_EXISTE");
      if (reserva.estado === EstadoReserva.CANCELADO) throw new Error("RESERVA_CANCELADA");

      const d = parsed.data;

      if (d.tallerId) {
        const taller = await tx.taller.findUnique({ where: { id: d.tallerId }, select: { activo: true, cupo: true } });
        if (!taller?.activo) throw new Error("TALLER_NO_DISPONIBLE");
        if (taller.cupo !== null && d.tallerId !== reserva.user.tallerId) {
          const inscritos = await tx.reserva.count({
            where: { id: { not: reservaId }, estado: { not: EstadoReserva.CANCELADO }, user: { tallerId: d.tallerId } },
          });
          if (inscritos >= taller.cupo) throw new Error("TALLER_SIN_CUPO");
        }
      }

      const userData = {
        nombreCompleto: d.nombreCompleto,
        email: d.email,
        telefono: d.telefono,
        documento: d.documento ?? null,
        fechaNacimiento: d.fechaNacimiento,
        iglesia: d.iglesia ?? null,
        departamento: d.departamento ?? null,
        ciudad: d.ciudad ?? null,
        rolPic: d.rolPic ?? null,
        contactoEmergenciaNombre: d.contactoEmergenciaNombre ?? null,
        contactoEmergenciaTelefono: d.contactoEmergenciaTelefono ?? null,
        aprobacionPastor: d.aprobacionPastor,
        tallerId: d.tallerId ?? null,
      };
      await tx.user.update({ where: { id: reserva.userId }, data: userData });

      const entrada = reserva.invitados.find((i) => i.numero === 1) ?? reserva.invitados[0];
      if (entrada) {
        await tx.invitado.update({
          where: { id: entrada.id },
          data: {
            numero: 1,
            nombreCompleto: d.nombreCompleto,
            telefono: d.telefono,
            emailContacto: d.email,
            documento: d.documento ?? null,
            iglesia: d.iglesia ?? null,
            tallerId: d.tallerId ?? null,
            contactoEmergenciaNombre: d.contactoEmergenciaNombre ?? null,
            contactoEmergenciaTelefono: d.contactoEmergenciaTelefono ?? null,
            aprobacionPastor: d.aprobacionPastor,
          },
        });
      } else {
        await tx.invitado.create({
          data: {
            reservaId,
            numero: 1,
            nombreCompleto: d.nombreCompleto,
            telefono: d.telefono,
            emailContacto: d.email,
            documento: d.documento ?? null,
            iglesia: d.iglesia ?? null,
            tallerId: d.tallerId ?? null,
            contactoEmergenciaNombre: d.contactoEmergenciaNombre ?? null,
            contactoEmergenciaTelefono: d.contactoEmergenciaTelefono ?? null,
            aprobacionPastor: d.aprobacionPastor,
          },
        });
      }

      const sobrantes = reserva.invitados.filter((i) => i.id !== entrada?.id);
      for (const inv of sobrantes) {
        if (inv.estado !== EstadoInvitado.PENDIENTE_PAGO) throw new Error("NO_SE_PUEDE_REMOVER_CONFIRMADOS");
        await tx.invitado.delete({ where: { id: inv.id } });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { error: "El email ya pertenece a otro usuario." };
    if (err instanceof Error) {
      if (err.message === "RESERVA_NO_EXISTE") return { error: "Inscripcion no encontrada." };
      if (err.message === "RESERVA_CANCELADA") return { error: "La inscripcion fue cancelada." };
      if (err.message === "TALLER_NO_DISPONIBLE") return { error: "El taller seleccionado no esta disponible." };
      if (err.message === "TALLER_SIN_CUPO") return { error: "El taller seleccionado no tiene cupos." };
      if (err.message === "NO_SE_PUEDE_REMOVER_CONFIRMADOS") return { error: "No puedes editar esta inscripcion porque tiene personas confirmadas fuera del modelo individual." };
    }
    throw err;
  }

  revalidatePath("/admin/reservas");
  revalidatePath(`/admin/reservas/${reservaId}`);
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/talleres");
  revalidatePath("/mi-reserva");
  return { error: null, success: true, message: "Inscripcion actualizada." };
}

export async function eliminarReservaAdmin(reservaId: string): Promise<AdminActionResult> {
  await requireAdmin();
  const idResult = idSchema.safeParse(reservaId);
  if (!idResult.success) return { error: "ID de inscripcion invalido." };

  await prisma.reserva.delete({ where: { id: reservaId } });
  revalidatePath("/admin/reservas");
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/talleres");
  revalidatePath("/admin");
  revalidatePath("/mi-reserva");
  return { error: null, success: true, message: "Inscripcion eliminada." };
}
// ============================================================
// ABONOS Y TALLERES (MVP Cumbre)
// ============================================================

const abonoReservaSchema = z.object({
  reservaId: idSchema,
  monto: z.coerce.number().int().min(1000, "El abono minimo es $1.000"),
  medio: z.nativeEnum(MedioPago),
  referencia: z.string().max(120).optional().nullable(),
  notasInternas: z.string().max(500).optional().nullable(),
});

export async function registrarAbonoReserva(
  _prev: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  const adminId = session.user.id;
  const parsed = abonoReservaSchema.safeParse({
    reservaId: formData.get("reservaId"),
    monto: formData.get("monto"),
    medio: formData.get("medio"),
    referencia: formData.get("referencia") || null,
    notasInternas: formData.get("notas") || formData.get("notasInternas") || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos invalidos." };

  const { reservaId, monto, medio, referencia, notasInternas } = parsed.data;
  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const reserva = await tx.reserva.findUnique({
        where: { id: reservaId },
        include: {
          invitados: { orderBy: { numero: "asc" } },
          pagos: { where: { revertido: false }, select: { monto: true } },
        },
      });
      if (!reserva) throw new Error("RESERVA_NO_EXISTE");
      if (reserva.estado === EstadoReserva.CANCELADO) throw new Error("RESERVA_CANCELADA");

      const totalPagado = reserva.pagos.reduce((acc, pago) => acc + pago.monto, 0);
      const saldo = Math.max(reserva.valorTotal - totalPagado, 0);
      if (saldo <= 0) throw new Error("SIN_SALDO");
      if (monto > saldo) throw new Error("ABONO_SUPERA_SALDO");

      const totalDespues = totalPagado + monto;
      const completa = totalDespues >= reserva.valorTotal;
      const pendientes = reserva.invitados.filter((inv) => inv.estado === EstadoInvitado.PENDIENTE_PAGO);
      const codigos: string[] = [];

      if (completa) {
        for (const inv of pendientes) {
          let code: string | null = null;
          for (let attempts = 0; attempts < 5; attempts++) {
            const candidate = generateEntradaCode();
            try {
              await tx.invitado.update({
                where: { id: inv.id, estado: EstadoInvitado.PENDIENTE_PAGO },
                data: {
                  estado: EstadoInvitado.PAGADO,
                  codigo: candidate,
                  adminIdPago: adminId,
                  fechaPago: new Date(),
                },
              });
              code = candidate;
              break;
            } catch (err) {
              if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
              throw err;
            }
          }
          if (!code) throw new Error("NO_SE_PUDO_GENERAR_CODIGO");
          codigos.push(code);
        }
      }

      await tx.pago.create({
        data: {
          reservaId,
          medio,
          referencia,
          notasInternas,
          monto,
          adminId,
          invitadosCubiertos: completa ? pendientes.map((inv) => inv.id) : [],
        },
      });

      await tx.reserva.update({
        where: { id: reservaId },
        data: {
          estado: totalDespues > 0 ? EstadoReserva.PARCIAL : EstadoReserva.PAGO_PENDIENTE,
          confirmadaEn: completa ? new Date() : null,
        },
      });

      return { reservaId, completa, saldoRestante: reserva.valorTotal - totalDespues, codigo: codigos[0] };
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "RESERVA_NO_EXISTE") return { error: "Reserva no encontrada." };
      if (err.message === "RESERVA_CANCELADA") return { error: "La reserva fue cancelada." };
      if (err.message === "SIN_SALDO") return { error: "La reserva no tiene saldo pendiente." };
      if (err.message === "ABONO_SUPERA_SALDO") return { error: "El abono no puede superar el saldo." };
      if (err.message === "NO_SE_PUDO_GENERAR_CODIGO") return { error: "No se pudo generar codigo unico." };
    }
    throw err;
  }

  revalidatePath("/admin/reservas");
  revalidatePath(`/admin/reservas/${result.reservaId}`);
  revalidatePath("/admin/pagos");
  revalidatePath("/admin");
  revalidatePath("/admin/mesas");
  revalidatePath("/mi-reserva");
  return {
    error: null,
    success: true,
    message: result.completa
      ? "Aporte completado. Codigo de entrada habilitado."
      : `Abono registrado. Saldo pendiente: $${result.saldoRestante.toLocaleString("es-CO")}.`,
    codigo: result.codigo,
  };
}

export async function marcarPagadoCompleto(
  _prev: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  const adminId = session.user.id;
  const reservaId = String(formData.get("reservaId") ?? "");
  const medio = String(formData.get("medio") ?? "");
  const referencia = String(formData.get("referencia") || "") || null;
  const notasInternas = String(formData.get("notas") || formData.get("notasInternas") || "") || null;

  if (!reservaId) return { error: "ID de reserva requerido." };
  if (!medio) return { error: "Selecciona un medio de pago." };

  const mediosValidos = ["NEQUI", "BANCOLOMBIA", "DAVIPLATA", "EFECTIVO"];
  if (!mediosValidos.includes(medio)) return { error: "Medio de pago invalido." };

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const reserva = await tx.reserva.findUnique({
        where: { id: reservaId },
        include: {
          invitados: { orderBy: { numero: "asc" } },
          pagos: { where: { revertido: false }, select: { monto: true } },
        },
      });
      if (!reserva) throw new Error("RESERVA_NO_EXISTE");
      if (reserva.estado === EstadoReserva.CANCELADO) throw new Error("RESERVA_CANCELADA");
      if (reserva.estado === EstadoReserva.ASISTIO) throw new Error("YA_ASISTIO");

      const totalPagado = reserva.pagos.reduce((acc, pago) => acc + pago.monto, 0);
      const saldo = Math.max(reserva.valorTotal - totalPagado, 0);
      if (saldo <= 0) throw new Error("SIN_SALDO");

      const pendientes = reserva.invitados.filter((inv) => inv.estado === EstadoInvitado.PENDIENTE_PAGO);
      const codigos: string[] = [];

      for (const inv of pendientes) {
        let code: string | null = null;
        for (let attempts = 0; attempts < 5; attempts++) {
          const candidate = generateEntradaCode();
          try {
            await tx.invitado.update({
              where: { id: inv.id, estado: EstadoInvitado.PENDIENTE_PAGO },
              data: {
                estado: EstadoInvitado.PAGADO,
                codigo: candidate,
                adminIdPago: adminId,
                fechaPago: new Date(),
              },
            });
            code = candidate;
            break;
          } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
            throw err;
          }
        }
        if (!code) throw new Error("NO_SE_PUDO_GENERAR_CODIGO");
        codigos.push(code);
      }

      await tx.pago.create({
        data: {
          reservaId,
          medio: medio as MedioPago,
          referencia,
          notasInternas,
          monto: saldo,
          adminId,
          invitadosCubiertos: pendientes.map((inv) => inv.id),
        },
      });

      await tx.reserva.update({
        where: { id: reservaId },
        data: {
          estado: EstadoReserva.PARCIAL,
          confirmadaEn: new Date(),
        },
      });

      return { codigo: codigos[0] ?? null };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "RESERVA_NO_EXISTE") return { error: "Reserva no encontrada." };
      if (err.message === "RESERVA_CANCELADA") return { error: "La reserva fue cancelada." };
      if (err.message === "YA_ASISTIO") return { error: "La persona ya asistio al evento." };
      if (err.message === "SIN_SALDO") return { error: "La inscripcion ya esta pagada." };
      if (err.message === "NO_SE_PUDO_GENERAR_CODIGO") return { error: "No se pudo generar codigo unico." };
    }
    throw err;
  }

  revalidatePath("/admin/reservas");
  revalidatePath(`/admin/reservas/${reservaId}`);
  revalidatePath("/admin/pagos");
  revalidatePath("/admin");
  revalidatePath("/admin/mesas");
  revalidatePath("/mi-reserva");
  return {
    error: null,
    success: true,
    message: "Aporte completado. Codigo de entrada habilitado.",
    codigo: result.codigo,
  };
}

export async function anularPago(
  _prev: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  await requireAdmin();
  const pagoId = String(formData.get("pagoId") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!pagoId) return { error: "ID de pago requerido." };
  if (motivo.length < 5) return { error: "Explica el motivo de la anulacion (min. 5 caracteres)." };
  if (motivo.length > 500) return { error: "Motivo demasiado largo." };

  try {
    await prisma.$transaction(async (tx) => {
      const pago = await tx.pago.findUnique({
        where: { id: pagoId },
        include: {
          reserva: {
            include: {
              invitados: { orderBy: { numero: "asc" } },
              pagos: { where: { revertido: false }, select: { id: true, monto: true } },
            },
          },
        },
      });
      if (!pago) throw new Error("PAGO_NO_EXISTE");
      if (pago.revertido) throw new Error("YA_ANULADO");
      if (pago.reserva.estado === EstadoReserva.CANCELADO) throw new Error("RESERVA_CANCELADA");
      if (pago.reserva.estado === EstadoReserva.ASISTIO) throw new Error("RESERVA_ASISTIO");

      await tx.pago.update({
        where: { id: pagoId },
        data: {
          revertido: true,
          revertidoEn: new Date(),
          motivoReversion: motivo,
        },
      });

      const totalRestante = pago.reserva.pagos
        .filter((p) => p.id !== pagoId)
        .reduce((acc, p) => acc + p.monto, 0);

      const nuevoEstado = totalRestante <= 0
        ? EstadoReserva.PAGO_PENDIENTE
        : EstadoReserva.PARCIAL;

      const updateData: Record<string, unknown> = { estado: nuevoEstado };
      if (nuevoEstado === EstadoReserva.PAGO_PENDIENTE) {
        updateData.confirmadaEn = null;
      }
      await tx.reserva.update({
        where: { id: pago.reservaId },
        data: updateData as Prisma.ReservaUpdateInput,
      });

      if (nuevoEstado === EstadoReserva.PAGO_PENDIENTE) {
        for (const inv of pago.reserva.invitados) {
          if (inv.estado === EstadoInvitado.PAGADO) {
            await tx.invitado.update({
              where: { id: inv.id },
              data: {
                estado: EstadoInvitado.PENDIENTE_PAGO,
                codigo: null,
                adminIdPago: null,
                fechaPago: null,
              },
            });
          }
        }
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "PAGO_NO_EXISTE") return { error: "Pago no encontrado." };
      if (err.message === "YA_ANULADO") return { error: "Este pago ya fue anulado." };
      if (err.message === "RESERVA_CANCELADA") return { error: "No se puede anular un pago de una reserva cancelada." };
      if (err.message === "RESERVA_ASISTIO") return { error: "No se puede anular un pago de una persona que ya asisitio." };
    }
    throw err;
  }

  revalidatePath("/admin/reservas");
  revalidatePath(`/admin/pagos`);
  revalidatePath("/admin");
  return { error: null, success: true, message: "Pago anulado correctamente." };
}

const tallerAdminSchema = z.object({
  nombre: z.string().trim().min(3).max(100),
  descripcion: z.string().trim().max(500).optional().nullable(),
  cupo: z.preprocess((v) => (v === "" || v === null ? null : v), z.coerce.number().int().min(1).nullable()).optional().nullable(),
  orden: z.coerce.number().int().min(0).default(0),
  activo: z.boolean().default(false),
});

function parseTallerForm(formData: FormData) {
  return tallerAdminSchema.safeParse({
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || null,
    cupo: formData.get("cupo") || null,
    orden: formData.get("orden") || 0,
    activo: formData.get("activo") === "on",
  });
}

export async function crearTallerAdmin(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = parseTallerForm(formData);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Datos invalidos.");
  await prisma.taller.create({
    data: {
      nombre: parsed.data.nombre,
      descripcion: parsed.data.descripcion || null,
      cupo: parsed.data.cupo ?? null,
      orden: parsed.data.orden,
      activo: parsed.data.activo,
    },
  });
  revalidatePath("/admin/talleres");
  revalidatePath("/registro");
}

export async function editarTallerAdmin(formData: FormData): Promise<void> {
  await requireAdmin();
  const tallerId = String(formData.get("tallerId") ?? "");
  const idResult = idSchema.safeParse(tallerId);
  if (!idResult.success) throw new Error("ID de taller invalido.");
  const parsed = parseTallerForm(formData);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Datos invalidos.");
  await prisma.taller.update({
    where: { id: tallerId },
    data: {
      nombre: parsed.data.nombre,
      descripcion: parsed.data.descripcion || null,
      cupo: parsed.data.cupo ?? null,
      orden: parsed.data.orden,
      activo: parsed.data.activo,
    },
  });
  revalidatePath("/admin/talleres");
  revalidatePath("/registro");
}

export async function eliminarTallerAdmin(formData: FormData): Promise<void> {
  await requireAdmin();
  const tallerId = String(formData.get("tallerId") ?? "");
  const idResult = idSchema.safeParse(tallerId);
  if (!idResult.success) throw new Error("ID de taller invalido.");
  const taller = await prisma.taller.findUnique({
    where: { id: tallerId },
    select: { _count: { select: { usuarios: true } } },
  });
  if (!taller) throw new Error("Taller no encontrado.");
  if (taller._count.usuarios > 0) {
    await prisma.taller.update({ where: { id: tallerId }, data: { activo: false } });
  } else {
    await prisma.taller.delete({ where: { id: tallerId } });
  }
  revalidatePath("/admin/talleres");
  revalidatePath("/registro");
}
