"use client";

import { useState, useTransition } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import {
  crearOActualizarReserva,
  type ReservarState,
} from "./actions";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button, buttonVariants } from "@/components/ui/button";
import { RpmLoader } from "@/components/brand/RpmLoader";
import { Confetti } from "@/components/brand/Confetti";
import { SuccessCheck } from "@/components/ui/success-check";
import { MAX_POR_RESERVA } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { buildWhatsappConfirmacionUrl } from "@/lib/whatsapp";
import {
  Wrench,
  Plus,
  Minus,
  User,
  Users,
} from "lucide-react";

const invitadoFieldSchema = z.object({
  nombreCompleto: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(80, "Máximo 80 caracteres"),
  telefono: z
    .string()
    .regex(/^\d{10}$/, "10 dígitos (300 123 4567)"),
});

const formSchema = z.object({
  cantidad: z.coerce
    .number()
    .int()
    .min(1, "Mínimo 1 persona (vos)")
    .max(MAX_POR_RESERVA, `Máximo ${MAX_POR_RESERVA} personas`),
  invitados: z.array(invitadoFieldSchema),
});

type FormValues = z.infer<typeof formSchema>;

const initialState: ReservarState = { error: null, success: false };

export type ReservaPrefill = {
  cantidad: number;
  invitados: { nombreCompleto: string; telefono: string }[];
  editingExisting: boolean;
};

