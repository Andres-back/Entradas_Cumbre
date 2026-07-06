-- Add unique constraint on [mesaId, silla] to prevent duplicate seat assignments
DROP INDEX IF EXISTS "invitados_mesaId_silla_idx";
CREATE UNIQUE INDEX "invitados_mesaId_silla_key" ON "invitados"("mesaId", "silla");
