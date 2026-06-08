import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";

import { authConfig } from "./auth.config";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(72),
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  // @auth/prisma-adapter y next-auth resuelven versiones distintas de @auth/core
  // (0.37.4 vs 0.37.2). Los tipos de Adapter son estructuralmente idénticos pero TS
  // no los reconoce. Cast a Adapter de next-auth, que es la misma referencia
  // estructural que el adapter del prisma.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.nombreCompleto,
          email: user.email,
          role: user.rol,
          debeCambiarContrasena: user.debeCambiarContrasena,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
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
  },
});
