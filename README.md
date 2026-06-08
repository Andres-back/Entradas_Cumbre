# Bajo el Capó — Web

Sitio web del evento **Bajo el Capó** (charla entre hombres, 20 jun 2026).

## Stack

- Next.js 16.2.7 (App Router, Turbopack, `output: "standalone"`)
- React 19.2.4
- Tailwind CSS 4.3.0 (config en CSS con `@theme`)
- Prisma 5.22 + PostgreSQL 16
- NextAuth v5 (Credentials + PrismaAdapter)
- GSAP 3, Lucide, Zod, bcrypt, nanoid

Ver `D:\DEV\Bajoelcapo\05 - Arquitectura\Stack.md` para detalles.

## Setup local

### 1. Levantar Postgres

```bash
docker compose -f docker-compose.dev.yml up -d
```

Postgres queda en `localhost:5433` (externo) → `5432` (dentro del container) con user `bajoelcapo` / pass `bajoelcapo` / db `bajoelcapo`. Se usa 5433 para no chocar con otros Postgres locales que puedan estar en 5432.

### 2. Instalar dependencias

```bash
pnpm install
```

> **Pnpm 11**: las builds nativas se aprueban vía `pnpm-workspace.yaml` (`allowBuilds`). NO agregar `pnpm.onlyBuiltDependencies` en `package.json`, ya no se lee.

### 3. Variables de entorno

Copiar `.env.example` → `.env` y ajustar si es necesario. Los valores por defecto funcionan con el `docker-compose.dev.yml`.

### 4. Migrar base de datos

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

La primera vez crea la migración inicial. Crea las tablas `User`, `Reserva`, `Pago`.

### 5. Sembrar admin

```bash
pnpm prisma:seed
```

Crea el usuario admin (Fredy) usando las credenciales en `.env` (`ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD`).

### 6. Correr dev

```bash
pnpm dev
```

Abrir <http://localhost:3000>.

## Rutas

| Ruta | Tipo | Descripción |
|---|---|---|
| `/` | pública | Hero BAJO EL CAPÓ + versículo |
| `/registro` | pública | Form de registro de hermano |
| `/login` | pública | Form de login |
| `/mi-reserva` | protegida | Estado de la reserva del usuario |
| `/admin` | protegida (rol=ADMIN) | Panel del admin |
| `/api/auth/[...nextauth]` | API | NextAuth handlers |
| `/logout` | POST | Server route para cerrar sesión |

## Scripts

| Script | Comando | Uso |
|---|---|---|
| `pnpm dev` | `next dev` | Dev con Turbopack |
| `pnpm build` | `next build` | Build de producción |
| `pnpm start` | `next start` | Servidor de producción |
| `pnpm lint` | `eslint` | Lint |
| `pnpm typecheck` | `tsc --noEmit` | Type-check sin emitir |
| `pnpm prisma:generate` | `prisma generate` | Generar cliente |
| `pnpm prisma:migrate` | `prisma migrate dev` | Crear/aplicar migración dev |
| `pnpm prisma:deploy` | `prisma migrate deploy` | Aplicar migraciones en prod |
| `pnpm prisma:studio` | `prisma studio` | GUI de la DB |
| `pnpm prisma:seed` | `prisma db seed` | Sembrar admin |
| `pnpm test:e2e` | `node --env-file=.env scripts/test-e2e.mjs` | Smoke test de Prisma (admin, create user, create reserva, cleanup) |

## Despliegue (VPS)

1. Build: `pnpm build` (genera `.next/standalone/`).
2. Copiar `.next/static`, `public` y `.next/standalone` al VPS.
3. Apuntar a Postgres remoto (cambiar `DATABASE_URL`).
4. Variables de entorno en `.env` (sin secretos en repo).
5. Levantar con `node server.js` detrás de un proxy reverso (Caddy/Nginx).

## Convenciones

- **Path alias**: `@/*` → `src/*`.
- **No emails en MVP**: sin recuperación de contraseña ni notificaciones por email (backlog).
- **Pagos por WhatsApp**: la app NO muestra cuentas bancarias. El admin comparte datos en conversación (ver ADR-005 en `06 - Decisiones`).
- **Branding garage vintage**: ver `08 - Branding y Diseño`. **CAPÓ con tilde.**
- **Aforo**: 150 (validar antes de aceptar reserva).
