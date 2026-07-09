import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const enum EstadoReserva {
  PAGO_PENDIENTE = "PAGO_PENDIENTE",
  PARCIAL = "PARCIAL",
  ASISTIO = "ASISTIO",
  CANCELADO = "CANCELADO",
}

export type ReservaFilterInput = {
  search?: string;
  tallerId?: string;
  rolPic?: string;
  iglesia?: string;
  estadoPago?: string;
  estadoDatos?: string;
};

export function parseReservaFilters(params: Record<string, string | undefined>): ReservaFilterInput {
  return {
    search: params.search || undefined,
    tallerId: params.tallerId === "TODOS" ? undefined : params.tallerId,
    rolPic: params.rolPic === "TODOS" ? undefined : params.rolPic,
    iglesia: params.iglesia === "TODOS" ? undefined : params.iglesia,
    estadoPago: params.estadoPago === "TODOS" ? undefined : params.estadoPago,
    estadoDatos: params.estadoDatos === "TODOS" ? undefined : params.estadoDatos,
  };
}

export function buildReservaWhere(filters: ReservaFilterInput): Prisma.ReservaWhereInput {
  const AND: Prisma.ReservaWhereInput[] = [];

  if (filters.estadoPago) {
    if (filters.estadoPago !== "CANCELADO") {
      AND.push({ estado: { not: "CANCELADO" } });
    }
  } else {
    AND.push({ estado: { not: "CANCELADO" } });
  }

  const where: Prisma.ReservaWhereInput = {};

  if (filters.search) {
    const term = filters.search;
    AND.push({
      user: {
        OR: [
          { nombreCompleto: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
          { documento: { contains: term, mode: "insensitive" } },
          { telefono: { contains: term } },
        ],
      },
    });
  }

  if (filters.tallerId) {
    if (filters.tallerId === "SIN_TALLER") {
      AND.push({ user: { tallerId: null } });
    } else {
      AND.push({ user: { tallerId: filters.tallerId } });
    }
  }

  if (filters.rolPic) {
    if (filters.rolPic === "__PENDIENTE__") {
      AND.push({ user: { rolPic: null } });
    } else {
      AND.push({ user: { rolPic: filters.rolPic as never } });
    }
  }

  if (filters.iglesia) {
    if (filters.iglesia === "__PENDIENTE__") {
      AND.push({
        user: { OR: [{ iglesia: null }, { iglesia: "" }] },
      });
    } else {
      AND.push({ user: { iglesia: filters.iglesia } });
    }
  }

  if (filters.estadoPago) {
    AND.push({ estado: filters.estadoPago as never });
  }

  if (AND.length > 0) {
    where.AND = AND;
  }

  return where;
}

function camposPendientesArray(inscripcion: {
  documento: string | null;
  fechaNacimiento: Date | null;
  iglesia: string | null;
  departamento: string | null;
  ciudad: string | null;
  rolPic: string | null;
  contactoEmergenciaNombre: string | null;
  contactoEmergenciaTelefono: string | null;
  aprobacionPastor: boolean;
  tallerId: string | null;
}): string[] {
  const pendientes: string[] = [];
  if (!inscripcion.documento) pendientes.push("Documento");
  if (!inscripcion.fechaNacimiento) pendientes.push("Fecha de nacimiento");
  if (!inscripcion.iglesia) pendientes.push("Iglesia");
  if (!inscripcion.departamento) pendientes.push("Departamento");
  if (!inscripcion.ciudad) pendientes.push("Ciudad");
  if (!inscripcion.rolPic) pendientes.push("Rol PIC");
  if (!inscripcion.contactoEmergenciaNombre) pendientes.push("Contacto de emergencia");
  if (!inscripcion.contactoEmergenciaTelefono) pendientes.push("Teléfono de emergencia");
  if (!inscripcion.aprobacionPastor) pendientes.push("Aprobación del pastor");
  if (!inscripcion.tallerId) pendientes.push("Taller");
  return pendientes;
}

export function calcularCamposPendientes(inscripcion: {
  documento: string | null;
  fechaNacimiento: Date | null;
  iglesia: string | null;
  departamento: string | null;
  ciudad: string | null;
  rolPic: string | null;
  contactoEmergenciaNombre: string | null;
  contactoEmergenciaTelefono: string | null;
  aprobacionPastor: boolean;
  tallerId: string | null;
}): { completa: boolean; camposPendientes: string[] } {
  const camposPendientes = camposPendientesArray(inscripcion);
  return { completa: camposPendientes.length === 0, camposPendientes };
}

export async function contarInscritosTaller(tallerId: string): Promise<number> {
  return prisma.user.count({
    where: { tallerId },
  });
}

export async function validarCupoTaller(tallerId: string, excluirReservaId?: string): Promise<{ ok: boolean; inscritos: number; cupo: number | null }> {
  const taller = await prisma.taller.findUnique({
    where: { id: tallerId },
    select: { cupo: true, activo: true },
  });
  if (!taller?.activo) return { ok: false, inscritos: 0, cupo: 0 };
  if (taller.cupo === null) return { ok: true, inscritos: 0, cupo: null };

  const inscritos = await prisma.reserva.count({
    where: {
      estado: { not: EstadoReserva.CANCELADO },
      user: { tallerId },
      ...(excluirReservaId ? { id: { not: excluirReservaId } } : {}),
    },
  });
  return { ok: inscritos < taller.cupo, inscritos, cupo: taller.cupo };
}

export async function obtenerInscritosPorTaller() {
  const talleres = await prisma.taller.findMany({
    select: {
      id: true,
      nombre: true,
      cupo: true,
      activo: true,
      _count: { select: { usuarios: true } },
    },
    orderBy: [{ activo: "desc" }, { orden: "asc" }, { nombre: "asc" }],
  });
  return talleres.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    cupo: t.cupo,
    activo: t.activo,
    inscritos: t._count.usuarios,
  }));
}
