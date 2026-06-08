"use server";

import { EstadoReserva, Prisma } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MAX_POR_RESERVA, getConfiguracion } from "@/lib/constants";

/**
 * Schema de reserva: 1 titular + N invitados (ADR-011).
 * El form envia los datos como campos repetidos:
 *   - `cantidad` (numero total de invitados, sin contar al titular)
 *   - `invitado_<i>_nombreCompleto`, `invitado_<i>_telefono` (i=1..cantidad)
 *
 * El titular NO esta en la lista de `invitados[]`; el User ya tiene sus datos.
 */
const invitadoSchema = z.object({
  nombreCompleto: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(80, "Máximo 80 caracteres"),
  telefono: z
    .string()
    .transform((v) => v.replace(/\D/g, "").slice(-10))
    .pipe(
      z
        .string()
        .regex(/^\d{10}$/, "Celular colombiano: 10 dígitos (300 123 4567)")
    )
    .transform((digits) => `+57${digits}`),
});

const reservarSchema = z.object({
  cantidad: z.coerce
    .number()
    .int()
    .min(1, "Mínimo 1 persona (vos)")
    .max(MAX_POR_RESERVA, `Máximo ${MAX_POR_RESERVA} personas`),
  invitados: z.array(invitadoSchema).max(MAX_POR_RESERVA),
});

export type ReservarState = {
  error: string | null;
  success?: boolean;
  fieldErrors?: {
    cantidad?: string;
    invitados?: string;
  };
  /**
   * Datos de la reserva creada/editada, devueltos en el success.
   * Se usan en `ExitoReserva` para construir el mensaje de WhatsApp.
   */
  reservaData?: {
    cantidad: number;
    invitados: { nombreCompleto: string; telefono: string }[];
    valorTotal: number;
    editingExisting: boolean;
  };
};

type FieldErrors = NonNullable<ReservarState["fieldErrors"]>;

/**
 * Lee los campos del FormData y construye el array de invitados extra.
 * El titular no esta en la lista; solo los acompanantes.
 */
function leerInvitadosDeFormData(
  formData: FormData
): { nombreCompleto: string; telefono: string }[] {
  const guestCount = Number(formData.get("guestCount") ?? 0);
  const invitados: { nombreCompleto: string; telefono: string }[] = [];
  for (let i = 1; i <= guestCount; i++) {
    const nombreCompleto = String(
      formData.get(`invitado_${i}_nombreCompleto`) ?? ""
    ).trim();
    const telefono = String(
      formData.get(`invitado_${i}_telefono`) ?? ""
    ).trim();
    invitados.push({ nombreCompleto, telefono });
  }
  return invitados;
}

