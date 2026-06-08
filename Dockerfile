# ============================================================
# Stage 1: Install dependencies
# ============================================================
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ============================================================
# Stage 2: Build Next.js + generate Prisma client
# ============================================================
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1

RUN pnpm prisma:generate
RUN pnpm build

# ============================================================
# Stage 3: Production runner
# ============================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# System deps: curl for healthcheck, openssl for auth secret generation
RUN apk add --no-cache curl openssl

# Install prisma and tsx globally for migrations and seed
RUN npm install -g prisma@5.22.0 tsx

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output (includes traced node_modules)
COPY --from=builder /app/.next/standalone ./

# Static files must be at .next/static (Next.js serves them from there)
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma schema for migrations
COPY --from=builder /app/prisma ./prisma

# Ensure Prisma generated client is available
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Entrypoint script
COPY scripts/docker-entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f -s -o /dev/null http://localhost:3000/ || exit 1

ENTRYPOINT ["./entrypoint.sh"]
