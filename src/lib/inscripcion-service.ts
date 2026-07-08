import { prisma } from "@/lib/db";

const enum EstadoReserva {
  PAGO_PENDIENTE = "PAGO_PENDIENTE",
  PARCIAL = "PARCIAL",
  ASISTIO = "ASISTIO",
  CANCELADO = "CANCELADO",
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