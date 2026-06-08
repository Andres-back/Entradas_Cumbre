import Link from "next/link";
import { LoginForm } from "./login-form";
import { Wrench } from "lucide-react";

export const metadata = {
  title: "Acceso al panel | Bajo el Capó",
};

type Props = {
  searchParams: Promise<{ next?: string; from?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next, from } = await searchParams;
  // Si viene del admin (from=/admin) priorizar eso
  const target = from || next;

  return (
    <main className="flex-1 flex items-center justify-center py-20 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-8">
          <Wrench className="h-10 w-10 text-ember-rust" strokeWidth={2.5} />
          <h1 className="font-display text-3xl text-cream text-center">
            Acceso al panel
          </h1>
          <p className="text-ash text-center">Solo para organizadores.</p>
        </div>
        <LoginForm next={target} />
        <p className="mt-6 text-center text-sm text-ash">
          ¿Eres asistente?{" "}
          <Link href="/" className="text-ember-bright hover:underline">
            Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  );
}
