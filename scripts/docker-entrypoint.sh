#!/bin/sh
set -e

echo "=== Bajo el Capó — Docker Entrypoint ==="
echo ""

# Wait for PostgreSQL
echo "> Esperando PostgreSQL (${DB_HOST:-db}:${DB_PORT:-5432})..."
MAX_RETRIES=30
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    if pg_isready -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -U "${DB_USER:-bajoelcapo}" 2>/dev/null; then
        echo "> PostgreSQL listo."
        break
    fi
    RETRY=$((RETRY + 1))
    echo "  Intento ${RETRY}/${MAX_RETRIES}..."
    sleep 2
done
if [ $RETRY -ge $MAX_RETRIES ]; then
    echo "ERROR: PostgreSQL no disponible tras ${MAX_RETRIES} intentos."
    exit 1
fi

# Run pending migrations
echo "> Ejecutando prisma migrate deploy..."
prisma migrate deploy

# Seed (idempotent — usa upsert, no falla si ya existe)
echo "> Ejecutando seed..."
prisma db seed || echo "[WARN] Seed falló (posiblemente ya ejecutado)."

echo "> Iniciando Next.js en :${PORT:-3000}"
echo ""
exec node server.js
