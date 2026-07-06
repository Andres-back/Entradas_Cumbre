"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { cambiarMiContrasena, type CambiarMiContrasenaState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RpmLoader } from "@/components/brand/RpmLoader";
import { ShieldCheck } from "lucide-react";

const initialState: CambiarMiContrasenaState = { error: null };

export function CambiarMiContrasenaForm() {
  const [state, formAction] = useActionState(cambiarMiContrasena, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      // Como el action llama signOut, redirigimos a /login.
      router.push("/login?from=/admin/cuenta&reset=1");
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="actual"
          className="block font-subhead text-lg uppercase tracking-widest text-ash mb-2"
        >
          Contraseña actual
        </label>
        <Input
          id="actual"
          name="actual"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={!!state.fieldErrors?.actual}
        />
        {state.fieldErrors?.actual && (
          <p className="text-signal-rust text-base mt-1">
            {state.fieldErrors.actual}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="nueva"
          className="block font-subhead text-lg uppercase tracking-widest text-ash mb-2"
        >
          Nueva contraseña
        </label>
        <Input
          id="nueva"
          name="nueva"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          aria-invalid={!!state.fieldErrors?.nueva}
        />
        {state.fieldErrors?.nueva && (
          <p className="text-signal-rust text-base mt-1">
            {state.fieldErrors.nueva}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="confirmar"
          className="block font-subhead text-lg uppercase tracking-widest text-ash mb-2"
        >
          Confirmar nueva contraseña
        </label>
        <Input
          id="confirmar"
          name="confirmar"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          aria-invalid={!!state.fieldErrors?.confirmar}
        />
        {state.fieldErrors?.confirmar && (
          <p className="text-signal-rust text-base mt-1">
            {state.fieldErrors.confirmar}
          </p>
        )}
      </div>

      {state.error && !state.fieldErrors && (
        <p className="text-signal-rust text-lg">{state.error}</p>
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
      size="lg"
      disabled={pending}
      className="w-full"
    >
      {pending ? (
        <>
          <RpmLoader />
          Cambiando...
        </>
      ) : (
        <>
          <ShieldCheck className="h-6 w-6" />
          Cambiar contraseña
        </>
      )}
    </Button>
  );
}


