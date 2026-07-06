"use server";

import { EstadoReserva, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getConfiguracion } from "@/lib/constants";

export type ReservarState = {
  error: string | null;
  success?: boolean;
  fieldErrors?: {
    cantidad?: string;
    invitados?: string;
  };
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
  if (!session?.user?.id) {
    return { error: "Debes iniciar sesión para reservar." };
  }

  const config = await getConfiguracion();
  const valorTotal = config.precioPorPersona;

  const titular = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { nombreCompleto: true, telefono: true },
  });

  if (!titular?.nombreCompleto || !titular.telefono) {
    return {
      error:
        "Tu usuario no tiene nombre o celular completo. Actualiza tus datos antes de inscribirte.",
    };
  }

  const reservaPrevia = await prisma.reserva.findUnique({
    where: { userId: session.user.id },
    select: { id: true, estado: true },
  });

  if (
    reservaPrevia &&
    (reservaPrevia.estado === EstadoReserva.PARCIAL ||
      reservaPrevia.estado === EstadoReserva.ASISTIO)
  ) {
    return { error: "No puedes modificar una inscripción con aporte ya registrado." };
  }

  const reservaActiva =
    !!reservaPrevia && reservaPrevia.estado !== EstadoReserva.CANCELADO;

  try {
    await prisma.$transaction(async (tx) => {
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
        await tx.invitado.create({
          data: {
            reservaId: reservaPrevia.id,
            numero: 1,
            nombreCompleto: titular.nombreCompleto,
            telefono: titular.telefono,
            estado: "PENDIENTE_PAGO",
          },
        });
      } else {
        await tx.reserva.create({
          data: {
            userId: session.user.id,
            valorTotal,
            estado: EstadoReserva.PAGO_PENDIENTE,
            invitados: {
              create: {
                numero: 1,
                nombreCompleto: titular.nombreCompleto,
                telefono: titular.telefono,
                estado: "PENDIENTE_PAGO",
              },
            },
          },
        });
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Ya tienes una inscripción activa. Refresca la página." };
    }
    throw err;
  }

  revalidatePath("/reservar");
  revalidatePath("/mi-reserva");
  revalidatePath("/admin/reservas");

  return {
    error: null,
    success: true,
    reservaData: {
      cantidad: 1,
      invitados: [],
      valorTotal,
      editingExisting: reservaActiva,
    },
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
  if (!session?.user?.id) {
    return { error: "Debes iniciar sesión." };
  }

  const motivo = String(formData.get("motivo") ?? "").trim();
  if (motivo.length < 5) {
    return {
      error: "Cuéntanos por qué cancelas.",
      fieldErrors: { motivo: "Mínimo 5 caracteres" },
    };
  }
  if (motivo.length > 500) {
    return {
      error: "Motivo demasiado largo.",
      fieldErrors: { motivo: "Máximo 500 caracteres" },
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const r = await tx.reserva.findUnique({
        where: { userId: session.user.id },
        select: {
          id: true,
          estado: true,
          invitados: { select: { estado: true } },
        },
      });

      if (!r) throw new Error("NO_HAY_RESERVA");
      const algunoPagado = r.invitados.some(
        (i) => i.estado === "PAGADO" || i.estado === "ASISTIO"
      );
      if (algunoPagado) throw new Error("YA_PAGARON");
      if (r.estado !== EstadoReserva.PAGO_PENDIENTE) throw new Error("ESTADO_INVALIDO");

      await tx.reserva.update({
        where: { id: r.id },
        data: {
          estado: EstadoReserva.CANCELADO,
          motivoCancelacion: motivo,
          canceladaEn: new Date(),
        },
      });
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "NO_HAY_RESERVA") return { error: "No tienes una inscripción activa." };
      if (err.message === "YA_PAGARON") {
        return {
          error:
            "No puedes cancelar en este estado: el aporte ya fue confirmado. Escribe al admin por WhatsApp para coordinar.",
        };
      }
      if (err.message === "ESTADO_INVALIDO") return { error: "La inscripción no se puede cancelar en este estado." };
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
  return { error: "Esta inscripción es individual. No hay invitados para quitar." };
}

export type AgregarInvitadosState = {
  error: string | null;
  success?: boolean;
  fieldErrors?: { cantidad?: string };
};

export async function agregarInvitadosReserva(): Promise<AgregarInvitadosState> {
  return { error: "Cada persona debe registrarse con su propia inscripción." };
}
