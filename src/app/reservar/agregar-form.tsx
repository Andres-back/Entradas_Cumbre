"use client";

import { useTransition } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import { RpmLoader } from "@/components/brand/RpmLoader";
import { MAX_POR_RESERVA } from "@/lib/constants";
import { agregarInvitadosReserva } from "./actions";
import { Minus, Plus, User, Users } from "lucide-react";

const invitadoFieldSchema = z.object({
  nombreCompleto: z.string().min(3, "Mínimo 3 caracteres").max(80),
  telefono: z.string().regex(/^\d{10}$/, "10 dígitos (300 123 4567)"),
});

const formSchema = z.object({
  cantidad: z.coerce.number().int().min(1, "Mínimo 1").max(MAX_POR_RESERVA),
  invitados: z.array(invitadoFieldSchema),
});

type FormValues = z.infer<typeof formSchema>;

export function AgregarInvitadosForm({
  precioPorPersona,
  actuales,
}: {
  precioPorPersona: number;
  actuales: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { cantidad: 1, invitados: [{ nombreCompleto: "", telefono: "" }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "invitados" });

  const cantidadWatcher = useWatch({ control, name: "cantidad" });
  const cantidad = cantidadWatcher ?? 1;
  const total = cantidad * precioPorPersona;

  const ajustarCantidad = (nueva: number) => {
    const clamped = Math.max(1, Math.min(MAX_POR_RESERVA - actuales, nueva));
    setValue("cantidad", clamped, { shouldValidate: true });
    const diff = clamped - fields.length;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) append({ nombreCompleto: "", telefono: "" });
    } else if (diff < 0) {
      remove(fields.slice(clamped).map((_, i) => clamped + i));
    }
  };

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("cantidad", String(data.cantidad));
      data.invitados.forEach((inv, i) => {
        fd.set(`invitado_${i + 1}_nombreCompleto`, inv.nombreCompleto);
        fd.set(`invitado_${i + 1}_telefono`, inv.telefono);
      });
      fd.set("guestCount", String(data.invitados.length));

      const result = await agregarInvitadosReserva();
      if (result.success) {
        toast.success("¡Personas agregadas!");
        router.push("/mi-reserva");
      } else {
        toast.error(result.error ?? "Error desconocido");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-28">
      <div className="rounded-md border border-ember-rust/20 bg-taller-steel/50 p-4 text-center">
        <p className="text-ash text-sm">
          Tenés <span className="text-cream font-subhead">{actuales} personas</span> en tu grupo.
        </p>
        <p className="text-bone text-xs mt-1">
          Agregá más personas a tu reserva.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="font-subhead text-sm uppercase tracking-widest text-ash">
          ¿Cuántos más? (máx {MAX_POR_RESERVA - actuales})
        </legend>

        <div className="flex items-stretch gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => ajustarCantidad(cantidad - 1)}
            disabled={cantidad <= 1}
            aria-label="Restar"
            className="h-14 w-14 shrink-0"
          >
            <Minus className="h-5 w-5" />
          </Button>

          <div className="flex-1 rounded-md border border-taller-iron bg-taller-steel p-3 text-center flex flex-col justify-center">
            <input type="hidden" {...register("cantidad")} />
            <p className="font-display text-4xl text-ember-bright leading-none">
              {cantidad}
            </p>
            <p className="text-ash text-[10px] uppercase tracking-widest font-subhead mt-1">
              {cantidad === 1 ? "persona" : "personas"}
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => ajustarCantidad(cantidad + 1)}
            disabled={cantidad >= MAX_POR_RESERVA - actuales}
            aria-label="Sumar"
            className="h-14 w-14 shrink-0"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </fieldset>

      {fields.length > 0 && (
        <div className="space-y-3">
          <p className="font-subhead text-sm uppercase tracking-widest text-ash flex items-center gap-2">
            <Users className="h-3 w-3" /> Datos de las nuevas personas
          </p>
          {fields.map((field, idx) => (
            <div key={field.id} className="rounded-md border border-taller-iron bg-taller-steel/50 p-3 space-y-2.5">
              <p className="text-ember-bright text-[10px] uppercase tracking-widest font-subhead">
                Persona #{String(actuales + idx + 1).padStart(2, "0")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="flex items-center gap-1 text-ash text-[11px] uppercase tracking-widest font-subhead mb-1">
                    <User className="h-3 w-3" /> Nombre
                  </label>
                  <Input
                    {...register(`invitados.${idx}.nombreCompleto`)}
                    type="text"
                    placeholder="Como aparece en su documento"
                    maxLength={80}
                    autoCapitalize="words"
                  />
                  {errors.invitados?.[idx]?.nombreCompleto && (
                    <p className="text-signal-rust text-xs mt-1">
                      {errors.invitados[idx].nombreCompleto.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-1 text-ash text-[11px] uppercase tracking-widest font-subhead mb-1">
                    Celular
                  </label>
                  <Controller
                    control={control}
                    name={`invitados.${idx}.telefono`}
                    render={({ field: f }) => (
                      <PhoneInput value={f.value} onChange={f.onChange} />
                    )}
                  />
                  {errors.invitados?.[idx]?.telefono && (
                    <p className="text-signal-rust text-xs mt-1">
                      {errors.invitados[idx].telefono.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-md border border-ember-rust/40 bg-taller-steel/50 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-ash text-xs uppercase tracking-widest">Nuevo total</p>
          <p className="font-display text-2xl text-ember-bright shrink-0">
            $ {total.toLocaleString("es-CO")} COP
          </p>
        </div>
      </div>

      <div className="hidden sm:block">
        <Button type="submit" variant="primary" size="lg" disabled={isPending} className="w-full">
          {isPending ? <><RpmLoader /> Agregando...</> : `Agregar ${cantidad} ${cantidad === 1 ? "persona" : "personas"}`}
        </Button>
      </div>

      <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 border-t border-taller-iron bg-taller-night/95 backdrop-blur p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <Button type="submit" variant="primary" size="lg" disabled={isPending} className="w-full">
          {isPending ? <><RpmLoader /> Agregando...</> : `Agregar ${cantidad} ${cantidad === 1 ? "persona" : "personas"}`}
        </Button>
      </div>
    </form>
  );
}


