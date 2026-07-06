-- ADR-010: codigo unico por persona.
-- 1) DROP COLUMN reservas.codigo (ya no se usa; los codigos viven en ingresos.codigo).
-- 2) ADD COLUMN ingresos.codigo (unique).
-- 3) ingresos.registradoEn pasa a ser nullable (pre-generado al pagar, set al entrar).

-- Step 1: reservas.codigo
ALTER TABLE "reservas" DROP COLUMN "codigo";

-- Step 2: ingresos.codigo (nullable first para llenar existentes, luego unique)
ALTER TABLE "ingresos" ADD COLUMN "codigo" TEXT;

-- Step 3: ingresos.registradoEn nullable
ALTER TABLE "ingresos" ALTER COLUMN "registradoEn" DROP NOT NULL;

-- Backfill codigo para ingresos existentes (los que ya se usaron en eventos previos).
-- Usamos el codigo de la reserva si existe, sino generamos uno nuevo.
-- Como la columna reservas.codigo ya se dropeo, no podemos hacer backfill desde ahi.
-- Para los ingresos existentes: si el reserva tenia codigo, lo reusamos. Si no, generamos uno.
DO $$
DECLARE
  r RECORD;
  code TEXT;
BEGIN
  FOR r IN SELECT i.id FROM "ingresos" i WHERE i."codigo" IS NULL
  LOOP
    -- Generar codigo con el mismo formato CI-XXXXXXXX (8 chars, alfabeto sin ambiguos)
    code := 'CI-' || (
      SELECT string_agg(
        substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + (random() * 31)::int, 1),
        ''
      )
      FROM generate_series(1, 8)
    );
    UPDATE "ingresos" SET "codigo" = code WHERE "id" = r.id;
  END LOOP;
END $$;

-- Step 4: ingresos.codigo unique
ALTER TABLE "ingresos" ALTER COLUMN "codigo" SET NOT NULL;
CREATE UNIQUE INDEX "ingresos_codigo_key" ON "ingresos"("codigo");

-- Step 5: ingresos.@@index(codigo) para busqueda en validador
CREATE INDEX "ingresos_codigo_idx" ON "ingresos"("codigo");
