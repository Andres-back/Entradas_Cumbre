import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: "USUARIO" | "ADMIN";
    debeCambiarContrasena: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: "USUARIO" | "ADMIN";
      debeCambiarContrasena: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "USUARIO" | "ADMIN";
    debeCambiarContrasena: boolean;
  }
}
