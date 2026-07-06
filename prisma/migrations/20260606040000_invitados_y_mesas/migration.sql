-- ADR-011: Invitados ilimitados (max 30) + Mesas + Pago por invitado
-- Drop: Reserva campos de acompanante, tabla ingresos.
-- Add: tabla invitados, tabla mesas, enum EstadoInvitado,
--      reservas drop columns, pagos.invitadosCubiertos,
--      enum EstadoReserva reducido.

-- Enum nuevo
CREATE TYPE "EstadoInvitado" AS ENUM ('PENDIENTE_PAGO', 'PAGADO', 'ASISTIO');

-- Enum nuevo reducido (sustituye al viejo)
ALTER TYPE "EstadoReserva" RENAME TO "EstadoReserva_old";
CREATE TYPE "EstadoReserva" AS ENUM ('PAGO_PENDIENTE', 'PARCIAL', 'ASISTIO', 'CANCELADO');

-- Tabla nueva: invitados
CREATE TABLE "invitados" (
    "id" TEXT NOT NULL,
    "reservaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "estado" "EstadoInvitado" NOT NULL DEFAULT 'PENDIENTE_PAGO',
    "codigo" TEXT,
    "mesaId" TEXT,
    "silla" INTEGER,
    "adminIdPago" TEXT,
    "fechaPago" TIMESTAMP(3),
    "adminIdAsignacion" TEXT,
    "fechaAsignacion" TIMESTAMP(3),
    "registradoEn" TIMESTAMP(3),
    "notasInternas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitados_pkey" PRIMARY KEY ("id")
);

-- Tabla nueva: mesas
CREATE TABLE "mesas" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "capacidad" INTEGER NOT NULL DEFAULT 8,
    "notas" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mesas_pkey" PRIMARY KEY ("id")
);

-- Indices
CREATE UNIQUE INDEX "invitados_codigo_key" ON "invitados"("codigo");
CREATE UNIQUE INDEX "invitados_reservaId_numero_key" ON "invitados"("reservaId", "numero");
CREATE INDEX "invitados_reservaId_idx" ON "invitados"("reservaId");
CREATE INDEX "invitados_estado_idx" ON "invitados"("estado");
CREATE INDEX "invitados_mesaId_silla_idx" ON "invitados"("mesaId", "silla");
CREATE UNIQUE INDEX "mesas_numero_key" ON "mesas"("numero");

-- Foreign keys
ALTER TABLE "invitados" ADD CONSTRAINT "invitados_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "reservas"("id") ON DELETE CASCADE;
ALTER TABLE "invitados" ADD CONSTRAINT "invitados_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "mesas"("id") ON DELETE SET NULL;
ALTER TABLE "invitados" ADD CONSTRAINT "invitados_adminIdPago_fkey" FOREIGN KEY ("adminIdPago") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "invitados" ADD CONSTRAINT "invitados_adminIdAsignacion_fkey" FOREIGN KEY ("adminIdAsignacion") REFERENCES "users"("id") ON DELETE SET NULL;

-- Pago: agregar columna invitadosCubiertos
ALTER TABLE "pagos" ADD COLUMN "invitadosCubiertos" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Drop vieja tabla ingresos (ya tenemos invitados con codigo + registradoEn)
DROP TABLE "ingresos";

-- Drop columnas obsoletas de reservas
ALTER TABLE "reservas"
    DROP COLUMN "vaConAcompanante",
    DROP COLUMN "nombreAcompanante",
    DROP COLUMN "documentoAcompanante",
    DROP COLUMN "vaConAcompanante2",
    DROP COLUMN "nombreAcompanante2",
    DROP COLUMN "documentoAcompanante2",
    DROP COLUMN "cantidadAsistentes",
    DROP COLUMN "cantidadIngresados",
    DROP COLUMN "ultimoIngresoEn",
    DROP COLUMN "emitidoCodigoEn",
    DROP COLUMN "pagadaEn";

-- Drop el enum viejo
DROP TYPE "EstadoReserva_old";
