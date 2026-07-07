CREATE TYPE "RolPic" AS ENUM ('PASTOR', 'LIDER', 'SERVIDOR', 'JOVEN', 'ADULTO', 'INVITADO', 'OTRO');

CREATE TABLE "talleres" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "cupo" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "talleres_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "users" ADD COLUMN "fechaNacimiento" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "iglesia" TEXT;
ALTER TABLE "users" ADD COLUMN "departamento" TEXT;
ALTER TABLE "users" ADD COLUMN "ciudad" TEXT;
ALTER TABLE "users" ADD COLUMN "rolPic" "RolPic";
ALTER TABLE "users" ADD COLUMN "contactoEmergenciaNombre" TEXT;
ALTER TABLE "users" ADD COLUMN "contactoEmergenciaTelefono" TEXT;
ALTER TABLE "users" ADD COLUMN "aprobacionPastor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "tallerId" TEXT;

ALTER TABLE "invitados" ADD COLUMN "emailContacto" TEXT;
ALTER TABLE "invitados" ADD COLUMN "documento" TEXT;
ALTER TABLE "invitados" ADD COLUMN "fechaNacimiento" TIMESTAMP(3);
ALTER TABLE "invitados" ADD COLUMN "iglesia" TEXT;
ALTER TABLE "invitados" ADD COLUMN "departamento" TEXT;
ALTER TABLE "invitados" ADD COLUMN "ciudad" TEXT;
ALTER TABLE "invitados" ADD COLUMN "rolPic" "RolPic";
ALTER TABLE "invitados" ADD COLUMN "contactoEmergenciaNombre" TEXT;
ALTER TABLE "invitados" ADD COLUMN "contactoEmergenciaTelefono" TEXT;
ALTER TABLE "invitados" ADD COLUMN "aprobacionPastor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "invitados" ADD COLUMN "tallerId" TEXT;

CREATE UNIQUE INDEX "talleres_nombre_key" ON "talleres"("nombre");
CREATE INDEX "talleres_activo_orden_idx" ON "talleres"("activo", "orden");
CREATE INDEX "users_tallerId_idx" ON "users"("tallerId");
CREATE INDEX "invitados_tallerId_idx" ON "invitados"("tallerId");

ALTER TABLE "users" ADD CONSTRAINT "users_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invitados" ADD CONSTRAINT "invitados_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE SET NULL ON UPDATE CASCADE;
