"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const cambiarSchema = z
  .object({
    nueva: z.string().min(8, "Mínimo 8 caracteres").max(72, "Máximo 72 caracteres"),
    confirmar: z.string().min(8, "Mínimo 8 caracteres").max(72, "Máximo 72 caracteres"),
  })
  .refine((d) => d.nueva === d.confirmar, {
    path: ["confirmar"],
    message: "Las contraseñas no coinciden",
  });

export type CambiarContrasenaState = {
  error: string | null;
  fieldErrors?: { nueva?: string; confirmar?: string };
  success?: boolean;
};

export async function cambiarContrasenaObligatoria(
  _prev: CambiarContrasenaState,
  formData: FormData
): Promise<CambiarContrasenaState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Sesión expirada. Vuelve a iniciar sesión." };
  }

  const parsed = cambiarSchema.safeParse({
    nueva: String(formData.get("nueva") ?? ""),
    confirmar: String(formData.get("confirmar") ?? ""),
  });

  if (!parsed.success) {
    const fieldErrors: CambiarContrasenaState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "nueva" || key === "confirmar") {
        fieldErrors[key] = issue.message;
      }
    }
    return { error: "Revisa los datos.", fieldErrors };
  }

  const nueva = parsed.data.nueva;
  const passwordHash = await hashPassword(nueva);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      passwordHash,
      debeCambiarContrasena: false,
    },
  });

  revalidatePath("/", "layout");

  return { error: null, success: true };
}

/**
 * Permite al usuario cerrar sesion desde /cambiar-contrasena
 * (util si la pwd temporal la genero el admin y no quiere cambiarla ahora).
 */
export async function salirSesion(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
