ALTER TYPE "RolPic" ADD VALUE IF NOT EXISTS 'LIDER_ALIANZA_MENTOR';
ALTER TYPE "RolPic" ADD VALUE IF NOT EXISTS 'COORDINADOR_IGLESIA_LOCAL';
ALTER TYPE "RolPic" ADD VALUE IF NOT EXISTS 'LIDER_CASA_PAZ_GRUPO_CONEXION';
ALTER TYPE "RolPic" ADD VALUE IF NOT EXISTS 'LIDER_ORACION';
ALTER TYPE "RolPic" ADD VALUE IF NOT EXISTS 'PASTOR_ALIADO_PIC';

DROP INDEX IF EXISTS "users_ciudad_idx";
DROP INDEX IF EXISTS "users_departamento_idx";
DROP INDEX IF EXISTS "users_rolPic_idx";
DROP INDEX IF EXISTS "users_aprobacionPastor_idx";
DROP INDEX IF EXISTS "invitados_ciudad_idx";
DROP INDEX IF EXISTS "invitados_departamento_idx";
DROP INDEX IF EXISTS "invitados_rolPic_idx";
DROP INDEX IF EXISTS "invitados_aprobacionPastor_idx";
DROP INDEX IF EXISTS "invitados_mesaId_idx";

CREATE INDEX "users_ciudad_idx" ON "users"("ciudad");
CREATE INDEX "users_departamento_idx" ON "users"("departamento");
CREATE INDEX "users_rolPic_idx" ON "users"("rolPic");
CREATE INDEX "users_aprobacionPastor_idx" ON "users"("aprobacionPastor");
CREATE INDEX "invitados_ciudad_idx" ON "invitados"("ciudad");
CREATE INDEX "invitados_departamento_idx" ON "invitados"("departamento");
CREATE INDEX "invitados_rolPic_idx" ON "invitados"("rolPic");
CREATE INDEX "invitados_aprobacionPastor_idx" ON "invitados"("aprobacionPastor");
CREATE INDEX "invitados_mesaId_idx" ON "invitados"("mesaId");

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_tallerId_fkey";
ALTER TABLE "invitados" DROP CONSTRAINT IF EXISTS "invitados_tallerId_fkey";

ALTER TABLE "users" ADD CONSTRAINT "users_tallerId_fkey"
  FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invitados" ADD CONSTRAINT "invitados_tallerId_fkey"
  FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