export function ReservarForm({
  prefill,
  userNombre,
  userTelefono,
  precioPorPersona,
}: {
  prefill?: ReservaPrefill;
  userNombre: string;
  userTelefono: string;
  precioPorPersona: number;
}) {
  const [successData, setSuccessData] = useState<ReservarState["reservaData"] | null>(null);
  const [isPending, startTransition] = useTransition();

  const guestCount = Math.max(0, (prefill?.cantidad ?? 1) - 1);
  const defaultInvitados = prefill?.invitados ?? Array.from({ length: guestCount }, () => ({
    nombreCompleto: "",
    telefono: "",
  }));

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cantidad: prefill?.cantidad ?? 1,
      invitados: defaultInvitados,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "invitados",
  });

  const cantidadWatcher = useWatch({ control, name: "cantidad" });
  const cantidad = cantidadWatcher ?? 1;
  const total = cantidad * precioPorPersona;

  const ajustarCantidad = (nueva: number) => {
    const clamped = Math.max(1, Math.min(MAX_POR_RESERVA, nueva));
    setValue("cantidad", clamped, { shouldValidate: true });
    const guestTarget = clamped - 1;
    const diff = guestTarget - fields.length;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        append({ nombreCompleto: "", telefono: "" });
      }
    } else if (diff < 0) {
      remove(fields.slice(guestTarget).map((_, i) => guestTarget + i));
    }
  };

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("cantidad", String(data.cantidad));
      data.invitados.forEach((inv, i) => {
        const num = i + 1;
        fd.set(`invitado_${num}_nombreCompleto`, inv.nombreCompleto);
        fd.set(`invitado_${num}_telefono`, inv.telefono);
      });
      // Los campos de cantidad de invitados extra se envian en el form
      // para que el server sepa cuantos invitados procesar.
      fd.set("guestCount", String(data.invitados.length));

      const result = await crearOActualizarReserva(initialState, fd);

      if (result.success) {
        toast.success("¡Reserva guardada!");
        setSuccessData(result.reservaData ?? null);
      } else {
        const message = result.error ?? "Error desconocido";
        toast.error(message);

        if (result.fieldErrors?.cantidad) {
          setError("cantidad", { message: result.fieldErrors.cantidad });
        }
        if (result.fieldErrors?.invitados) {
          setError("invitados", { message: result.fieldErrors.invitados });
        }
      }
    });
  };

  if (successData) {
    return (
      <ExitoReserva
        userNombre={userNombre}
        userTelefono={userTelefono}
        cantidad={successData.cantidad}
        invitados={successData.invitados}
        valorTotal={successData.valorTotal}
        editing={successData.editingExisting}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-28">
      <fieldset className="space-y-3">
        <legend className="font-subhead text-sm uppercase tracking-widest text-ash">
          ¿Cuántos van en total? (máx {MAX_POR_RESERVA})
        </legend>

        <div className="flex items-stretch gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => ajustarCantidad(cantidad - 1)}
            disabled={cantidad <= 1}
            aria-label="Restar un invitado"
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
            disabled={cantidad >= MAX_POR_RESERVA}
            aria-label="Sumar un invitado"
            className="h-14 w-14 shrink-0"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {errors.cantidad && (
          <p className="text-signal-rust text-sm mt-1">
            {errors.cantidad.message}
          </p>
        )}
      </fieldset>

      {fields.length > 0 && (
      <div className="space-y-3">
        <p className="font-subhead text-sm uppercase tracking-widest text-ash flex items-center gap-2">
          <Users className="h-3 w-3" /> Datos de tus invitados
        </p>

        {fields.map((field, idx) => (
          <InvitadoInputs
            key={field.id}
            numero={idx + 1}
            index={idx}
            register={register}
            control={control}
            errors={errors.invitados?.[idx]}
          />
        ))}

        {errors.invitados && !Array.isArray(errors.invitados) && (
          <p className="text-signal-rust text-sm">
            {errors.invitados.message}
          </p>
        )}
      </div>
      )}

      {errors.root && (
        <div
          role="alert"
          className="p-3 rounded-md border border-signal-rust bg-signal-rust/10 text-bone text-sm"
        >
          {errors.root.message}
        </div>
      )}

      <div className="rounded-md border border-ember-rust/40 bg-taller-steel/50 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-ash text-xs uppercase tracking-widest">
            Total a pagar
          </p>
          <p className="font-display text-2xl text-ember-bright shrink-0">
            $ {total.toLocaleString("es-CO")} COP
          </p>
        </div>
        <p className="text-bone text-sm mt-2">
          Coordina el pago con Fredy por WhatsApp. La app no comparte datos
          bancarios.
        </p>
        <p className="text-ash text-[11px] mt-1.5 leading-relaxed">
          Si quieren ir pagando de a pocos, pueden hacerlo. Cada invitado se
          activa cuando Fredy confirma su pago.
        </p>
      </div>

      <p className="text-ash text-xs text-center hidden sm:block">
        Al continuar aceptas que te contactemos por WhatsApp.
      </p>

      <div className="hidden sm:block">
        <SubmitButton
          isPending={isPending}
          cantidad={cantidad}
          editing={!!prefill?.editingExisting}
        />
      </div>

      <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 border-t border-taller-iron bg-taller-night/95 backdrop-blur p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <div className="min-w-0">
            <p className="text-ash text-[10px] uppercase tracking-widest font-subhead">
              Total
            </p>
            <p className="font-display text-lg text-ember-bright leading-none">
              $ {total.toLocaleString("es-CO")} COP
            </p>
          </div>
          <SubmitButton
            isPending={isPending}
            cantidad={cantidad}
            editing={!!prefill?.editingExisting}
            className="flex-1"
            mobile
          />
        </div>
      </div>
    </form>
  );
}

