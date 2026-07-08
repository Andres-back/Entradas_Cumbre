"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { EstadoInvitado } from "@prisma/client";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { eliminarReservaAdmin } from "../actions";

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

export function CrearReservaButton() {
  return (
    <Link
      href="/admin/inscripciones/nueva"
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-ember-rust px-4 py-2 font-subhead text-sm uppercase tracking-wider text-cream transition hover:bg-ember-bright"
    >
      <Plus className="h-4 w-4" />
      Inscribir persona
    </Link>
  );
}

export function EditarReservaButton({ reserva }: { reserva: ReservaEditable }) {
  return (
    <Link
      href={`/admin/reservas/${reserva.id}`}
      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-taller-iron px-3 py-1.5 text-sm text-bone transition hover:border-ember-rust hover:text-cream"
    >
      <Edit3 className="h-3 w-3" />
      Ver
    </Link>
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
          if (!confirm(`Vas a eliminar la inscripcion de ${nombre}. ¿Continuar?`)) return;
          setMessage(null);
          startTransition(async () => {
            const result = await eliminarReservaAdmin(reservaId);
            setMessage(result.error ?? result.message ?? "Inscripcion eliminada.");
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
