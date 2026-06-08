"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { marcarInvitadosPagados } from "../../actions";
import type { AdminActionResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RpmLoader } from "@/components/brand/RpmLoader";
import { CheckCircle2, AlertCircle, Users } from "lucide-react";
import { MedioPago } from "@prisma/client";

const initial: AdminActionResult = { error: null, success: true };

function formatLocal(telefono: string): string {
  const digits = (telefono ?? "").replace(/\D/g, "");
  if (digits.length < 10) return telefono;
  const d = digits.slice(-10);
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

/**
 * Form per-invitado: el admin selecciona uno o varios invitados pendientes
 * y los marca como PAGADOS. La accion genera un codigo unico por invitado
 * y crea un Pago que cubre a todos.
 *
 * El componente recibe los invitados pendientes de la reserva y deja
 * al admin marcar 1, varios o todos.
 */
export function MarcarPagadoForm({
  invitadosPendientes,
}: {
  invitadosPendientes: { id: string; nombreCompleto: string; telefono: string }[];
}) {
  const [state, action] = useActionState(marcarInvitadosPagados, initial);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  if (state.success && state.message) {
    return (
      <div className="rounded-md border border-signal-green bg-signal-green/10 p-4 flex items-center gap-2">
        <CheckCircle2 className="h-6 w-6 text-signal-green shrink-0" />
        <p className="text-bone text-lg">{state.message}</p>
      </div>
    );
  }

  if (invitadosPendientes.length === 0) {
    return (
      <p className="text-ash text-lg">
        No quedan invitados pendientes de pago.
      </p>
    );
  }

  const toggle = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const total =
    seleccionados.size > 0 ? seleccionados.size : invitadosPendientes.length;

  return (
    <form action={action} className="space-y-4">
      {/* Lista de invitados pendientes con checkboxes */}
      <div className="space-y-2">
        <p className="font-subhead text-base uppercase tracking-widest text-ash flex items-center gap-2">
          <Users className="h-4 w-4" /> Invitados pendientes ({invitadosPendientes.length})
        </p>
          <ul className="space-y-1.5">
            {invitadosPendientes.map((inv) => {
              const checked = seleccionados.has(inv.id);
              return (
                <li key={inv.id}>
                  <label className="flex items-center gap-2 p-2 rounded-md border border-taller-iron bg-taller-steel/50 cursor-pointer hover:border-ember-rust min-h-[44px]">
                    <input
                      type="checkbox"
                      name="invitadoIds"
                      value={inv.id}
                      checked={checked}
                      onChange={() => toggle(inv.id)}
                      className="accent-ember-bright h-5 w-5"
                    />
                    <span className="text-bone text-lg font-subhead flex-1 truncate">
                      {inv.nombreCompleto}
                    </span>
                    <span className="text-ash text-sm font-mono shrink-0">
                      {formatLocal(inv.telefono)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        <p className="text-ash text-base">
          Marca 1 o varios. Si no marcas ninguno, se marcan todos los
          pendientes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-ash text-sm md:text-base uppercase tracking-widest mb-1 font-subhead">
            Medio
          </label>
          <select
            name="medio"
            required
            className="w-full h-11 md:h-10 rounded-md border border-taller-iron bg-taller-shadow px-3 text-bone text-lg focus:border-ember-bright focus:outline-none"
            defaultValue={MedioPago.NEQUI}
          >
            <option value={MedioPago.NEQUI}>Nequi</option>
            <option value={MedioPago.BANCOLOMBIA}>Bancolombia</option>
            <option value={MedioPago.DAVIPLATA}>Daviplata</option>
            <option value={MedioPago.EFECTIVO}>Efectivo</option>
          </select>
        </div>
        <div>
          <label className="block text-ash text-sm md:text-base uppercase tracking-widest mb-1 font-subhead">
            Referencia
          </label>
          <Input
            name="referencia"
            type="text"
            placeholder="Opcional"
            className="h-11 md:h-10"
          />
        </div>
      </div>

      <div>
        <label className="block text-ash text-sm md:text-base uppercase tracking-widest mb-1 font-subhead">
          Notas internas
        </label>
        <Input
          name="notas"
          type="text"
          placeholder="Opcional · Solo visible para el admin"
          className="h-11 md:h-10"
        />
      </div>

      {state.error && (
        <p className="text-signal-rust text-lg flex items-center gap-1">
          <AlertCircle className="h-5 w-5" /> {state.error}
        </p>
      )}

      <SubmitButton total={total} />
    </form>
  );
}

function SubmitButton({ total }: { total: number }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      disabled={pending}
      className="w-full h-12 md:h-10"
    >
      {pending ? (
        <>
          <RpmLoader />
          Procesando...
        </>
      ) : (
        <>
          <CheckCircle2 className="h-6 w-6" />
          Confirmar pago · {total} invitado{total === 1 ? "" : "s"}
        </>
      )}
    </Button>
  );
}
