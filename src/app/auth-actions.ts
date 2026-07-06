"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { Prisma, Rol } from "@prisma/client";

import { signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";

const registroSchema = z.object({
  nombreCompleto: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(80, "Máximo 80 caracteres"),
  email: z.string().email("Email inválido").toLowerCase(),
  telefono: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(
      z
        .string()
        .regex(/^\d{10}$/, "Celular colombiano: 10 dígitos (300 123 4567)")
    )
    .transform((digits) => `+57${digits}`),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});

export type RegistroState = {
  error: string | null;
  fieldErrors?: Partial<Record<keyof z.infer<typeof registroSchema>, string>>;
};

export async function registrarUsuario(
  _prev: RegistroState,
  formData: FormData
): Promise<RegistroState> {
  const raw = {
    nombreCompleto: formData.get("nombreCompleto"),
    email: formData.get("email"),
    telefono: formData.get("telefono"),
    password: formData.get("password"),
  };

  const next = (formData.get("next") as string | null) ?? "";
  // Whitelist: solo permitir paths internos que empiecen por "/"
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "";

  const parsed = registroSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: RegistroState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof typeof raw;
      fieldErrors[key] = issue.message;
    }
    return { error: "Revisa los campos marcados.", fieldErrors };
  }

  const data = parsed.data;
  const passwordHash = await hashPassword(data.password);

  try {
    await prisma.$transaction(async (tx) => {
      // Verificar email duplicado dentro de la transaccion
      const existing = await tx.user.findUnique({
        where: { email: data.email },
        select: { id: true },
      });
      if (existing) {
        throw new Error("EMAIL_DUPLICADO");
      }

      await tx.user.create({
        data: {
          nombreCompleto: data.nombreCompleto,
          email: data.email,
          telefono: data.telefono,
          passwordHash,
          rol: Rol.USUARIO,
        },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_DUPLICADO") {
      return { error: "Este email ya está registrado. Inicia sesión.", fieldErrors: { email: "Email duplicado" } };
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Este email ya está registrado. Inicia sesión.", fieldErrors: { email: "Email duplicado" } };
    }
    throw err;
  }

  // Auto-login despues de registro. Si viene de "Realiza tu inscripción" (next=/reservar)
  // lo mandamos ahi; si no, a /mi-reserva.
  try {
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo: safeNext || "/mi-reserva",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Cuenta creada pero no pudimos iniciar sesión. Intenta hacer login." };
    }
    throw error;
  }

  return { error: null };
}

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export type LoginState = { error: string | null };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = (formData.get("next") as string | null) ?? "";
  // Whitelist: solo paths internos que empiecen por "/"
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "";

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { error: "Datos inválidos." };
  }

  // Rate limit por email + IP (simplificado: solo email aqui)
  const rate = checkRateLimit(`login:${email}`);
  if (!rate.allowed) {
    return {
      error: "Demasiados intentos. Espera 10 minutos e intenta de nuevo.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { rol: true },
  });
  const fallbackRedirect = user?.rol === Rol.ADMIN ? "/admin" : "/mi-reserva";

  try {
    await signIn("credentials", {
      email,
      password,
      // Si viene de un next especifico (ej. /admin via from, o /reservar
      // via next), lo respetamos. Si no, mandamos al destino natural por rol.
      redirectTo: safeNext || fallbackRedirect,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email o contraseña incorrectos." };
    }
    throw error;
  }

  return { error: null };
}


