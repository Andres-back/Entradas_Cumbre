"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { MedioPago } from "@prisma/client";
import { CheckCircle2, Copy, MessageCircle, Save } from "lucide-react";
import { toast } from "sonner";

import { crearReservaAdmin } from "../../actions";
import type { AdminActionResult } from "@/lib/types";
import { ROL_PIC_LABELS, ROL_PIC_OPTIONS, type TallerOption } from "@/lib/pic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initial: AdminActionResult<{ reservaId: string; tempPassword: string | null }> = {
  error: null,
  success: true,
};

export function NuevaInscripcionForm({ talleres }: { talleres: TallerOption[] }) {
  const [state, action, pending] = useActionState(crearReservaAdmin, initial);
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success && state.message) toast.success(state.message);
  }, [state]);

  const waText = encodeURIComponent(
    `Hola ${nombre || ""}, tu inscripcion a Cumbre Impacto Putumayo 2026 fue registrada. Correo: ${email}.`
  );
  const waDigits = telefono.replace(/\D/g, "").replace(/^(\d{10})$/, "57$1");
  const waUrl = waDigits ? `https://wa.me/${waDigits}?text=${waText}` : "";

  if (state.success && state.data?.reservaId) {
    return (
      <div className="space-y-4 rounded-md border border-signal-green bg-signal-green/10 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 h-6 w-6 text-signal-green" />
          <div>
            <h2 className="font-display text-2xl text-cream">
              Inscripcion creada
            </h2>
            <p className="mt-1 text-bone">{state.message}</p>
          </div>
        </div>
        {state.data.tempPassword && (
          <div className="rounded-md border border-taller-iron bg-taller-shadow p-3">
            <p className="font-subhead text-xs uppercase tracking-widest text-ash">
              Credenciales temporales
            </p>
            <p className="mt-2 text-bone">
              Correo: <span className="font-mono">{email}</span>
            </p>
            <p className="text-bone">
              Password: <span className="font-mono">{state.data.tempPassword}</span>
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              onClick={() => navigator.clipboard.writeText(`Correo: ${email}\nPassword: ${state.data?.tempPassword}`)}
            >
              <Copy className="h-4 w-4" /> Copiar credenciales
            </Button>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href={`/admin/reservas/${state.data.reservaId}`} className="inline-flex min-h-11 items-center justify-center rounded-md bg-ember-rust px-4 font-subhead uppercase tracking-wider text-cream">
            Ver inscripcion
          </Link>
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-signal-green px-4 font-subhead uppercase tracking-wider text-taller-night">
              <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <Section title="Cuenta y datos personales">
        <Field label="Nombre completo">
          <Input name="nombreCompleto" required minLength={3} maxLength={120} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <Field label="Correo">
          <Input name="email" type="email" required onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="WhatsApp">
          <Input name="telefono" type="tel" inputMode="tel" required placeholder="+57 300 123 4567" onChange={(e) => setTelefono(e.target.value)} />
        </Field>
        <Field label="Documento opcional">
          <Input name="documento" maxLength={30} />
        </Field>
        <Field label="Fecha de nacimiento opcional">
          <Input name="fechaNacimiento" type="date" />
        </Field>
      </Section>

      <Section title="Informacion eclesial">
        <Field label="Iglesia">
          <Input name="iglesia" required maxLength={150} />
        </Field>
        <Field label="Departamento">
          <Input name="departamento" required maxLength={100} />
        </Field>
        <Field label="Ciudad">
          <Input name="ciudad" required maxLength={100} />
        </Field>
        <Field label="Rol PIC">
          <select name="rolPic" required className="h-12 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-bone">
            <option value="">Selecciona</option>
            {ROL_PIC_OPTIONS.map((rol) => (
              <option key={rol} value={rol}>{ROL_PIC_LABELS[rol]}</option>
            ))}
          </select>
        </Field>
        <Field label="Aprobacion pastoral">
          <select name="aprobacionPastor" required className="h-12 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-bone" defaultValue="false">
            <option value="true">Si</option>
            <option value="false">No</option>
          </select>
        </Field>
      </Section>

      <Section title="Emergencia y taller">
        <Field label="Contacto de emergencia">
          <Input name="contactoEmergenciaNombre" required maxLength={120} />
        </Field>
        <Field label="Telefono de emergencia">
          <Input name="contactoEmergenciaTelefono" type="tel" inputMode="tel" required />
        </Field>
        <Field label="Taller">
          <select name="tallerId" required disabled={!talleres.length} className="h-12 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-bone disabled:opacity-60">
            <option value="">Selecciona taller</option>
            {talleres.map((taller) => (
              <option key={taller.id} value={taller.id}>
                {taller.nombre} {taller.cupo == null || taller.inscritos == null ? "" : `(${Math.max(taller.cupo - taller.inscritos, 0)} cupos)`}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Pago opcional">
        <Field label="Abono inicial">
          <Input name="abonoInicial" type="number" inputMode="numeric" min={0} step={1000} defaultValue={0} />
        </Field>
        <Field label="Medio de pago">
          <select name="medio" className="h-12 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-bone" defaultValue={MedioPago.NEQUI}>
            <option value={MedioPago.NEQUI}>Nequi</option>
            <option value={MedioPago.BANCOLOMBIA}>Bancolombia</option>
            <option value={MedioPago.DAVIPLATA}>Daviplata</option>
            <option value={MedioPago.EFECTIVO}>Efectivo</option>
          </select>
        </Field>
        <Field label="Referencia opcional">
          <Input name="referencia" maxLength={120} />
        </Field>
        <label className="flex items-center gap-3 rounded-md border border-ember-rust/40 bg-taller-steel/40 p-3 text-bone md:col-span-2">
          <input name="marcarPagado" type="checkbox" className="h-5 w-5 accent-ember-bright" />
          Marcar como pagado completo
        </label>
      </Section>

      {state.error && <p className="text-signal-rust">{state.error}</p>}
      <Button type="submit" disabled={pending || !talleres.length} size="lg" className="w-full">
        <Save className="h-5 w-5" /> {pending ? "Guardando..." : "Crear inscripcion"}
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
