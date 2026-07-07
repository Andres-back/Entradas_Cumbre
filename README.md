# Cumbre Impacto Putumayo 2026

Aplicacion web para registro, aportes, mesas y control de entrada de Cumbre Impacto Putumayo 2026.

- Inscripcion individual, sin invitados.
- Talleres administrables.
- Abonos parciales; el QR se habilita solo cuando el saldo llega a cero.
- Control de ingreso, reingreso, almuerzo y refrigerio.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 5
- PostgreSQL 16
- NextAuth/Auth.js

## Setup Local

```bash
pnpm install
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
pnpm prisma:generate
pnpm exec prisma migrate deploy
pnpm prisma:seed
pnpm dev
```

Abrir: <http://localhost:3000>

## Base De Datos

No usar `prisma db push` en produccion. Usar migraciones versionadas:

```bash
pnpm prisma:generate
pnpm exec prisma migrate deploy
pnpm prisma:seed
```

Antes de migrar una base con datos, crear backup con `pg_dump`.

## Rutas

| Ruta | Uso |
|---|---|
| `/` | Inicio publico |
| `/registro` | Registro de participante |
| `/reservar` | Inscripcion individual |
| `/mi-reserva` | Estado y QR |
| `/admin/reservas` | Gestion de inscripciones |
| `/admin/pagos` | Historial de aportes |
| `/admin/mesas` | Asignacion de sillas |
| `/admin/talleres` | CRUD de talleres |
| `/admin/usuarios` | CRUD de usuarios |
| `/admin/validar` | Entrada, reingreso, almuerzo y refrigerio |
