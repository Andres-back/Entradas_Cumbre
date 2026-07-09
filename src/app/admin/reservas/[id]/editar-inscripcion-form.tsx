"use client";

import { useActionState, useEffect } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { editarReservaAdmin } from "../../actions";
import type { AdminActionResult } from "@/lib/types";
import { ROL_PIC_LABELS, ROL_PIC_OPTIONS, type TallerOption } from "@/lib/pic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EditableInscripcion = {
  id: string;
  nombreCompleto: string;
  email: string;
  telefono: string;
  documento: string | null;
  fechaNacimiento: string;
  iglesia: string | null;
  departamento: string | null;
  ciudad: string | null;
  rolPic: string | null;
  contactoEmergenciaNombre: string | null;
  contactoEmergenciaTelefono: string | null;
  aprobacionPastor: boolean;
  tallerId: string | null;
};

const initialState: AdminActionResult = {
  error: null,
  success: true,
};

export function EditarInscripcionForm({
  inscripcion,
  talleres,
}: {
  inscripcion: EditableInscripcion;
  talleres: TallerOption[];
}) {
  const [state, action, pending] = useActionState(editarReservaAdmin, initialState);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success && state.message) toast.success(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="reservaId" value={inscripcion.id} />

      <Section title="Cuenta y datos personales">
        <Field label="Nombre completo">
          <Input name="nombreCompleto" required minLength={3} maxLength={120} defaultValue={inscripcion.nombreCompleto} />
        </Field>
        <Field label="Correo">
          <Input name="email" type="email" required defaultValue={inscripcion.email} />
        </Field>
        <Field label="WhatsApp">
          <Input name="telefono" type="tel" inputMode="tel" defaultValue={inscripcion.telefono ?? ""} />
        </Field>
        <Field label="Documento">
          <Input name="documento" maxLength={30} defaultValue={inscripcion.documento ?? ""} placeholder="Campo pendiente" />
        </Field>
        <Field label="Fecha de nacimiento">
          <Input name="fechaNacimiento" type="date" defaultValue={inscripcion.fechaNacimiento || ""} />
        </Field>
      </Section>

      <Section title="Informacion eclesial">
        <Field label="Iglesia">
          <Input name="iglesia" maxLength={150} defaultValue={inscripcion.iglesia ?? ""} placeholder="Campo pendiente" />
        </Field>
        <Field label="Departamento">
          <Input name="departamento" maxLength={100} defaultValue={inscripcion.departamento ?? ""} placeholder="Campo pendiente" />
        </Field>
        <Field label="Ciudad">
          <Input name="ciudad" maxLength={100} defaultValue={inscripcion.ciudad ?? ""} placeholder="Campo pendiente" />
        </Field>
        <Field label="Rol PIC">
          <select name="rolPic" className="h-12 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-bone" defaultValue={inscripcion.rolPic ?? ""}>
            <option value="">Campo pendiente</option>
            {ROL_PIC_OPTIONS.map((rol) => (
              <option key={rol} value={rol}>{ROL_PIC_LABELS[rol]}</option>
            ))}
          </select>
        </Field>
        <Field label="Aprobacion pastoral">
          <select name="aprobacionPastor" className="h-12 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-bone" defaultValue={inscripcion.aprobacionPastor == null ? "false" : String(inscripcion.aprobacionPastor)}>
            <option value="true">Si</option>
            <option value="false">No</option>
          </select>
        </Field>
      </Section>

      <Section title="Emergencia y taller">
        <Field label="Contacto de emergencia">
          <Input name="contactoEmergenciaNombre" maxLength={120} defaultValue={inscripcion.contactoEmergenciaNombre ?? ""} placeholder="Campo pendiente" />
        </Field>
        <Field label="Telefono de emergencia">
          <Input name="contactoEmergenciaTelefono" type="tel" inputMode="tel" defaultValue={inscripcion.contactoEmergenciaTelefono ?? ""} placeholder="Campo pendiente" />
        </Field>
        <Field label="Taller">
          <select name="tallerId" disabled={!talleres.length} className="h-12 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-bone disabled:opacity-60" defaultValue={inscripcion.tallerId ?? ""}>
            <option value="">Campo pendiente</option>
            {talleres.map((taller) => (
              <option key={taller.id} value={taller.id}>
                {taller.nombre} {taller.cupo == null || taller.inscritos == null ? "" : `(${Math.max(taller.cupo - taller.inscritos, 0)} cupos)`}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      {state.error && <p className="text-signal-rust">{state.error}</p>}
      {state.success && state.message && <p className="text-signal-green">{state.message}</p>}
      <Button type="submit" disabled={pending || !talleres.length} size="lg" className="w-full">
        <Save className="h-5 w-5" /> {pending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-taller-iron bg-taller-steel/25 p-4">
      <h2 className="mb-4 font-subhead text-sm uppercase tracking-widest text-ember-bright">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-subhead text-xs uppercase tracking-widest text-ash">{label}</span>
      {children}
    </label>
  );
}

