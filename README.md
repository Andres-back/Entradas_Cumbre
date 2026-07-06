# Cumbre Impacto Putumayo 2026 — Web

Aplicación web independiente para la gestión y promoción de **Cumbre Impacto Putumayo 2026**.

Lema: **Sembrando y cosechando juntos**  
Fecha: **10 y 11 de julio de 2026**  
Lugar: **Iglesia Fuente de Agua Viva Cruzada Cristiana, Mocoa, Putumayo**  
Aporte de inscripción: **$45.000 COP**, incluye materiales y alimentación.

## Stack

- Next.js 16.2.7, App Router, Turbopack, `output: "standalone"`
- React 19.2.4
- TypeScript
- Tailwind CSS 4 con tokens en `src/app/globals.css`
- Prisma 5.22 + PostgreSQL 16
- NextAuth/Auth.js v5 con credentials y Prisma adapter
- React Hook Form, Zod, Lucide, GSAP
- QR con `qrcode` y escáner con `html5-qrcode`

## Configuración central

Los datos oficiales del evento están centralizados en:

```text
src/config/event.ts
```

La tabla `configuracion` sigue existiendo para edición desde `/admin/evento`; el archivo de configuración funciona como fuente oficial inicial y fallback.

## Setup local

### 1. Levantar PostgreSQL de desarrollo

```bash
docker compose -f docker-compose.dev.yml up -d
```

Base local independiente:

- Host: `localhost`
- Puerto: `5434`
- Usuario: `cumbre_impacto`
- Password: `cumbre_impacto`
- DB: `cumbre_impacto`

### 2. Instalar dependencias

```bash
pnpm install
```

Las builds nativas necesarias están declaradas en `pnpm-workspace.yaml`.

### 3. Variables de entorno

```bash
cp .env.example .env
```

Antes de sembrar datos, define al menos:

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

## Rutas principales

| Ruta | Tipo | Descripción |
|---|---|---|
| `/` | Pública | Landing de Cumbre Impacto |
| `/registro` | Pública | Registro de participante |
| `/login` | Pública | Inicio de sesión |
| `/reservar` | Protegida | Flujo de inscripción |
| `/mi-reserva` | Protegida | Estado de inscripción y QR |
| `/admin` | Admin | Dashboard |
| `/admin/reservas` | Admin | Gestión de inscripciones |
| `/admin/pagos` | Admin | Gestión de aportes |
| `/admin/validar` | Admin | Control de ingreso con QR |
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
| `pnpm prisma:deploy` | Migraciones en producción |
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

Los contenedores, volúmenes, red y base de datos usan nombres `cumbre-impacto-*` o `cumbre_impacto_*` para no reutilizar recursos del proyecto anterior.

## Datos pendientes de confirmar

- URL pública final (`PUBLIC_APP_URL`, `AUTH_URL`, `DOMAIN`).
- URL de Google Maps (`MAPS_URL`).
- WhatsApp oficial, si se desea habilitar (`WHATSAPP_ADMIN_NUMBER` / `WHATSAPP_URL`).
- Instrucciones o método oficial de aporte, si se confirma después (`PAYMENT_ENABLED`, `PAYMENT_INSTRUCTIONS`).
- Capacidad del evento, si se confirma (`EVENT_CAPACITY`).
