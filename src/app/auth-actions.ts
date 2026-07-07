"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { Prisma, Rol } from "@prisma/client";

import { signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";
import { ROL_PIC_OPTIONS } from "@/lib/pic";

const phoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .pipe(z.string().regex(/^\d{10}$/, "Celular colombiano: 10 digitos"))
  .transform((digits) => `+57${digits}`);

const optionalDateSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? new Date(`${v}T00:00:00-05:00`) : null))
  .refine((v) => !v || !Number.isNaN(v.getTime()), "Fecha invalida");

const registroSchema = z.object({
  nombreCompleto: z.string().min(3, "Minimo 3 caracteres").max(80),
  email: z.string().email("Email invalido").toLowerCase(),
  telefono: phoneSchema,
  password: z.string().min(8, "Minimo 8 caracteres").max(72),
  documento: z.string().trim().max(30).optional(),
  fechaNacimiento: optionalDateSchema,
  iglesia: z.string().trim().min(2, "Indica tu iglesia").max(120),
  departamento: z.string().trim().min(2, "Indica tu departamento").max(80),
  ciudad: z.string().trim().min(2, "Indica tu ciudad").max(80),
  rolPic: z.enum(ROL_PIC_OPTIONS, { message: "Selecciona tu rol" }),
  contactoEmergenciaNombre: z.string().trim().min(3).max(80),
  contactoEmergenciaTelefono: phoneSchema,
  tallerId: z.string().min(1, "Selecciona un taller"),
  aprobacionPastor: z.boolean().refine(Boolean, "Confirma la aprobacion pastoral"),
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
    documento: formData.get("documento") || undefined,
    fechaNacimiento: formData.get("fechaNacimiento") || undefined,
    iglesia: formData.get("iglesia"),
    departamento: formData.get("departamento"),
    ciudad: formData.get("ciudad"),
    rolPic: formData.get("rolPic"),
    contactoEmergenciaNombre: formData.get("contactoEmergenciaNombre"),
    contactoEmergenciaTelefono: formData.get("contactoEmergenciaTelefono"),
    tallerId: formData.get("tallerId"),
    aprobacionPastor: formData.get("aprobacionPastor") === "true",
  };

  const next = (formData.get("next") as string | null) ?? "";
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
      const existing = await tx.user.findUnique({
        where: { email: data.email },
        select: { id: true },
      });
      if (existing) throw new Error("EMAIL_DUPLICADO");

      const taller = await tx.taller.findUnique({
        where: { id: data.tallerId },
        select: { activo: true, cupo: true },
      });
      if (!taller?.activo) throw new Error("TALLER_NO_DISPONIBLE");
      if (taller.cupo !== null) {
        const inscritos = await tx.user.count({ where: { tallerId: data.tallerId } });
        if (inscritos >= taller.cupo) throw new Error("TALLER_SIN_CUPO");
      }

      await tx.user.create({
        data: {
          nombreCompleto: data.nombreCompleto,
          email: data.email,
          telefono: data.telefono,
          passwordHash,
          rol: Rol.USUARIO,
          documento: data.documento || null,
          fechaNacimiento: data.fechaNacimiento,
          iglesia: data.iglesia,
          departamento: data.departamento,
          ciudad: data.ciudad,
          rolPic: data.rolPic,
          contactoEmergenciaNombre: data.contactoEmergenciaNombre,
          contactoEmergenciaTelefono: data.contactoEmergenciaTelefono,
          aprobacionPastor: data.aprobacionPastor,
          tallerId: data.tallerId,
        },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_DUPLICADO") {
      return { error: "Este email ya esta registrado. Inicia sesion.", fieldErrors: { email: "Email duplicado" } };
    }
    if (err instanceof Error && err.message === "TALLER_NO_DISPONIBLE") {
      return { error: "El taller seleccionado no esta disponible.", fieldErrors: { tallerId: "Selecciona otro taller" } };
    }
    if (err instanceof Error && err.message === "TALLER_SIN_CUPO") {
      return { error: "El taller seleccionado ya no tiene cupos.", fieldErrors: { tallerId: "Selecciona otro taller" } };
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Este email ya esta registrado. Inicia sesion.", fieldErrors: { email: "Email duplicado" } };
    }
    throw err;
  }

  try {
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo: safeNext || "/mi-reserva",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Cuenta creada, pero no pudimos iniciar sesion. Intenta login." };
    }
    throw error;
  }

  return { error: null };
}

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8, "Minimo 8 caracteres"),
});

export type LoginState = { error: string | null };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = (formData.get("next") as string | null) ?? "";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "";

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) return { error: "Datos invalidos." };

  const rate = checkRateLimit(`login:${email}`);
  if (!rate.allowed) {
    return { error: "Demasiados intentos. Espera 10 minutos e intenta de nuevo." };
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
      redirectTo: safeNext || fallbackRedirect,
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Email o contrasena incorrectos." };
    throw error;
  }

  return { error: null };
}
