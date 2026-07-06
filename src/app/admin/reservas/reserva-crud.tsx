"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EstadoInvitado } from "@prisma/client";
import { Edit3, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminActionResult } from "@/lib/types";
import { crearReservaAdmin, editarReservaAdmin, eliminarReservaAdmin } from "../actions";

export type ReservaEditable = {
  id: string;
  user: {
    nombreCompleto: string;
    email: string;
    telefono: string;
  };
  invitados: Array<{
    numero: number;
    nombreCompleto: string;
    telefono: string;
    estado: EstadoInvitado;
  }>;
};

const initial: AdminActionResult = { error: null, success: true };

function phoneLocal(value: string) {
  const digits = (value ?? "").replace(/\D/g, "").slice(-10);
  return digits || value;
}

export function CrearReservaButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Crear inscripción
      </Button>
      {open && <ReservaModal title="Crear inscripción" onClose={() => setOpen(false)} />}
    </>
  );
}

export function EditarReservaButton({ reserva }: { reserva: ReservaEditable }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Edit3 className="h-3 w-3" />
        Editar
      </Button>
      {open && (
        <ReservaModal
          title="Editar inscripción"
          reserva={reserva}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export function EliminarReservaButton({
  reservaId,
  nombre,
}: {
  reservaId: string;
  nombre: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Vas a eliminar la inscripción de ${nombre}. ¿Continuar?`)) return;
          setMessage(null);
          startTransition(async () => {
            const result = await eliminarReservaAdmin(reservaId);
            setMessage(result.error ?? result.message ?? "Inscripción eliminada.");
            if (!result.error) router.refresh();
          });
        }}
      >
        <Trash2 className="h-3 w-3" />
        Eliminar
      </Button>
      {message && <p className="max-w-56 text-right text-xs text-ash">{message}</p>}
    </div>
  );
}

function ReservaModal({
  title,
  reserva,
  onClose,
}: {
  title: string;
  reserva?: ReservaEditable;
  onClose: () => void;
}) {
  const router = useRouter();
  const [result, setResult] = useState<AdminActionResult>(initial);
  const [pending, startTransition] = useTransition();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-taller-shadow/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-lg border border-taller-iron bg-taller-night p-5 shadow-modal">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl text-cream">{title}</h2>
          <button type="button" onClick={onClose} className="text-ash hover:text-cream">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="space-y-4"
          action={(formData) => {
            setResult(initial);
            formData.set("cantidad", "1");
            formData.set("invitado_1_nombre", String(formData.get("nombreCompleto") ?? ""));
            formData.set("invitado_1_telefono", String(formData.get("telefono") ?? ""));
            startTransition(async () => {
              const next = reserva
                ? await editarReservaAdmin(initial, formData)
                : await crearReservaAdmin(initial, formData);
              setResult(next);
              if (!next.error) {
                router.refresh();
                onClose();
              }
            });
          }}
        >
          {reserva && <input type="hidden" name="reservaId" value={reserva.id} />}
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Titular"
              name="nombreCompleto"
              defaultValue={reserva?.user.nombreCompleto}
            />
            <Field label="Email" name="email" type="email" defaultValue={reserva?.user.email} />
            <Field
              label="Celular"
              name="telefono"
              defaultValue={reserva ? phoneLocal(reserva.user.telefono) : ""}
            />
          </div>

          <div className="rounded-md border border-taller-iron bg-taller-shadow/50 p-3 text-sm text-bone">
            Esta inscripción es individual. El sistema creará un solo ticket para el titular.
          </div>

          {result.error && <p className="text-sm text-signal-rust">{result.error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue = "",
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-subhead text-xs uppercase tracking-widest text-ash">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required
        className="h-11 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-bone placeholder:text-ash/50 focus:border-ember-bright focus:outline-none"
      />
    </label>
  );
}