export async function crearOActualizarReserva(
  _prev: ReservarState,
  formData: FormData
): Promise<ReservarState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Debes iniciar sesión para reservar." };
  }

  const config = await getConfiguracion();

  const rawCantidad = Number(formData.get("cantidad") ?? 0);
  const invitadosRaw = leerInvitadosDeFormData(formData);

  const parsed = reservarSchema.safeParse({
    cantidad: rawCantidad,
    invitados: invitadosRaw,
  });
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "cantidad") {
        fieldErrors.cantidad = issue.message;
      } else if (key === "invitados") {
        fieldErrors.invitados = "Revisa los datos de los invitados.";
      }
    }
    return { error: "Revisa los datos.", fieldErrors };
  }

  const { cantidad, invitados: invitadosExtra } = parsed.data;

  // Guard de consistencia: el titular (vos) + N invitados extra = cantidad total
  if (invitadosExtra.length !== cantidad - 1) {
    return { error: "La cantidad de personas no coincide con la lista de invitados." };
  }

  const valorTotal = cantidad * config.precioPorPersona;

  // Datos del titular para crear su propio Invitado
  const titular = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { nombreCompleto: true, telefono: true },
  });

  // Reserva previa (para saber si estamos editando).
  const reservaPrevia = await prisma.reserva.findUnique({
    where: { userId: session.user.id },
    select: { id: true, estado: true, invitados: { select: { id: true } } },
  });

  if (reservaPrevia && (reservaPrevia.estado === EstadoReserva.PARCIAL || reservaPrevia.estado === EstadoReserva.ASISTIO)) {
    return { error: "No podés modificar una reserva con pagos ya registrados." };
  }

  const reservaActiva =
    !!reservaPrevia && reservaPrevia.estado !== EstadoReserva.CANCELADO;

  // Todos los asistentes: titular (numero 0) + invitados extra
  type InvitadoData = { numero: number; nombreCompleto: string; telefono: string; estado: "PENDIENTE_PAGO" };
  const todos: InvitadoData[] = [
    {
      numero: 0,
      nombreCompleto: titular?.nombreCompleto ?? session.user.name ?? "",
      telefono: titular?.telefono ?? "",
      estado: "PENDIENTE_PAGO" as const,
    },
    ...invitadosExtra.map((inv, i) => ({
      numero: i + 1,
      nombreCompleto: inv.nombreCompleto,
      telefono: inv.telefono,
      estado: "PENDIENTE_PAGO" as const,
    })),
  ];

  try {
    await prisma.$transaction(async (tx) => {
      if (reservaPrevia) {
        await tx.invitado.deleteMany({ where: { reservaId: reservaPrevia.id } });
        await tx.reserva.update({
          where: { id: reservaPrevia.id },
          data: {
            valorTotal,
            estado: reservaActiva
              ? reservaPrevia.estado
              : EstadoReserva.PAGO_PENDIENTE,
            motivoCancelacion: null,
            canceladaEn: null,
          },
        });
        await tx.invitado.createMany({
          data: todos.map((inv) => ({
            reservaId: reservaPrevia.id,
            numero: inv.numero,
            nombreCompleto: inv.nombreCompleto,
            telefono: inv.telefono,
            estado: inv.estado,
          })),
        });
      } else {
        const nueva = await tx.reserva.create({
          data: {
            userId: session.user.id,
            valorTotal,
            estado: EstadoReserva.PAGO_PENDIENTE,
            invitados: {
              create: todos.map((inv) => ({
                numero: inv.numero,
                nombreCompleto: inv.nombreCompleto,
                telefono: inv.telefono,
                estado: inv.estado,
              })),
            },
          },
        });
        void nueva;
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Ya tienes una reserva activa. Refresca la página." };
    }
    throw err;
  }

  return {
    error: null,
    success: true,
    reservaData: {
      cantidad,
      invitados: invitadosExtra,
      valorTotal,
      editingExisting: !!reservaPrevia && reservaActiva === true,
    },
  };
}

/**
 * Cancelacion hecha por el propio titular de la reserva.
 * Solo permitida si la reserva esta en PAGO_PENDIENTE (ningun invitado pago).
 * Despues de pagar, los cambios los maneja el admin (politica reembolso ADR-005).
 */
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
      if (err.message === "NO_HAY_RESERVA") return { error: "No tienes una reserva activa." };
      if (err.message === "YA_PAGARON") return { error: "No puedes cancelar en este estado: ya hay invitados que pagaron. Escribe al admin por WhatsApp para coordinar." };
      if (err.message === "ESTADO_INVALIDO") return { error: "La reserva no se puede cancelar en este estado." };
    }
    throw err;
  }

  return { error: null, success: true };
}

/**
 * Cancela un invitado individual (solo si esta PENDIENTE_PAGO).
 * Ajusta el valorTotal de la reserva, la cantidad de invitados,
 * y si era el unico invitado extra, puede dejar solo al titular.
 * El titular (numero=0) NO se puede cancelar por esta via.
 */
export type CancelarInvitadoState = {
  error: string | null;
  success?: boolean;
};

