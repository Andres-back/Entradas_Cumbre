"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  cambiarContrasenaObligatoria,
  salirSesion,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RpmLoader } from "@/components/brand/RpmLoader";
import { Wrench, LogOut } from "lucide-react";

const formSchema = z
  .object({
    nueva: z.string().min(8, "Mínimo 8 caracteres").max(72, "Máximo 72 caracteres"),
    confirmar: z.string().min(8, "Mínimo 8 caracteres").max(72, "Máximo 72 caracteres"),
  })
  .refine((d) => d.nueva === d.confirmar, {
    path: ["confirmar"],
    message: "Las contraseñas no coinciden",
  });

type FormValues = z.infer<typeof formSchema>;

export function CambiarContrasenaForm({
  forzada,
}: {
  forzada: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("nueva", data.nueva);
      fd.set("confirmar", data.confirmar);

      const result = await cambiarContrasenaObligatoria({ error: null }, fd);
      if (result.error) {
        toast.error(result.error);
        setError("root", { message: result.error });
        if (result.fieldErrors) {
          if (result.fieldErrors.nueva) {
            setError("nueva", { message: result.fieldErrors.nueva });
          }
          if (result.fieldErrors.confirmar) {
            setError("confirmar", { message: result.fieldErrors.confirmar });
          }
        }
        return;
      }
      if (result.success) {
        router.push("/mi-reserva");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      {forzada && (
        <div className="p-3 rounded-md border border-ember-rust/40 bg-ember-rust/5 text-bone text-sm">
          <p className="font-subhead text-ember-bright text-xs uppercase tracking-widest mb-1">
            Cambio obligatorio
          </p>
          <p>
            El administrador te asignó una contraseña temporal. Define una
            nueva para continuar.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="nueva"
            className="block font-subhead text-sm uppercase tracking-widest text-ash mb-2"
          >
            Nueva contraseña
          </label>
          <Input
            id="nueva"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            maxLength={72}
            required
            aria-invalid={!!errors.nueva}
            {...register("nueva")}
          />
          {errors.nueva && (
            <p className="text-signal-rust text-xs mt-1">
              {errors.nueva.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmar"
            className="block font-subhead text-sm uppercase tracking-widest text-ash mb-2"
          >
            Confirmar nueva contraseña
          </label>
          <Input
            id="confirmar"
            type="password"
            autoComplete="new-password"
            placeholder="Escribela de nuevo"
            maxLength={72}
            required
            aria-invalid={!!errors.confirmar}
            {...register("confirmar")}
          />
          {errors.confirmar && (
            <p className="text-signal-rust text-xs mt-1">
              {errors.confirmar.message}
            </p>
          )}
        </div>

        {errors.root && (
          <p className="text-signal-rust text-sm">{errors.root.message}</p>
        )}

        <SubmitButton isPending={isPending} />
      </form>

      <form action={salirSesion} className="pt-2 text-center">
        <button
          type="submit"
          className="text-ash text-xs font-subhead uppercase tracking-wider hover:text-bone transition-colors inline-flex items-center gap-1"
        >
          <LogOut className="h-3 w-3" /> Cerrar sesión
        </button>
      </form>
    </div>
  );
}

function SubmitButton({ isPending }: { isPending: boolean }) {
  return (
    <Button
      type="submit"
      variant="primary"
      size="lg"
      disabled={isPending}
      className="w-full"
    >
      {isPending ? (
        <>
          <RpmLoader />
          Guardando...
        </>
      ) : (
        <>
          <Wrench className="h-5 w-5" />
          Cambiar contraseña
        </>
      )}
    </Button>
  );
}


