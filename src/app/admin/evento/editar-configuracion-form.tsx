"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { actualizarConfiguracion } from "../actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RpmLoader } from "@/components/brand/RpmLoader";
import { Save, Calendar, Wallet, User } from "lucide-react";

const formSchema = z.object({
  nombre: z.string().min(1, "Requerido").max(100),
  fecha: z.string().min(1, "Requerida"),
  puertas: z.string().min(1, "Requerido").max(20),
  lugar: z.string().min(1, "Requerido").max(200),
  barrio: z.string().max(100).optional().or(z.literal("")),
  ciudad: z.string().max(100).optional().or(z.literal("")),
  precioPorPersona: z.coerce.number().int().min(0).max(10000000),
  organizadorNombre: z.string().min(1, "Requerido").max(100),
  organizadorEmail: z.string().email("Email inválido").max(200),
  organizadorTelefono: z
    .string()
    .min(7, "Mínimo 7 caracteres")
    .max(20)
    .regex(/^\+?[0-9\s-]+$/, "Solo dígitos, espacios, guiones y opcional +"),
  organizadorWhatsapp: z
    .string()
    .min(7, "Minimo 7 digitos")
    .max(25)
    .regex(/^\+?[0-9\s-]+$/, "Solo digitos, espacios, guiones y opcional +"),
});

type FormValues = z.infer<typeof formSchema>;

export function EditarConfiguracionForm({
  defaults,
}: {
  defaults: FormValues;
}) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
  });

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const fd = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          fd.set(key, String(value));
        }
      });
      const result = await actualizarConfiguracion(
        { error: null },
        fd
      );
      if (result.error) {
        toast.error(result.error);
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([key, msg]) => {
            setError(key as keyof FormValues, { message: msg });
          });
        }
      } else {
        toast.success(result.message ?? "Configuración guardada");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Datos del evento */}
      <div>
        <h3 className="text-base font-subhead uppercase tracking-widest text-ember-bright mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Datos del evento
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-sm text-ash uppercase tracking-widest font-subhead mb-1">
              Nombre del evento
            </label>
            <Input
              id="nombre"
              {...register("nombre")}
              className="h-12 text-base"
            />
            {errors.nombre && (
              <p className="text-signal-rust text-sm mt-1">
                {errors.nombre.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fecha" className="block text-sm text-ash uppercase tracking-widest font-subhead mb-1">
                Fecha y hora
              </label>
              <Input
                id="fecha"
                type="datetime-local"
                {...register("fecha")}
                className="h-12 text-base"
              />
              {errors.fecha && (
                <p className="text-signal-rust text-sm mt-1">
                  {errors.fecha.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="puertas" className="block text-sm text-ash uppercase tracking-widest font-subhead mb-1">
                Puertas (hora de apertura)
              </label>
              <Input
                id="puertas"
                {...register("puertas")}
                placeholder="5:45 pm"
                className="h-12 text-base"
              />
              {errors.puertas && (
                <p className="text-signal-rust text-sm mt-1">
                  {errors.puertas.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="lugar" className="block text-sm text-ash uppercase tracking-widest font-subhead mb-1">
              Lugar
            </label>
            <Input
              id="lugar"
              {...register("lugar")}
              className="h-12 text-base"
            />
            {errors.lugar && (
              <p className="text-signal-rust text-sm mt-1">
                {errors.lugar.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="barrio" className="block text-sm text-ash uppercase tracking-widest font-subhead mb-1">
                Barrio (opcional)
              </label>
              <Input
                id="barrio"
                {...register("barrio")}
                className="h-12 text-base"
              />
              {errors.barrio && (
                <p className="text-signal-rust text-sm mt-1">
                  {errors.barrio.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="ciudad" className="block text-sm text-ash uppercase tracking-widest font-subhead mb-1">
                Ciudad (opcional)
              </label>
              <Input
                id="ciudad"
                {...register("ciudad")}
                className="h-12 text-base"
              />
              {errors.ciudad && (
                <p className="text-signal-rust text-sm mt-1">
                  {errors.ciudad.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Precio */}
      <div>
        <h3 className="text-base font-subhead uppercase tracking-widest text-ember-bright mb-3 flex items-center gap-2">
          <Wallet className="h-4 w-4" /> Precio
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="precioPorPersona" className="block text-sm text-ash uppercase tracking-widest font-subhead mb-1">
              Precio por persona (COP)
            </label>
            <Input
              id="precioPorPersona"
              type="number"
              min={0}
              {...register("precioPorPersona")}
              className="h-12 text-base"
            />
            {errors.precioPorPersona && (
              <p className="text-signal-rust text-sm mt-1">
                {errors.precioPorPersona.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Organizador */}
      <div>
        <h3 className="text-base font-subhead uppercase tracking-widest text-ember-bright mb-3 flex items-center gap-2">
          <User className="h-4 w-4" /> Organizador
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="organizadorNombre" className="block text-sm text-ash uppercase tracking-widest font-subhead mb-1">
              Nombre
            </label>
            <Input
              id="organizadorNombre"
              {...register("organizadorNombre")}
              className="h-12 text-base"
            />
            {errors.organizadorNombre && (
              <p className="text-signal-rust text-sm mt-1">
                {errors.organizadorNombre.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="organizadorEmail" className="block text-sm text-ash uppercase tracking-widest font-subhead mb-1">
              Email
            </label>
            <Input
              id="organizadorEmail"
              type="email"
              {...register("organizadorEmail")}
              className="h-12 text-base"
            />
            {errors.organizadorEmail && (
              <p className="text-signal-rust text-sm mt-1">
                {errors.organizadorEmail.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="organizadorTelefono" className="block text-sm text-ash uppercase tracking-widest font-subhead mb-1">
                Telefono (con +57)
              </label>
              <Input
                id="organizadorTelefono"
                {...register("organizadorTelefono")}
                placeholder="+57 311 826 8444"
                className="h-12 text-base"
              />
              {errors.organizadorTelefono && (
                <p className="text-signal-rust text-sm mt-1">
                  {errors.organizadorTelefono.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="organizadorWhatsapp" className="block text-sm text-ash uppercase tracking-widest font-subhead mb-1">
                Numero de WhatsApp para pagos
              </label>
              <Input
                id="organizadorWhatsapp"
                {...register("organizadorWhatsapp")}
                placeholder="+57 311 826 8444"
                className="h-12 text-base"
              />
              {errors.organizadorWhatsapp && (
                <p className="text-signal-rust text-sm mt-1">
                  {errors.organizadorWhatsapp.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="pt-4 border-t border-taller-iron flex justify-end">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isPending || !isDirty}
          className="w-full sm:w-auto h-12"
        >
          {isPending ? (
            <>
              <RpmLoader />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Guardar cambios
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
