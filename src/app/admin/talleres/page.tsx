import { PanelsTopLeft, Trash2 } from "lucide-react";

import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { crearTallerAdmin, editarTallerAdmin, eliminarTallerAdmin } from "../actions";

export const metadata = { title: "Talleres | Admin" };

export default async function AdminTalleresPage() {
  const talleres = await prisma.taller.findMany({
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    include: { _count: { select: { usuarios: true, invitados: true } } },
  });

  return (
    <main className="px-3 py-4 md:px-8 md:py-8">
      <div className="mb-4 md:mb-6">
        <p className="font-subhead text-sm uppercase tracking-widest text-ash">Programacion</p>
        <h1 className="mt-1 flex items-center gap-2 font-display text-2xl text-cream md:text-3xl">
          <PanelsTopLeft className="h-6 w-6 text-ember-bright" />
          Talleres
        </h1>
      </div>
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-base md:text-lg">Crear taller</CardTitle></CardHeader>
          <CardContent><TallerForm action={crearTallerAdmin} submitLabel="Crear taller" /></CardContent>
        </Card>
        <div className="space-y-3">
          {talleres.map((taller) => {
            const asignados = Math.max(taller._count.usuarios, taller._count.invitados);
            return (
              <Card key={taller.id}>
                <CardContent className="pt-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-display text-xl text-cream">{taller.nombre}</h2>
                      <p className="text-sm text-ash">{asignados} participantes asignados</p>
                    </div>
                    <span className={taller.activo ? "text-signal-green" : "text-signal-rust"}>
                      {taller.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <TallerForm action={editarTallerAdmin} taller={taller} submitLabel="Guardar cambios" />
                  <form action={eliminarTallerAdmin} className="mt-3">
                    <input type="hidden" name="tallerId" value={taller.id} />
                    <Button type="submit" variant="danger" size="sm">
                      <Trash2 className="h-4 w-4" />
                      {asignados > 0 ? "Desactivar" : "Eliminar"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function TallerForm({
  action,
  taller,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  taller?: { id: string; nombre: string; descripcion: string | null; cupo: number | null; activo: boolean; orden: number };
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      {taller && <input type="hidden" name="tallerId" value={taller.id} />}
      <Field label="Nombre" name="nombre" defaultValue={taller?.nombre} required />
      <Field label="Descripcion" name="descripcion" defaultValue={taller?.descripcion ?? ""} />
      <Field label="Cupo" name="cupo" type="number" defaultValue={taller?.cupo ?? ""} />
      <Field label="Orden" name="orden" type="number" defaultValue={taller?.orden ?? 0} />
      <label className="flex items-center gap-2 text-bone md:col-span-2">
        <input type="checkbox" name="activo" defaultChecked={taller?.activo ?? true} className="h-5 w-5 accent-ember-bright" />
        Activo para registro
      </label>
      <div className="md:col-span-2"><Button type="submit" size="sm">{submitLabel}</Button></div>
    </form>
  );
}

function Field({ label, name, type = "text", defaultValue = "", required }: { label: string; name: string; type?: string; defaultValue?: string | number; required?: boolean }) {
  return (
    <label className="block md:col-span-2">
      <span className="mb-1 block font-subhead text-xs uppercase tracking-widest text-ash">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} required={required} className="h-11 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-bone" />
    </label>
  );
}
