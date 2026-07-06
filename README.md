# Cumbre Impacto Putumayo 2026

Aplicación web para la gestión, promoción y control de entradas de **Cumbre Impacto Putumayo 2026**.

Lema: **Sembrando y cosechando juntos**  
Fecha: **10 y 11 de julio de 2026**  
Lugar: **Iglesia Fuente de Agua Viva Cruzada Cristiana, Mocoa, Putumayo**  
Aporte de inscripción: **$45.000 COP**, incluye materiales y alimentación.

## Stack

- Next.js 16.2.7, App Router y Turbopack
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 5 + PostgreSQL 16
- NextAuth/Auth.js con credenciales y Prisma Adapter
- React Hook Form, Zod, Lucide, GSAP
- QR con `qrcode` y escáner con `html5-qrcode`

## Funcionalidad Principal

- Registro e inicio de sesión de participantes.
- Inscripción individual: cada persona debe crear su propio registro.
- Panel admin para usuarios, reservas, pagos, mesas, evento y validación.
- QR único por asistente.
- Control de ingreso, reingreso, almuerzo y refrigerio.
- Confirmación de aportes desde admin.
- Ticket descargable en PNG.

## Configuración Central

Los datos oficiales del evento están centralizados en:

```text
src/config/event.ts
```

La tabla `configuracion` sigue existiendo para edición desde `/admin/evento`; el archivo de configuración funciona como fuente inicial y fallback.

## Setup Local

### 1. Levantar PostgreSQL de desarrollo

```bash
docker compose -f docker-compose.dev.yml up -d
```

Base local:

- Host: `localhost`
- Puerto: `5434`
- Usuario: `cumbre_impacto`
- Password: `cumbre_impacto`
- DB: `cumbre_impacto`

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Variables de entorno

```bash
cp .env.example .env
```

Define al menos:

```env
ADMIN_NAME="Fredy"
ADMIN_EMAIL="fredy@gmail.com"
ADMIN_PASSWORD="Resslow123"
AUTH_SECRET="REEMPLAZAR_CON_SECRETO_SEGURO"
```

### 4. Prisma

```bash
pnpm prisma:generate
pnpm prisma db push
pnpm prisma:seed
```

### 5. Desarrollo

```bash
pnpm dev
```

Abrir: <http://localhost:3000>

## Rutas

| Ruta | Tipo | Descripción |
|---|---|---|
| `/` | Pública | Página principal de Cumbre Impacto |
| `/registro` | Pública | Registro de participante |
| `/login` | Pública | Inicio de sesión |
| `/reservar` | Protegida | Inscripción individual |
| `/mi-reserva` | Protegida | Estado de inscripción y QR |
| `/admin` | Admin | Dashboard |
| `/admin/reservas` | Admin | Gestión de inscripciones |
| `/admin/pagos` | Admin | Gestión de aportes |
| `/admin/validar` | Admin | Control de ingreso, reingreso, almuerzo y refrigerio |
| `/admin/evento` | Admin | Configuración operativa del evento |

## Scripts

| Script | Uso |
|---|---|
| `pnpm dev` | Servidor local |
| `pnpm typecheck` | TypeScript sin emitir |
| `pnpm lint` | ESLint |
| `pnpm build` | Build de producción |
| `pnpm prisma:generate` | Generar Prisma Client |
| `pnpm prisma db push` | Sincronizar esquema en desarrollo |
| `pnpm prisma:deploy` | Aplicar migraciones en producción |
| `pnpm prisma:seed` | Crear admin y configuración inicial |
| `pnpm test:e2e` | Smoke test Prisma, requiere `.env` y DB |

## Docker

Desarrollo:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Producción:

```bash
cp .env.production.example .env.production
docker compose --env-file .env.production up -d --build
```

Los contenedores, volúmenes, red y base de datos usan nombres `cumbre-impacto-*` o `cumbre_impacto_*`.
