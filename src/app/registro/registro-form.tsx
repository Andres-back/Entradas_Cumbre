"use client";

import { useTransition } from "react";
import type { ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ClipboardCheck, ShieldCheck } from "lucide-react";

import { registrarUsuario, type RegistroState } from "@/app/auth-actions";
import { ROL_PIC_LABELS, ROL_PIC_OPTIONS, type TallerOption } from "@/lib/pic";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RpmLoader } from "@/components/brand/RpmLoader";
import { PhoneInput } from "@/components/ui/phone-input";

const formSchema = z.object({
  nombreCompleto: z.string().min(3).max(120),
  email: z.string().email("Email invalido"),
  telefono: z.string().regex(/^\d{10}$/, "10 digitos"),
  password: z.string().min(8, "Minimo 8 caracteres").max(72),
  documento: z.string().regex(/^[A-Za-z0-9-]*$/, "Solo letras, numeros y guiones").max(30).optional(),
  fechaNacimiento: z
    .string()
    .optional()
    .refine((value) => !value || new Date(`${value}T00:00:00-05:00`) <= new Date(), "La fecha no puede ser futura"),
  iglesia: z.string().min(2, "Indica tu iglesia").max(150),
  departamento: z.string().min(2, "Indica tu departamento").max(100),
  ciudad: z.string().min(2, "Indica tu ciudad").max(100),
  rolPic: z.enum(ROL_PIC_OPTIONS, { message: "Selecciona tu rol" }),
  contactoEmergenciaNombre: z.string().min(3, "Indica un contacto").max(120),
  contactoEmergenciaTelefono: z.string().regex(/^\d{10}$/, "10 digitos"),
  tallerId: z.string().min(1, "Selecciona un taller"),
  aprobacionPastor: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;
const initial: RegistroState = { error: null };

export function RegistroForm({
  next,
  talleres,
}: {
  next?: string;
  talleres: TallerOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      aprobacionPastor: false,
      tallerId: talleres[0]?.id ?? "",
    },
  });

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const fd = new FormData();
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === "boolean") fd.set(key, value ? "true" : "false");
        else if (value) fd.set(key, value);
      }
      if (next) fd.set("next", next);

      const result = await registrarUsuario(initial, fd);
      if (result.error) {
        toast.error(result.error);
        setError("root", { message: result.error });
        if (result.fieldErrors) {
          for (const [key, message] of Object.entries(result.fieldErrors)) {
            if (message && key in formSchema.shape) {
              setError(key as keyof FormValues, { message });
            }
          }
        }
      }
    });
  };

  if (isPending) return <RpmLoader label="Creando tu inscripcion..." />;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-lg border border-taller-iron bg-taller-night/80 p-4 shadow-plate md:p-6"
    >
      <Section title="Paso 1 - Cuenta">
        <Field label="Correo" error={errors.email?.message}>
          <Input type="email" required autoComplete="email" {...register("email")} />
        </Field>
        <Field label="Contrasena" error={errors.password?.message}>
          <Input type="password" required autoComplete="new-password" {...register("password")} />
        </Field>
      </Section>

      <Section title="Paso 2 - Datos personales">
        <Field label="Nombre completo" error={errors.nombreCompleto?.message}>
          <Input required autoComplete="name" {...register("nombreCompleto")} />
        </Field>
        <Field label="Celular WhatsApp" error={errors.telefono?.message}>
          <Controller
            control={control}
            name="telefono"
            render={({ field }) => <PhoneInput value={field.value} onChange={field.onChange} />}
          />
        </Field>
        <Field label="Documento de identidad (opcional)" error={errors.documento?.message}>
          <Input {...register("documento")} />
        </Field>
        <Field label="Fecha de nacimiento (opcional)" error={errors.fechaNacimiento?.message}>
          <Input type="date" {...register("fechaNacimiento")} />
        </Field>
      </Section>

      <Section title="Paso 3 - Informacion eclesial">
        <Field label="Iglesia" error={errors.iglesia?.message}>
          <Input required {...register("iglesia")} />
        </Field>
        <Field label="Departamento" error={errors.departamento?.message}>
          <Input required placeholder="Putumayo" {...register("departamento")} />
        </Field>
        <Field label="Ciudad" error={errors.ciudad?.message}>
          <Input required placeholder="Mocoa" {...register("ciudad")} />
        </Field>
        <Field label="Rol PIC" error={errors.rolPic?.message}>
          <select
            required
            className="h-12 w-full rounded-sm border border-taller-iron bg-taller-steel px-4 text-bone"
            {...register("rolPic")}
            defaultValue=""
          >
            <option value="" disabled>
              Selecciona
            </option>
            {ROL_PIC_OPTIONS.map((rol) => (
              <option key={rol} value={rol}>
                {ROL_PIC_LABELS[rol]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Aprobacion del pastor o lider" error={errors.aprobacionPastor?.message}>
          <select
            className="h-12 w-full rounded-sm border border-taller-iron bg-taller-steel px-4 text-bone"
            {...register("aprobacionPastor", { setValueAs: (value) => value === "true" })}
            defaultValue="false"
          >
            <option value="true">Si, cuenta con aprobacion</option>
            <option value="false">No todavia</option>
          </select>
          <p className="mt-2 text-xs leading-relaxed text-ash">
            Para nosotros es muy importante que su pastor o lider eclesial este informado de su participacion en este evento.
          </p>
        </Field>
      </Section>

      <Section title="Paso 4 - Contacto de emergencia">
        <Field label="Contacto emergencia" error={errors.contactoEmergenciaNombre?.message}>
          <Input required {...register("contactoEmergenciaNombre")} />
        </Field>
        <Field label="Telefono emergencia" error={errors.contactoEmergenciaTelefono?.message}>
          <Controller
            control={control}
            name="contactoEmergenciaTelefono"
            render={({ field }) => <PhoneInput value={field.value} onChange={field.onChange} />}
          />
        </Field>
      </Section>

      <Section title="Paso 5 - Taller">
        <Field label="Taller seleccionado" error={errors.tallerId?.message}>
          <select
            required
            disabled={talleres.length === 0}
            className="h-12 w-full rounded-sm border border-taller-iron bg-taller-steel px-4 text-bone disabled:opacity-60"
            {...register("tallerId")}
          >
            {talleres.length === 0 ? (
              <option value="">No hay talleres activos</option>
            ) : (
              talleres.map((taller) => {
                const disponibles =
                  taller.cupo == null || taller.inscritos == null
                    ? "Sin limite"
                    : `${Math.max(taller.cupo - taller.inscritos, 0)} disponibles`;
                return (
                  <option key={taller.id} value={taller.id}>
                    {taller.nombre} - {disponibles}
                  </option>
                );
              })
            )}
          </select>
        </Field>
        <div className="rounded-md border border-ember-rust/40 bg-taller-steel/40 p-3 text-sm text-bone md:col-span-2">
          <p className="font-subhead uppercase tracking-widest text-cream">
            Paso 6 - Confirmacion
          </p>
          <p className="mt-1 text-ash">
            Aporte individual de $45.000 COP. Incluye materiales y alimentacion. Despues de registrarte podras coordinar tu pago por WhatsApp.
          </p>
        </div>
      </Section>

      {errors.root && <p className="mt-4 text-sm text-signal-rust">{errors.root.message}</p>}

      <Button type="submit" size="lg" className="mt-6 w-full" disabled={talleres.length === 0}>
        <ClipboardCheck className="h-5 w-5" />
        Registrarme
      </Button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 rounded-md border border-taller-iron bg-taller-steel/25 p-4">
      <h2 className="mb-4 flex items-center gap-2 font-subhead text-sm uppercase tracking-widest text-ember-bright">
        <ShieldCheck className="h-4 w-4" />
        {title}
      </h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-subhead uppercase tracking-widest text-ash">
        {label}
      </span>
      {children}
      {error && <p className="mt-1 text-xs text-signal-rust">{error}</p>}
    </label>
  );
}
