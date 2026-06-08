import type { NextAuthConfig } from "next-auth";
import { ADMIN_EMAIL } from "@/lib/constants";

/**
 * Configuracion base de Auth.js v5.
 * Edge-compatible: NO importa Prisma ni bcrypt (Node-only).
 * La config completa (con providers) esta en src/auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdmin = auth?.user?.email === ADMIN_EMAIL; // simple check
      const debeCambiarPwd = !!auth?.user?.debeCambiarContrasena;
      const path = nextUrl.pathname;

      const isOnAdmin = path.startsWith("/admin");
      const isOnMiReserva = path.startsWith("/mi-reserva");
      const isOnLogin = path === "/login";
      const isOnRegistro = path === "/registro";
      const isOnCambiarPwd = path === "/cambiar-contrasena";
      const isOnLogout = path === "/logout";
      const isOnApiAuth = path.startsWith("/api/auth");

      // Si el usuario debe cambiar contrasena (pwd temporal asignada por admin),
      // lo bloqueamos en /cambiar-contrasena hasta que lo haga.
      // Excepciones: /logout (puede salir) y /api/auth (NextAuth necesita pasar).
      if (
        debeCambiarPwd &&
        isLoggedIn &&
        !isOnCambiarPwd &&
        !isOnLogout &&
        !isOnApiAuth
      ) {
        return Response.redirect(new URL("/cambiar-contrasena", nextUrl));
      }

      // Rutas admin: requieren login + rol admin
      if (isOnAdmin && !isAdmin) {
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("next", path);
        return Response.redirect(loginUrl);
      }

      // /mi-reserva: requiere login
      if (isOnMiReserva && !isLoggedIn) {
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("next", path);
        return Response.redirect(loginUrl);
      }

      // Si ya esta logueado, no lo mandes a /login o /registro
      if ((isOnLogin || isOnRegistro) && isLoggedIn) {
        return Response.redirect(new URL(isAdmin ? "/admin" : "/mi-reserva", nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
