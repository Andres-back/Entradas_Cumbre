"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { cancelarReserva } from "../../actions";
import type { AdminActionResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Ban, X } from "lucide-react";

const initial: AdminActionResult = { error: null, success: true };

export function CancelarForm({ reservaId }: { reservaId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action] = useActionState(
    async (_prev: AdminActionResult, formData: FormData) =>
      cancelarReserva(reservaId, formData),
    initial
  );

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirming(true)}
        className="border-signal-rust text-signal-rust hover:bg-signal-rust/10 min-h-[44px] md:min-h-0 w-full sm:w-auto"
      >
        <Ban className="h-5 w-5" /> Cancelar reserva
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-3 p-3 rounded-md border border-signal-rust/50 bg-signal-rust/5">
      <p className="text-bone text-lg">
        ¿Seguro? Esta acción invalida el código y libera el cupo.
      </p>
      <Input
        name="motivo"
        type="text"
        placeholder="Motivo (requerido)"
        required
        aria-invalid={!!state.error}
        className="h-11 md:h-10"
      />
      {state.error && (
        <p className="text-signal-rust text-lg flex items-center gap-1">
          <AlertCircle className="h-5 w-5" /> {state.error}
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <SubmitButton />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          className="min-h-[44px] md:min-h-0"
        >
          <X className="h-5 w-5" /> Volver
        </Button>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      size="sm"
      disabled={pending}
      className="bg-signal-rust hover:bg-signal-rust/80 min-h-[44px] md:min-h-0"
    >
      {pending ? "Cancelando..." : "Confirmar cancelación"}
    </Button>
  );
}

