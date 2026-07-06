import Link from "next/link";
import { RegistroForm } from "./registro-form";
import { Wrench } from "lucide-react";

export const metadata = {
  title: "Registro | Cumbre Impacto",
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function RegistroPage({ searchParams }: Props) {
  const { next } = await searchParams;

  return (
    <main className="flex-1 flex items-center justify-center py-20 px-4">
      <div className="w-full max-w-md w-full">
        <div className="flex flex-col items-center gap-3 mb-8">
          <Wrench className="h-10 w-10 text-ember-rust" strokeWidth={2.5} />
          <h1 className="font-display text-3xl text-cream text-center">
            Realiza tu inscripción
          </h1>
          <p className="text-ash text-center">
            Crea tu cuenta para realizar tu inscripción.
          </p>
        </div>
        <RegistroForm next={next} />
        <p className="mt-6 text-center text-sm text-ash">
          ¿Ya tienes cuenta?{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="text-ember-bright hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}



