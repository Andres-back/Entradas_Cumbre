import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CambiarMiContrasenaForm } from "./cuenta-form";
import { ADMIN_EMAIL } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { KeyRound, User } from "lucide-react";

export const metadata = {
  title: "Mi cuenta | Admin | Cumbre Impacto",
};

export default async function AdminCuentaPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?from=/admin/cuenta");
  }
  if (session.user.email !== ADMIN_EMAIL) {
    redirect("/login?from=/admin");
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { nombreCompleto: true, email: true, telefono: true, creadoEn: true },
  });

  return (
    <main className="px-4 py-8 md:px-8 max-w-2xl">
      <h1 className="font-display text-2xl md:text-3xl text-cream mb-1">
        Mi cuenta
      </h1>
      <p className="text-ash text-sm mb-6">
        Cambia tu contraseña o revisa tus datos de contacto.
      </p>

      {/* Datos de la cuenta */}
      <div className="mb-6 rounded-md border border-taller-iron bg-taller-steel/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-5 w-5 text-ember-bright" />
          <p className="font-subhead text-lg uppercase tracking-widest text-bone">
            Datos
          </p>
        </div>
        <dl className="space-y-1.5 text-lg">
          <div className="flex justify-between">
            <dt className="text-ash">Nombre</dt>
            <dd className="text-bone">{me?.nombreCompleto}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ash">Email</dt>
            <dd className="text-bone font-mono">{me?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ash">Teléfono</dt>
            <dd className="text-bone font-mono">{me?.telefono}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ash">Admin desde</dt>
            <dd className="text-bone">
              {me?.creadoEn
                ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(
                    me.creadoEn
                  )
                : "—"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Form cambiar contrasena */}
      <div className="rounded-md border border-taller-iron bg-taller-steel/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="h-5 w-5 text-ember-bright" />
          <p className="font-subhead text-lg uppercase tracking-widest text-bone">
            Cambiar mi contraseña
          </p>
        </div>
        <p className="text-ash text-base mb-4">
          Cámbiala cada cierto tiempo y no la compartas. Al cambiarla se cierra
          tu sesión actual.
        </p>
        <CambiarMiContrasenaForm />
      </div>
    </main>
  );
}


