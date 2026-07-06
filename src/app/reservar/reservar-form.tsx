"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { crearOActualizarReserva, type ReservarState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { RpmLoader } from "@/components/brand/RpmLoader";
import { Confetti } from "@/components/brand/Confetti";
import { SuccessCheck } from "@/components/ui/success-check";
import { cn } from "@/lib/utils";
import { buildWhatsappConfirmacionUrl } from "@/lib/whatsapp";
import { Ticket } from "lucide-react";

const initialState: ReservarState = { error: null, success: false };

export type ReservaPrefill = {
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

  const onSubmit = () => {
    startTransition(async () => {
      const result = await crearOActualizarReserva(initialState, new FormData());

      if (result.success) {
        toast.success("Inscripción guardada.");
        setSuccessData(result.reservaData ?? null);
      } else {
        toast.error(result.error ?? "Error desconocido");
      }
    });
  };

  if (successData) {
    return (
      <ExitoReserva
        userNombre={userNombre}
        userTelefono={userTelefono}
        valorTotal={successData.valorTotal}
        editing={successData.editingExisting}
      />
    );
  }

  return (
    <form action={onSubmit} className="space-y-6 pb-28">
      <div className="rounded-md border border-ember-rust/40 bg-taller-steel/50 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ember-rust/40 bg-ember-rust/10">
            <Ticket className="h-5 w-5 text-ember-bright" />
          </div>
          <div>
            <p className="font-subhead text-xs uppercase tracking-widest text-ash">
              Cupo individual
            </p>
            <h2 className="mt-1 font-display text-2xl text-cream">
              {userNombre}
            </h2>
            <p className="mt-1 text-sm text-bone">
              Esta inscripción es personal. Si otra persona va a asistir, debe crear su propio registro con su cuenta.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-ember-rust/40 bg-taller-steel/50 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-ash text-xs uppercase tracking-widest">
            Aporte de inscripción
          </p>
          <p className="font-display text-2xl text-ember-bright shrink-0">
            $ {precioPorPersona.toLocaleString("es-CO")} COP
          </p>
        </div>
        <p className="text-bone text-sm mt-2">
          Coordina el aporte con el equipo organizador por WhatsApp. Al confirmarlo, se activa tu código de entrada.
        </p>
      </div>

      <p className="text-ash text-xs text-center hidden sm:block">
        Al continuar aceptas que te contactemos por WhatsApp.
      </p>

      <div className="hidden sm:block">
        <SubmitButton isPending={isPending} editing={!!prefill?.editingExisting} />
      </div>

      <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 border-t border-taller-iron bg-taller-night/95 backdrop-blur p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <div className="min-w-0">
            <p className="text-ash text-[10px] uppercase tracking-widest font-subhead">
              Total
            </p>
            <p className="font-display text-lg text-ember-bright leading-none">
              $ {precioPorPersona.toLocaleString("es-CO")} COP
            </p>
          </div>
          <SubmitButton
            isPending={isPending}
            editing={!!prefill?.editingExisting}
            className="flex-1"
            mobile
          />
        </div>
      </div>
    </form>
  );
}

function SubmitButton({
  isPending,
  editing,
  className,
  mobile,
}: {
  isPending: boolean;
  editing: boolean;
  className?: string;
  mobile?: boolean;
}) {
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
          {editing ? "Guardando..." : mobile ? "Enviando..." : "Creando tu inscripción..."}
        </>
      ) : (
        <>
          <Ticket className="h-5 w-5" />
          {editing ? "Guardar inscripción" : "Realizar inscripción"}
        </>
      )}
    </Button>
  );
}

function ExitoReserva({
  userNombre,
  userTelefono,
  valorTotal,
  editing,
}: {
  userNombre: string;
  userTelefono: string;
  valorTotal: number;
  editing: boolean;
}) {
  const waUrl = buildWhatsappConfirmacionUrl({
    nombre: userNombre,
    telefono: userTelefono,
    invitados: [],
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
          {editing ? "Cambios guardados" : "Inscripción creada"}
        </h2>
        <p className="text-bone">
          {editing
            ? "Tu inscripción quedó actualizada. Avísale al equipo organizador por WhatsApp si necesitas reconfirmar el aporte."
            : "Tu inscripción quedó registrada. Ahora coordina el aporte con el equipo organizador por WhatsApp y te confirmamos tu código para entrar."}
        </p>

        <div className="mx-auto max-w-sm rounded-md border border-ember-rust/40 bg-taller-steel/50 p-3 text-left">
          <p className="font-subhead text-xs uppercase tracking-widest text-ash mb-2">
            Resumen
          </p>
          <ul className="text-bone text-sm space-y-1">
            <li>
              <span className="text-ash">Titular:</span>{" "}
              <span className="font-subhead">{userNombre}</span>
            </li>
            <li>
              <span className="text-ash">Asistentes:</span> 1
            </li>
            <li>
              <span className="text-ash">Aporte:</span>{" "}
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
            className={cn(buttonVariants({ variant: "whatsapp", size: "lg" }), "animate-success-pulse")}
          >
            {editing ? "Avisar al equipo organizador" : "Reportar aporte"}
          </a>
          <a href="/mi-reserva" className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}>
            Ver mi inscripción
          </a>
        </div>
      </div>
    </>
  );
}
