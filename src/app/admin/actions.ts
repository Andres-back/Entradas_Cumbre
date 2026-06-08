"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { EstadoInvitado, EstadoReserva, MedioPago, Prisma } from "@prisma/client";

import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import {
  ADMIN_EMAIL,
  MESA_CAPACIDAD_MAX,
  MESA_CAPACIDAD_MIN,
  getConfiguracion,
} from "@/lib/constants";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { generateEntradaCode, generateTempPassword } from "@/lib/code";
import { hashPassword, verifyPassword } from "@/lib/password";

import type {
  AdminActionResult,
  ConfirmarIngresoResult,
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
  if (!session?.user || session.user.email !== ADMIN_EMAIL) {
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

const CODE_REGEX = /^BC-[A-Z2-9]{8}$/;

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
  }[];
};

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
      .map((i) => ({
        id: i.id,
        numero: i.numero,
        nombreCompleto: i.nombreCompleto,
        telefono: i.telefono,
        estado: i.estado,
        codigo: i.codigo,
        mesaId: i.mesaId,
        mesaNumero: i.mesa?.numero ?? null,
        silla: i.silla,
        registradoEn: i.registradoEn,
      })),
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
      mensaje: "Código inválido. Verifica el formato BC-XXXXXXXX.",
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
  const invitadoPayload: ValidarIngreso = {
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
  };

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
      mensaje: "Invitado pendiente de pago. Código aún no habilitado.",
      reserva: reservaPayload,
      invitado: invitadoPayload,
    };
  }

  if (invitado.estado === EstadoInvitado.ASISTIO || invitado.registradoEn !== null) {
    return {
      estado: "completo",
      codigo,
      mensaje: `Ya entro a las ${
        invitado.registradoEn?.toLocaleTimeString("es-CO", {
          hour: "numeric",
          minute: "2-digit",
        }) ?? "?"
      }.`,
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
      invitado: {
        id: invitadoUpdated.id,
        numero: invitadoUpdated.numero,
        nombreCompleto: invitadoUpdated.nombreCompleto,
        telefono: invitadoUpdated.telefono,
        estado: invitadoUpdated.estado,
        codigo: invitadoUpdated.codigo,
        mesaId: invitadoUpdated.mesaId,
        mesaNumero: invitadoUpdated.mesa?.numero ?? null,
        silla: invitadoUpdated.silla,
        registradoEn: invitadoUpdated.registradoEn,
      },
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
      if (msg === "INVITADO_NO_PAGADO") return { success: false, error: "El invitado no ha pagado todavía." };
      if (msg === "RESERVA_CANCELADA") return { success: false, error: "La reserva fue cancelada." };
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
      if (msg === "INVITADO_YA_PAGADO") return { error: "Uno de los invitados ya fue marcado como pagado." };
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
    message: `Pago registrado. ${invitadoIds.length} invitado${
      invitadoIds.length === 1 ? "" : "s"
    } pagado${invitadoIds.length === 1 ? "" : "s"}.`,
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
      if (invitado.estado === EstadoInvitado.ASISTIO) {
        throw new Error("INVITADO_YA_ENTRO");
      }

      // Verificar que la silla este libre en esta mesa
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
      return { error: "Esa silla ya está ocupada. Elegí otra." };
    }
    if (err instanceof Error && err.message === "SILLA_OCUPADA") {
      return { error: "Esa silla ya está ocupada por otro invitado." };
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
      const pagados = await tx.invitado.count({
        where: { reservaId, estado: { in: [EstadoInvitado.PAGADO, EstadoInvitado.ASISTIO] } },
      });
      if (pagados > 0) {
        throw new Error(
          `Hay ${pagados} invitado${pagados === 1 ? "" : "s"} que ya pagó${pagados === 1 ? "" : "aron"}. Antes de cancelar, revértelos o coordiná el reembolso.`
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
  const pagadosAhora = await prisma.invitado.count({
    where: { reservaId, estado: { in: [EstadoInvitado.PAGADO, EstadoInvitado.ASISTIO] } },
  });
  const nuevoEstado = pagadosAhora > 0 ? EstadoReserva.PARCIAL : EstadoReserva.PAGO_PENDIENTE;

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
      .min(7, "WhatsApp inválido")
      .max(20)
      .regex(/^[0-9]+$/, "Solo dígitos (sin + ni espacios, para wa.me/)"),
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
