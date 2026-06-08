/**
 * Rate limit in-memory basico para el endpoint de login.
 * Para produccion con multiples instancias, migrar a Redis o Upstash.
 */

interface AttemptRecord {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutos

export function checkRateLimit(key: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || record.resetAt < now) {
    const next = { count: 1, resetAt: now + WINDOW_MS };
    attempts.set(key, next);
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetAt: next.resetAt };
  }

  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - record.count,
    resetAt: record.resetAt,
  };
}

export function resetRateLimit(key: string): void {
  attempts.delete(key);
}

// Limpiar registros viejos periodicamente
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of attempts.entries()) {
      if (record.resetAt < now) attempts.delete(key);
    }
  }, WINDOW_MS).unref?.();
}
