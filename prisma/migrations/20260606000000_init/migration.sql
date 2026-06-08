-- Baseline migration: schema inicial Bajo el Capo
-- Generada con prisma db pull, aplicada con prisma db push

-- Enums
CREATE TYPE "Rol" AS ENUM ('USUARIO', 'ADMIN');
CREATE TYPE "EstadoReserva" AS ENUM ('REGISTRADO', 'PAGO_PENDIENTE', 'PAGADO', 'CODIGO_EMITIDO', 'ASISTIO', 'CANCELADO');
CREATE TYPE "MedioPago" AS ENUM ('NEQUI', 'BANCOLOMBIA', 'DAVIPLATA', 'EFECTIVO');

-- Tabla users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "documento" TEXT,
    "rol" "Rol" NOT NULL DEFAULT 'USUARIO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Tabla reservas
CREATE TABLE "reservas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vaConAcompanante" BOOLEAN NOT NULL DEFAULT false,
    "nombreAcompanante" TEXT,
    "documentoAcompanante" TEXT,
    "cantidadAsistentes" INTEGER NOT NULL DEFAULT 1,
    "valorTotal" INTEGER NOT NULL,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'PAGO_PENDIENTE',
    "codigo" TEXT,
    "confirmadaEn" TIMESTAMP(3),
    "pagadaEn" TIMESTAMP(3),
    "emitidoCodigoEn" TIMESTAMP(3),
    "asistioEn" TIMESTAMP(3),
    "canceladaEn" TIMESTAMP(3),
    "motivoCancelacion" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reservas_userId_key" ON "reservas"("userId");
CREATE UNIQUE INDEX "reservas_codigo_key" ON "reservas"("codigo");
CREATE INDEX "reservas_estado_idx" ON "reservas"("estado");

-- Tabla pagos
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "reservaId" TEXT NOT NULL,
    "medio" "MedioPago" NOT NULL,
    "referencia" TEXT,
    "monto" INTEGER NOT NULL,
    "notasInternas" TEXT,
    "adminId" TEXT NOT NULL,
    "registradoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revertido" BOOLEAN NOT NULL DEFAULT false,
    "revertidoEn" TIMESTAMP(3),
    "motivoReversion" TEXT,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pagos_reservaId_idx" ON "pagos"("reservaId");

-- Foreign keys
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "reservas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
