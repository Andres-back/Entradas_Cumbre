"use server";

import { EstadoReserva, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getConfiguracion } from "@/lib/constants";

export type ReservarState = {
  error: string | null;
  success?: boolean;
  fieldErrors?: { cantidad?: string; invitados?: string };
  reservaData?: {
    cantidad: number;
    invitados: { nombreCompleto: string; telefono: string }[];
    valorTotal: number;
    editingExisting: boolean;
  };
};

export async function crearOActualizarReserva(
  _prev: ReservarState,
  _formData: FormData
): Promise<ReservarState> {
  void _prev;
  void _formData;

  const session = await auth();
  if (!session?.user?.id) return { error: "Debes iniciar sesion para reservar." };

  const config = await getConfiguracion();
  const valorTotal = config.precioPorPersona;

  const titular = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      nombreCompleto: true,
      email: true,
      telefono: true,
      documento: true,
      fechaNacimiento: true,
      iglesia: true,
      departamento: true,
      ciudad: true,
      rolPic: true,
      contactoEmergenciaNombre: true,
      contactoEmergenciaTelefono: true,
      aprobacionPastor: true,
      tallerId: true,
    },
  });

  if (
    !titular?.nombreCompleto ||
    !titular.telefono ||
    !titular.iglesia ||
    !titular.departamento ||
    !titular.ciudad ||
    !titular.rolPic ||
    !titular.contactoEmergenciaNombre ||
    !titular.contactoEmergenciaTelefono ||
    !titular.tallerId
  ) {
    return { error: "Tu perfil no esta completo. Registra todos tus datos antes de inscribirte." };
  }

  const taller = await prisma.taller.findUnique({
    where: { id: titular.tallerId },
    select: { activo: true, cupo: true },
  });
  if (!taller?.activo) return { error: "El taller seleccionado ya no esta disponible." };

  const reservaPrevia = await prisma.reserva.findUnique({
    where: { userId: session.user.id },
    select: { id: true, estado: true },
  });

  if (
    reservaPrevia &&
    (reservaPrevia.estado === EstadoReserva.PARCIAL ||
      reservaPrevia.estado === EstadoReserva.ASISTIO)
  ) {
    return { error: "No puedes modificar una inscripcion con aporte ya registrado." };
  }

  const reservaActiva = !!reservaPrevia && reservaPrevia.estado !== EstadoReserva.CANCELADO;

  try {
    await prisma.$transaction(async (tx) => {
      if (taller.cupo !== null) {
        const inscritos = await tx.reserva.count({
          where: {
            estado: { not: EstadoReserva.CANCELADO },
            user: { tallerId: titular.tallerId },
            ...(reservaPrevia ? { id: { not: reservaPrevia.id } } : {}),
          },
        });
        if (inscritos >= taller.cupo) throw new Error("TALLER_SIN_CUPO");
      }

      const participanteData = {
        numero: 1,
        nombreCompleto: titular.nombreCompleto,
        telefono: titular.telefono,
        emailContacto: titular.email,
        documento: titular.documento,
        fechaNacimiento: titular.fechaNacimiento,
        iglesia: titular.iglesia,
        departamento: titular.departamento,
        ciudad: titular.ciudad,
        rolPic: titular.rolPic,
        contactoEmergenciaNombre: titular.contactoEmergenciaNombre,
        contactoEmergenciaTelefono: titular.contactoEmergenciaTelefono,
        aprobacionPastor: titular.aprobacionPastor,
        tallerId: titular.tallerId,
        estado: "PENDIENTE_PAGO" as const,
      };

      if (reservaPrevia) {
        await tx.invitado.deleteMany({ where: { reservaId: reservaPrevia.id } });
        await tx.reserva.update({
          where: { id: reservaPrevia.id },
          data: {
            valorTotal,
            estado: reservaActiva ? reservaPrevia.estado : EstadoReserva.PAGO_PENDIENTE,
            motivoCancelacion: null,
            canceladaEn: null,
          },
        });
        await tx.invitado.create({ data: { reservaId: reservaPrevia.id, ...participanteData } });
      } else {
        await tx.reserva.create({
          data: {
            userId: session.user.id,
            valorTotal,
            estado: EstadoReserva.PAGO_PENDIENTE,
            invitados: { create: participanteData },
          },
        });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (err) {
    if (err instanceof Error && err.message === "TALLER_SIN_CUPO") return { error: "El taller seleccionado ya no tiene cupos." };
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Ya tienes una inscripcion activa. Refresca la pagina." };
    }
    throw err;
  }

  revalidatePath("/reservar");
  revalidatePath("/mi-reserva");
  revalidatePath("/admin/reservas");

  return {
    error: null,
    success: true,
    reservaData: { cantidad: 1, invitados: [], valorTotal, editingExisting: reservaActiva },
  };
}

export type CancelarMiReservaState = {
  error: string | null;
  success?: boolean;
  fieldErrors?: { motivo?: string };
};

export async function cancelarMiReserva(
  _prev: CancelarMiReservaState,
  formData: FormData
): Promise<CancelarMiReservaState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Debes iniciar sesion." };

  const motivo = String(formData.get("motivo") ?? "").trim();
  if (motivo.length < 5) return { error: "Cuentanos por que cancelas.", fieldErrors: { motivo: "Minimo 5 caracteres" } };
  if (motivo.length > 500) return { error: "Motivo demasiado largo.", fieldErrors: { motivo: "Maximo 500 caracteres" } };

  try {
    await prisma.$transaction(async (tx) => {
      const r = await tx.reserva.findUnique({
        where: { userId: session.user.id },
        select: { id: true, estado: true, invitados: { select: { estado: true } } },
      });
      if (!r) throw new Error("NO_HAY_RESERVA");
      if (r.invitados.some((i) => i.estado === "PAGADO" || i.estado === "ASISTIO")) throw new Error("YA_PAGARON");
      if (r.estado !== EstadoReserva.PAGO_PENDIENTE) throw new Error("ESTADO_INVALIDO");
      await tx.reserva.update({
        where: { id: r.id },
        data: { estado: EstadoReserva.CANCELADO, motivoCancelacion: motivo, canceladaEn: new Date() },
      });
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "NO_HAY_RESERVA") return { error: "No tienes una inscripcion activa." };
      if (err.message === "YA_PAGARON") return { error: "No puedes cancelar porque el aporte ya fue confirmado." };
      if (err.message === "ESTADO_INVALIDO") return { error: "La inscripcion no se puede cancelar en este estado." };
    }
    throw err;
  }

  revalidatePath("/mi-reserva");
  revalidatePath("/admin/reservas");
  return { error: null, success: true };
}

export type CancelarInvitadoState = {
  error: string | null;
  success?: boolean;
};

export async function cancelarInvitado(): Promise<CancelarInvitadoState> {
  return { error: "Esta inscripcion es individual. No hay participantes adicionales para quitar." };
}

export type AgregarInvitadosState = {
  error: string | null;
  success?: boolean;
  fieldErrors?: { cantidad?: string };
};

export async function agregarInvitadosReserva(): Promise<AgregarInvitadosState> {
  return { error: "Cada persona debe registrarse con su propia inscripcion." };
}
