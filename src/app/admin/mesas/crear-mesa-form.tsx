"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { crearMesa } from "../actions";
import type { AdminActionResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RpmLoader } from "@/components/brand/RpmLoader";
import { Plus, AlertCircle, CheckCircle2 } from "lucide-react";

const initial: AdminActionResult = { error: null, success: true };

export function CrearMesaForm() {
  const [state, action] = useActionState(
    async (
      _prev: AdminActionResult,
      formData: FormData
    ): Promise<AdminActionResult> => crearMesa(formData),
    initial
  );

  if (state.success && state.message) {
    return (
      <p className="text-signal-green text-base flex items-center gap-1">
        <CheckCircle2 className="h-4 w-4" /> {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <Input
        name="capacidad"
        type="number"
        min={1}
        max={20}
        defaultValue={8}
        required
        placeholder="Sillas (1-20)"
        className="h-11 md:h-10"
      />
      {state.error && (
        <p className="text-signal-rust text-base flex items-center gap-1">
          <AlertCircle className="h-4 w-4" /> {state.error}
        </p>
      )}
      <SubmitButton />
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
      className="w-full h-11 md:h-9"
    >
      {pending ? (
        <>
          <RpmLoader /> Creando...
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" /> Crear mesa
        </>
      )}
    </Button>
  );
}