function InvitadoInputs({
  numero,
  index,
  register,
  control,
  errors,
}: {
  numero: number;
  index: number;
  register: ReturnType<typeof useForm<FormValues>>["register"];
  control: ReturnType<typeof useForm<FormValues>>["control"];
  errors?: { nombreCompleto?: { message?: string }; telefono?: { message?: string } };
}) {
  return (
    <div className="rounded-md border border-taller-iron bg-taller-steel/50 p-3 space-y-2.5">
      <p className="text-ember-bright text-[10px] uppercase tracking-widest font-subhead">
        Invitado #{String(numero).padStart(2, "0")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label
            htmlFor={`invitado_${numero}_nombreCompleto`}
            className="flex items-center gap-1 text-ash text-[11px] uppercase tracking-widest font-subhead mb-1"
          >
            <User className="h-3 w-3" /> Nombre
          </label>
          <Input
            id={`invitado_${numero}_nombreCompleto`}
            {...register(`invitados.${index}.nombreCompleto`)}
            type="text"
            placeholder="Como aparece en su documento"
            maxLength={80}
            autoCapitalize="words"
          />
          {errors?.nombreCompleto && (
            <p className="text-signal-rust text-xs mt-1">
              {errors.nombreCompleto.message}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor={`invitado_${numero}_telefono`}
            className="flex items-center gap-1 text-ash text-[11px] uppercase tracking-widest font-subhead mb-1"
          >
            Celular
          </label>
          <Controller
            control={control}
            name={`invitados.${index}.telefono`}
            render={({ field }) => (
              <PhoneInput
                id={`invitado_${numero}_telefono`}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {errors?.telefono && (
            <p className="text-signal-rust text-xs mt-1">
              {errors.telefono.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmitButton({
  isPending,
  cantidad,
  editing,
  className,
  mobile,
}: {
  isPending: boolean;
  cantidad: number;
  editing: boolean;
  className?: string;
  mobile?: boolean;
}) {
  const label =
    cantidad === 1
      ? "1 persona"
      : `${cantidad} personas`;
  return (
    <Button
      type="submit"
      variant="primary"
      size="lg"
      disabled={isPending}
      className={cn("w-full", className)}
    >
      {isPending ? (
        <>
          <RpmLoader />
          {editing
            ? "Guardando..."
            : mobile
            ? "Enviando..."
            : "Forjando tu llave..."}
        </>
      ) : (
        <>
          <Wrench className="h-5 w-5" />
          {editing
            ? `Guardar cambios · ${label}`
            : `Saca tu llave · ${label}`}
        </>
      )}
    </Button>
  );
}

function ExitoReserva({
  userNombre,
  userTelefono,
  cantidad,
  invitados,
  valorTotal,
  editing,
}: {
  userNombre: string;
  userTelefono: string;
  cantidad: number;
  invitados: { nombreCompleto: string; telefono: string }[];
  valorTotal: number;
  editing: boolean;
}) {
  const totalAsistentes = cantidad;

  const waUrl = buildWhatsappConfirmacionUrl({
    nombre: userNombre,
    telefono: userTelefono,
    invitados,
    valorTotal,
  });

  return (
    <>
      <Confetti count={60} seed={2024} />
      <div className="rounded-lg border-2 border-signal-green bg-signal-green/10 p-8 text-center space-y-4 animate-page-in">
        <div className="mx-auto w-20 h-20 rounded-full bg-signal-green/20 flex items-center justify-center">
          <SuccessCheck size={64} tone="success" />
        </div>
        <h2 className="font-display text-2xl text-cream">
          {editing ? "Cambios guardados" : "Llave generada"}
        </h2>
        <p className="text-bone">
          {editing
            ? "Tu reserva quedó actualizada. Avísale a Fredy por WhatsApp si necesitas reconfirmar el pago."
            : "Tu reserva quedó registrada. Ahora coordina el pago con Fredy por WhatsApp y te confirmamos los códigos para entrar."}
        </p>

        {/* Resumen */}
        <div className="mx-auto max-w-sm rounded-md border border-ember-rust/40 bg-taller-steel/50 p-3 text-left">
          <p className="font-subhead text-xs uppercase tracking-widest text-ash mb-2">
            Resumen
          </p>
          <ul className="text-bone text-sm space-y-1">
            <li>
              <span className="text-ash">Titular:</span>{" "}
              <span className="font-subhead">{userNombre}</span>
            </li>
            {invitados.map((inv, i) => (
              <li key={i}>
                <span className="text-ash">Invitado {i + 1}:</span>{" "}
                <span className="font-subhead">{inv.nombreCompleto}</span>{" "}
                <span className="text-ash text-xs">({inv.telefono})</span>
              </li>
            ))}
            <li>
              <span className="text-ash">Asistentes:</span> {totalAsistentes}
            </li>
            <li>
              <span className="text-ash">Valor:</span>{" "}
              <span className="font-display text-ember-bright">
                $ {valorTotal.toLocaleString("es-CO")} COP
              </span>
            </li>
          </ul>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "whatsapp", size: "lg" }),
              "animate-success-pulse"
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.4z" />
            </svg>
            {editing ? "Avisar a Fredy" : "Abrir WhatsApp"}
          </a>
          <a
            href="/mi-reserva"
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
          >
            Ver mi reserva
          </a>
        </div>
      </div>
    </>
  );
}
