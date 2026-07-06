import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Proxy / middleware de Next.js 16.
 * Antes llamado `middleware.ts`, renombrado a `proxy.ts` por Next 16
 * (deprecation warning: "The 'middleware' file convention is deprecated.
 * Please use 'proxy' instead.").
 *
 * Exporta `default` con el `auth` de NextAuth + matcher.
 * Logica en `authConfig.callbacks.authorized` (Edge-safe, sin Prisma/bcrypt).
 */

export const { auth: proxy } = NextAuth(authConfig);

export default proxy;

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.webp).*)",
  ],
};


