import { NextRequest } from "next/server";
import { EstadoInvitado, EstadoReserva } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { rolPicLabel } from "@/lib/pic";
import { calcularEstadoPago } from "@/lib/payment-status";

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return new Response("No autorizado", { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const estado = searchParams.get("estado") ?? "TODOS";
  const tallerId = searchParams.get("tallerId") ?? "TODOS";

  const reservas = await prisma.reserva.findMany({
    where: {
      ...(estado === "TODOS" ? {} : { estado: estado as EstadoReserva }),
      ...(tallerId === "TODOS"
        ? {}
        : tallerId === "SIN_TALLER"
        ? { user: { tallerId: null } }
        : { user: { tallerId } }),
    },
    orderBy: { creadaEn: "desc" },
    include: {
      user: { include: { taller: true } },
      pagos: { where: { revertido: false }, select: { monto: true } },
      invitados: {
        orderBy: { numero: "asc" },
        include: { mesa: true },
        take: 1,
      },
    },
  });

  const header = [
    "Nombre completo",
    "Documento",
    "Correo",
    "WhatsApp",
    "Taller",
    "Iglesia",
    "Departamento",
    "Ciudad",
    "Rol PIC",
    "Aprobacion pastor",
    "Estado de pago",
    "Total abonado",
    "Saldo",
    "Mesa",
    "Silla",
    "Estado de ingreso",
  ];

  // Compatibilidad técnica temporal:
  // La regla de negocio es 1 inscripción = 1 persona.
  // User es la fuente de identidad y taller.
  // Este único registro asociado conserva temporalmente mesa, silla, QR e ingreso.
  // Esta dependencia será eliminada en la refactorización posterior al evento.
  const rows = reservas.map((reserva) => {
    const totalAbonado = reserva.pagos.reduce((acc, pago) => acc + pago.monto, 0);
    const saldo = Math.max(reserva.valorTotal - totalAbonado, 0);
    const registroLogistico = reserva.invitados?.[0] ?? null;
    const estadoPagoValue = reserva.estado === EstadoReserva.CANCELADO
      ? "CANCELADO"
      : calcularEstadoPago(reserva.valorTotal, reserva.pagos);
    return [
      reserva.user.nombreCompleto,
      reserva.user.documento,
      reserva.user.email,
      reserva.user.telefono,
      reserva.user.taller?.nombre ?? "",
      reserva.user.iglesia,
      reserva.user.departamento,
      reserva.user.ciudad,
      rolPicLabel(reserva.user.rolPic),
      reserva.user.aprobacionPastor ? "Si" : "No",
      estadoPagoValue,
      totalAbonado,
      saldo,
      registroLogistico?.mesa?.numero ?? "",
      registroLogistico?.silla ?? "",
      registroLogistico?.estado === EstadoInvitado.ASISTIO ? "Ingreso" : "No ingreso",
    ];
  });

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=inscripciones-cumbre.csv",
    },
  });
}
