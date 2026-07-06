import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { CambiarContrasenaForm } from "./cambiar-form";
import { KeyRound } from "lucide-react";

export const metadata = {
  title: "Cambiar contraseña | Cumbre Impacto",
};

export default async function CambiarContrasenaPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?next=/cambiar-contrasena");
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-md">
          <header className="mb-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-ember-rust/15 flex items-center justify-center mb-3">
              <KeyRound className="h-7 w-7 text-ember-bright" strokeWidth={1.8} />
            </div>
            <h1 className="font-display text-3xl text-cream">
              Cambia tu contraseña
            </h1>
            <p className="text-bone mt-2 text-sm">
              Si te la asignó el admin, este paso es obligatorio antes de
              seguir.
            </p>
          </header>

          <div className="rounded-lg border border-taller-iron bg-taller-steel/60 p-5">
            <CambiarContrasenaForm forzada={session.user.debeCambiarContrasena} />
          </div>
        </div>
      </main>
    </>
  );
}


