-- Configuracion: singleton editable desde /admin/evento
-- Contiene datos del evento (fecha, lugar, precio) y del organizador.
-- Inicialmente seeded con los valores que estaban en .env/constants.

-- AlterTable: agregar relacion en users
ALTER TABLE "users" ADD COLUMN "configuracionesEditadas" TEXT;

-- CreateTable
CREATE TABLE "configuracion" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "nombre" TEXT NOT NULL DEFAULT 'Cumbre Impacto',
    "fecha" TIMESTAMP(3) NOT NULL,
    "puertas" TEXT NOT NULL DEFAULT '5:45 pm',
    "lugar" TEXT NOT NULL DEFAULT 'Iglesia Cruzada Cristiana Fuente de Agua Viva',
    "barrio" TEXT DEFAULT 'Barrio San Francisco',
    "ciudad" TEXT,
    "aforo" INTEGER NOT NULL DEFAULT 150,
    "precioPorPersona" INTEGER NOT NULL DEFAULT 25000,
    "organizadorNombre" TEXT NOT NULL DEFAULT 'el equipo organizador',
    "organizadorEmail" TEXT NOT NULL DEFAULT 'fredy@gmail.com',
    "organizadorTelefono" TEXT NOT NULL DEFAULT '+573118268444',
    "organizadorWhatsapp" TEXT NOT NULL DEFAULT '573118268444',
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPorId" TEXT,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "configuracion" ADD CONSTRAINT "configuracion_actualizadoPorId_fkey" FOREIGN KEY ("actualizadoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert singleton row con valores seed
INSERT INTO "configuracion" (
    "id",
    "fecha",
    "actualizadoEn",
    "actualizadoPorId"
) VALUES (
    'singleton',
    '2026-06-20T18:00:00-05:00'::TIMESTAMP,
    CURRENT_TIMESTAMP,
    NULL
);
