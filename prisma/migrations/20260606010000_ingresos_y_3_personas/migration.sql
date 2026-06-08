-- Migracion 20260606010000_ingresos_y_3_personas
-- Cambios:
-- 1. Reserva: agregar campos para 3ra persona + tracking de ingresos
-- 2. Nueva tabla ingresos con FK a reservas y users
-- 3. Nueva relacion en users (ingresosRegistrados)

-- Nuevas columnas en reservas
ALTER TABLE "reservas" ADD COLUMN "vaConAcompanante2" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reservas" ADD COLUMN "nombreAcompanante2" TEXT;
ALTER TABLE "reservas" ADD COLUMN "documentoAcompanante2" TEXT;
ALTER TABLE "reservas" ADD COLUMN "cantidadIngresados" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "reservas" ADD COLUMN "ultimoIngresoEn" TIMESTAMP(3);

-- Tabla ingresos
CREATE TABLE "ingresos" (
    "id" TEXT NOT NULL,
    "reservaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombrePersona" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "registradoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingresos_pkey" PRIMARY KEY ("id")
);

-- Unicidad: una sola entrada por persona por reserva
CREATE UNIQUE INDEX "ingresos_reservaId_numero_key" ON "ingresos"("reservaId", "numero");
CREATE INDEX "ingresos_reservaId_idx" ON "ingresos"("reservaId");

-- FKs
ALTER TABLE "ingresos" ADD CONSTRAINT "ingresos_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "reservas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ingresos" ADD CONSTRAINT "ingresos_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
