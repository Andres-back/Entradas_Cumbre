import { NextRequest } from "next/server";
import { EstadoInvitado, EstadoReserva } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { rolPicLabel } from "@/lib/pic";

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function estadoPago(total: number, abonado: number, reservaEstado: EstadoReserva) {
  if (reservaEstado === EstadoReserva.CANCELADO) return "CANCELADO";
  if (abonado <= 0) return "SIN_PAGO";
  if (abonado >= total) return "PAGADO";
  return "PARCIAL";
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
      invitados: { orderBy: { numero: "asc" }, include: { mesa: true, taller: true } },
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

  const rows = reservas.map((reserva) => {
    const persona = reserva.invitados[0];
    const totalAbonado = reserva.pagos.reduce((acc, pago) => acc + pago.monto, 0);
    const saldo = Math.max(reserva.valorTotal - totalAbonado, 0);
    return [
      reserva.user.nombreCompleto,
      reserva.user.documento,
      reserva.user.email,
      reserva.user.telefono,
      persona?.taller?.nombre ?? reserva.user.taller?.nombre ?? "",
      reserva.user.iglesia,
      reserva.user.departamento,
      reserva.user.ciudad,
      rolPicLabel(reserva.user.rolPic),
      reserva.user.aprobacionPastor ? "Si" : "No",
      estadoPago(reserva.valorTotal, totalAbonado, reserva.estado),
      totalAbonado,
      saldo,
      persona?.mesa?.numero ?? "",
      persona?.silla ?? "",
      persona?.estado === EstadoInvitado.ASISTIO ? "Ingreso" : "No ingreso",
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
