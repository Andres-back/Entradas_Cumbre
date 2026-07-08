import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";

import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NuevaInscripcionForm } from "./nueva-inscripcion-form";

export const metadata = { title: "Nueva inscripcion | Admin" };

export default async function NuevaInscripcionPage() {
  const talleres = await prisma.taller.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      cupo: true,
      _count: { select: { usuarios: true } },
    },
  });

  const tallerOptions = talleres
    .map((taller) => ({
      id: taller.id,
      nombre: taller.nombre,
      cupo: taller.cupo,
      inscritos: taller._count.usuarios,
    }))
    .filter((taller) => taller.cupo === null || taller.inscritos < taller.cupo);

  return (
    <main className="px-3 py-4 md:px-8 md:py-8">
      <Link
        href="/admin/reservas"
        className="mb-4 inline-flex min-h-[44px] items-center gap-1 font-subhead text-base uppercase tracking-wider text-ash hover:text-ember-bright"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a inscripciones
      </Link>

      <div className="mb-6">
        <p className="font-subhead text-sm uppercase tracking-widest text-ash">
          Administracion
        </p>
        <h1 className="mt-1 flex items-center gap-2 font-display text-2xl text-cream md:text-3xl">
          <UserPlus className="h-6 w-6 text-ember-bright" />
          Inscribir persona
        </h1>
        <p className="mt-1 max-w-2xl text-base text-bone">
          Crea una inscripcion individual. No se crean acompanantes ni grupos.
        </p>
      </div>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">
            Datos de la persona
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NuevaInscripcionForm talleres={tallerOptions} />
        </CardContent>
      </Card>
    </main>
  );
}
