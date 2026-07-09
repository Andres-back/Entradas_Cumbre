import { NextRequest } from "next/server";
import { EstadoInvitado, EstadoReserva } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { rolPicLabel } from "@/lib/pic";
import { calcularEstadoPago } from "@/lib/payment-status";
import { parseReservaFilters, buildReservaWhere, calcularCamposPendientes } from "@/lib/inscripcion-service";

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function campo(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Campo pendiente";
  return String(value);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return new Response("No autorizado", { status: 403 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const filters = parseReservaFilters(params);
  const where = buildReservaWhere(filters);

  const reservas = await prisma.reserva.findMany({
    where,
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
    "Fecha de nacimiento",
    "Iglesia",
    "Departamento",
    "Ciudad",
    "Rol PIC",
    "Contacto de emergencia",
    "Telefono de emergencia",
    "Aprobacion pastor",
    "Taller",
    "Estado de datos",
    "Campos pendientes",
    "Estado de pago",
    "Total abonado",
    "Saldo",
    "Mesa",
    "Silla",
    "Estado de ingreso",
  ];

  const rows = reservas.map((reserva) => {
    const totalAbonado = reserva.pagos.reduce((acc, pago) => acc + pago.monto, 0);
    const saldo = Math.max(reserva.valorTotal - totalAbonado, 0);
    const registroLogistico = reserva.invitados?.[0] ?? null;
    const estadoPagoValue = reserva.estado === EstadoReserva.CANCELADO
      ? "CANCELADO"
      : calcularEstadoPago(reserva.valorTotal, reserva.pagos);
    const dataState = calcularCamposPendientes({
      documento: reserva.user.documento,
      fechaNacimiento: reserva.user.fechaNacimiento,
      iglesia: reserva.user.iglesia,
      departamento: reserva.user.departamento,
      ciudad: reserva.user.ciudad,
      rolPic: reserva.user.rolPic,
      contactoEmergenciaNombre: reserva.user.contactoEmergenciaNombre,
      contactoEmergenciaTelefono: reserva.user.contactoEmergenciaTelefono,
      aprobacionPastor: reserva.user.aprobacionPastor,
      tallerId: reserva.user.tallerId,
    });

    return [
      reserva.user.nombreCompleto,
      campo(reserva.user.documento),
      reserva.user.email,
      reserva.user.telefono,
      campo(reserva.user.fechaNacimiento ? reserva.user.fechaNacimiento.toISOString().slice(0, 10) : null),
      campo(reserva.user.iglesia),
      campo(reserva.user.departamento),
      campo(reserva.user.ciudad),
      campo(reserva.user.rolPic ? rolPicLabel(reserva.user.rolPic) : null),
      campo(reserva.user.contactoEmergenciaNombre),
      campo(reserva.user.contactoEmergenciaTelefono),
      reserva.user.aprobacionPastor ? "Si" : "No",
      campo(reserva.user.taller?.nombre),
      dataState.completa ? "Completa" : "Campos pendientes",
      dataState.camposPendientes.join("; "),
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