export async function cancelarInvitado(
  _prev: CancelarInvitadoState,
  formData: FormData
): Promise<CancelarInvitadoState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Debes iniciar sesión." };
  }

  const invitadoId = String(formData.get("invitadoId") ?? "").trim();
  if (!invitadoId || invitadoId.length < 20) {
    return { error: "ID de invitado inválido." };
  }

  const config = await getConfiguracion();

  try {
    await prisma.$transaction(async (tx) => {
      const inv = await tx.invitado.findUnique({
        where: { id: invitadoId },
        include: { reserva: { select: { userId: true, id: true, valorTotal: true } } },
      });

      if (!inv) throw new Error("NO_EXISTE");
      if (inv.reserva.userId !== session.user.id) throw new Error("NO_AUTORIZADO");
      if (inv.estado !== "PENDIENTE_PAGO") throw new Error("YA_PAGADO");
      if (inv.numero === 0) throw new Error("TITULAR"); // el titular no se cancela

      await tx.invitado.delete({ where: { id: invitadoId } });

      // Recalcular valorTotal
      const nuevoTotal = inv.reserva.valorTotal - config.precioPorPersona;
      await tx.reserva.update({
        where: { id: inv.reserva.id },
        data: { valorTotal: Math.max(config.precioPorPersona, nuevoTotal) },
      });
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "NO_EXISTE") return { error: "Este invitado ya no existe." };
      if (err.message === "NO_AUTORIZADO") return { error: "No puedes cancelar este invitado." };
      if (err.message === "YA_PAGADO") return { error: "Este invitado ya pagó. Contacta al admin por WhatsApp." };
      if (err.message === "TITULAR") return { error: "No puedes cancelar tu propio cupo. Cancela la reserva completa." };
    }
    throw err;
  }

  revalidatePath("/mi-reserva");
  revalidatePath("/admin/reservas");

  return { error: null, success: true };
}

/**
 * Agrega invitados extra a una reserva existente (PARCIAL o PAGO_PENDIENTE).
 * No toca los invitados ya existentes, solo agrega los nuevos.
 */
export type AgregarInvitadosState = {
  error: string | null;
  success?: boolean;
  fieldErrors?: { cantidad?: string };
};

export async function agregarInvitadosReserva(
  _prev: AgregarInvitadosState,
  formData: FormData
): Promise<AgregarInvitadosState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Debes iniciar sesión." };
  }

  const config = await getConfiguracion();
  const rawCantidad = Number(formData.get("cantidad") ?? 0);
  const invitadosRaw = leerInvitadosDeFormData(formData);

  if (!Number.isInteger(rawCantidad) || rawCantidad < 1 || rawCantidad > MAX_POR_RESERVA) {
    return { error: `Cantidad inválida (1-${MAX_POR_RESERVA}).`, fieldErrors: { cantidad: `Mínimo 1, máximo ${MAX_POR_RESERVA}` } };
  }

  if (invitadosRaw.length !== rawCantidad) {
    return { error: "La cantidad no coincide con los datos de los invitados." };
  }

  const extra = rawCantidad * config.precioPorPersona;

  try {
    await prisma.$transaction(async (tx) => {
      const reserva = await tx.reserva.findUnique({
        where: { userId: session.user.id },
        select: { id: true, estado: true, valorTotal: true, invitados: { select: { numero: true }, orderBy: { numero: "desc" } } },
      });

      if (!reserva) throw new Error("NO_HAY_RESERVA");
      if (reserva.estado === EstadoReserva.CANCELADO || reserva.estado === EstadoReserva.ASISTIO) {
        throw new Error("ESTADO_INVALIDO");
      }

      const maxNumero = reserva.invitados[0]?.numero ?? 0;
      await tx.invitado.createMany({
        data: invitadosRaw.map((inv, i) => ({
          reservaId: reserva.id,
          numero: maxNumero + i + 1,
          nombreCompleto: inv.nombreCompleto,
          telefono: inv.telefono,
          estado: "PENDIENTE_PAGO" as const,
        })),
      });

      await tx.reserva.update({
        where: { id: reserva.id },
        data: { valorTotal: reserva.valorTotal + extra },
      });
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "NO_HAY_RESERVA") return { error: "No tienes una reserva activa." };
      if (err.message === "ESTADO_INVALIDO") return { error: "No se puede modificar en este estado." };
    }
    throw err;
  }

  revalidatePath("/mi-reserva");
  revalidatePath("/admin/reservas");

  return { error: null, success: true };
}
