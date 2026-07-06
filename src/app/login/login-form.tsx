"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RpmLoader } from "@/components/brand/RpmLoader";
import { loginAction, type LoginState } from "@/app/auth-actions";

const formSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

type FormValues = z.infer<typeof formSchema>;

const initial: LoginState = { error: null };

export function LoginForm({ next }: { next?: string }) {
  const [isPending, startTransition] = useTransition();

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
      fd.set("email", data.email);
      fd.set("password", data.password);
      if (next) fd.set("next", next);

      const result = await loginAction(initial, fd);
      if (result.error) {
        toast.error(result.error);
        setError("root", { message: result.error });
      }
    });
  };

  if (isPending) {
    return <RpmLoader label="Verificando credenciales..." />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
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
          placeholder="fredy@gmail.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-signal-rust">{errors.email.message}</p>
        )}
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-xs font-subhead uppercase tracking-widest text-ash mb-2"
        >
          Contraseña
        </label>
        <Input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          {...register("password")}
        />
        {errors.password && (
          <p className="mt-1 text-xs text-signal-rust">{errors.password.message}</p>
        )}
      </div>
      {errors.root && (
        <p className="text-sm text-signal-rust font-body animate-shake-short">
          {errors.root.message}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full">
        Entrar al taller
      </Button>
    </form>
  );
}


