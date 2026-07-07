import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { prisma } from "@/lib/db";
import { RegistroForm } from "./registro-form";

export const metadata = {
  title: "Registro | Cumbre Impacto",
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function RegistroPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const talleres = await prisma.taller.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, cupo: true },
  });

  return (
    <main className="flex-1 px-4 py-10 md:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <ClipboardList className="h-10 w-10 text-ember-rust" strokeWidth={2.5} />
          <h1 className="font-display text-3xl text-cream">
            Realiza tu inscripcion
          </h1>
          <p className="max-w-xl text-ash">
            Cada participante debe registrarse con sus propios datos.
          </p>
        </div>
        <RegistroForm next={next} talleres={talleres} />
        <p className="mt-6 text-center text-sm text-ash">
          Ya tienes cuenta?{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="text-ember-bright hover:underline"
          >
            Inicia sesion
          </Link>
        </p>
      </div>
    </main>
  );
}
