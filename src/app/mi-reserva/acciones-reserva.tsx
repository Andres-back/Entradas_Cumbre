"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  cancelarMiReserva,
  type CancelarMiReservaState,
} from "../reservar/actions";
import { AlertTriangle, Pencil, X } from "lucide-react";

const initialState: CancelarMiReservaState = { error: null };

export function AccionesReserva() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [state, formAction] = useActionState(cancelarMiReserva, initialState);
  const router = useRouter();

  if (state.success) {
    router.push("/mi-reserva");
    return null;
  }

  return (
    <div className="mt-6 space-y-3">
      <p className="text-ash text-xs text-center uppercase tracking-widest font-subhead">
        Tu reserva aún no está pagada
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href="/reservar?editar=1"
          className={cn(buttonVariants({ variant: "secondary", size: "md" }))}
        >
          <Pencil className="h-4 w-4" />
          Editar reserva
        </a>
        <Button
          type="button"
          variant="danger"
          size="md"
          onClick={() => setConfirmOpen(true)}
        >
          <X className="h-4 w-4" />
          Cancelar reserva
        </Button>
      </div>

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-title"
          className="mt-4 rounded-md border border-signal-rust/60 bg-signal-rust/5 p-4 space-y-3"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-signal-rust shrink-0 mt-0.5" />
            <div>
              <p
                id="cancel-title"
                className="font-subhead text-sm uppercase tracking-widest text-signal-rust"
              >
                Cancelar mi reserva
              </p>
              <p className="text-bone text-sm mt-1">
                Esto libera tu cupo. Si ya coordinaste el pago por WhatsApp,
                avísale primero a Fredy.
              </p>
            </div>
          </div>

          <form action={formAction} className="space-y-3">
            <label
              htmlFor="motivo"
              className="block font-subhead text-xs uppercase tracking-widest text-ash"
            >
              Motivo (obligatorio)
            </label>
            <textarea
              id="motivo"
              name="motivo"
              required
              minLength={5}
              maxLength={500}
              rows={3}
              placeholder="Cuéntanos por qué cancelas..."
              className="w-full rounded-md border border-taller-iron bg-taller-night/60 px-3 py-2 text-bone placeholder:text-ash/60 focus:border-ember-bright focus:outline-none focus:ring-1 focus:ring-ember-bright/40 font-body text-sm"
              aria-invalid={!!state.fieldErrors?.motivo}
            />
            {state.fieldErrors?.motivo && (
              <p className="text-signal-rust text-xs">
                {state.fieldErrors.motivo}
              </p>
            )}

            {state.error && !state.fieldErrors?.motivo && (
              <p className="text-signal-rust text-xs">{state.error}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmOpen(false)}
              >
                Volver
              </Button>
              <CancelSubmitButton />
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function CancelSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="danger"
      size="sm"
      disabled={pending}
    >
      {pending ? "Cancelando..." : "Confirmar cancelación"}
    </Button>
  );
}
