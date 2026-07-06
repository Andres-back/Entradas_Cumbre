import type { NextAuthConfig } from "next-auth";

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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.debeCambiarContrasena = user.debeCambiarContrasena;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "USUARIO" | "ADMIN";
        session.user.debeCambiarContrasena = token.debeCambiarContrasena as boolean;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdmin = auth?.user?.role === "ADMIN";
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
      // Excepciones: /logout (puede salir), /api/auth (NextAuth necesita pasar),
      // y _next/data (server actions internas de Next.js).
      if (
        debeCambiarPwd &&
        isLoggedIn &&
        !isOnCambiarPwd &&
        !isOnLogout &&
        !isOnApiAuth &&
        !path.startsWith("/_next/data")
      ) {
        return Response.redirect(new URL("/cambiar-contrasena", nextUrl));
      }

      // Rutas admin: requieren login + rol admin
      if (isOnAdmin && !isAdmin) {
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("next", path);
        return Response.redirect(loginUrl);
      }

      // Los organizadores trabajan desde el panel. Si una cookie callback vieja
      // los manda a un flujo de asistente, normalizamos el destino.
      if (isAdmin && (path === "/reservar" || path === "/mi-reserva")) {
        return Response.redirect(new URL("/admin", nextUrl));
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


