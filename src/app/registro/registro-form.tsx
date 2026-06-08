"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RpmLoader } from "@/components/brand/RpmLoader";
import { PhoneInput } from "@/components/ui/phone-input";
import { Wrench } from "lucide-react";
import { registrarUsuario, type RegistroState } from "@/app/auth-actions";

const formSchema = z.object({
  nombreCompleto: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(80, "Máximo 80 caracteres"),
  email: z.string().email("Email inválido"),
  telefono: z
    .string()
    .regex(/^\d{10}$/, "10 dígitos (300 123 4567)"),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});

type FormValues = z.infer<typeof formSchema>;

const initial: RegistroState = { error: null };

export function RegistroForm({ next }: { next?: string }) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("nombreCompleto", data.nombreCompleto);
      fd.set("email", data.email);
      fd.set("telefono", data.telefono);
      fd.set("password", data.password);
      if (next) fd.set("next", next);

      const result = await registrarUsuario(initial, fd);
      if (result.error) {
        toast.error(result.error);
        setError("root", { message: result.error });
        if (result.fieldErrors) {
          for (const [key, message] of Object.entries(result.fieldErrors)) {
            if (message) {
              setError(key as keyof FormValues, { message });
            }
          }
        }
      }
    });
  };

  if (isPending) {
    return <RpmLoader label="Forjando tu llave..." />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label
          htmlFor="nombreCompleto"
          className="block text-xs font-subhead uppercase tracking-widest text-ash mb-2"
        >
          Nombre completo
        </label>
        <Input
          id="nombreCompleto"
          required
          autoComplete="name"
          placeholder="Pedro Ramírez"
          {...register("nombreCompleto")}
        />
        {errors.nombreCompleto && (
          <p className="mt-1 text-xs text-signal-rust">
            {errors.nombreCompleto.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-xs font-subhead uppercase tracking-widest text-ash mb-2"
        >
          Email
        </label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@correo.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-signal-rust">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="telefono"
          className="block text-xs font-subhead uppercase tracking-widest text-ash mb-2"
        >
          Celular (WhatsApp)
        </label>
        <Controller
          control={control}
          name="telefono"
          render={({ field }) => (
            <PhoneInput
              id="telefono"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        {errors.telefono && (
          <p className="mt-1 text-xs text-signal-rust">
            {errors.telefono.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-subhead uppercase tracking-widest text-ash mb-2"
        >
          Contraseña (mínimo 8)
        </label>
        <Input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          {...register("password")}
        />
        {errors.password && (
          <p className="mt-1 text-xs text-signal-rust">
            {errors.password.message}
          </p>
        )}
      </div>

      {errors.root && (
        <p className="text-sm text-signal-rust font-body animate-shake-short">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full">
        <Wrench className="h-5 w-5" />
        Registrarme
      </Button>
    </form>
  );
}
