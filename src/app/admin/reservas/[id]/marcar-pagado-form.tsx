"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, WalletCards } from "lucide-react";
import { MedioPago } from "@prisma/client";

import { registrarAbonoReserva } from "../../actions";
import type { AdminActionResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RpmLoader } from "@/components/brand/RpmLoader";

const initial: AdminActionResult = { error: null, success: true };

function formatCOP(value: number) {
  return `$ ${value.toLocaleString("es-CO")}`;
}

export function MarcarPagadoForm({
  reservaId,
  valorTotal,
  totalPagado,
  saldoPendiente,
}: {
  reservaId: string;
  valorTotal: number;
  totalPagado: number;
  saldoPendiente: number;
}) {
  const [state, action] = useActionState(registrarAbonoReserva, initial);

  if (state.success && state.message) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-signal-green bg-signal-green/10 p-4">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-signal-green" />
        <p className="text-lg text-bone">{state.message}</p>
      </div>
    );
  }

  if (saldoPendiente <= 0) {
    return <p className="text-lg text-ash">El aporte esta completo.</p>;
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="reservaId" value={reservaId} />
      <div className="grid gap-2 rounded-md border border-taller-iron bg-taller-steel/40 p-3 text-base sm:grid-cols-3">
        <Metric label="Total" value={formatCOP(valorTotal)} />
        <Metric label="Abonado" value={formatCOP(totalPagado)} />
        <Metric label="Saldo" value={formatCOP(saldoPendiente)} accent />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block font-subhead text-sm uppercase tracking-widest text-ash">
            Monto a registrar
          </span>
          <Input name="monto" type="number" min={1000} max={saldoPendiente} step={1000} required defaultValue={saldoPendiente} />
          <p className="mt-1 text-xs text-ash">
            Para marcar como pagado se registrara exactamente el saldo pendiente.
          </p>
        </label>
        <label className="block">
          <span className="mb-1 block font-subhead text-sm uppercase tracking-widest text-ash">
            Medio
          </span>
          <select name="medio" required className="h-11 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-lg text-bone" defaultValue={MedioPago.NEQUI}>
            <option value={MedioPago.NEQUI}>Nequi</option>
            <option value={MedioPago.BANCOLOMBIA}>Bancolombia</option>
            <option value={MedioPago.DAVIPLATA}>Daviplata</option>
            <option value={MedioPago.EFECTIVO}>Efectivo</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-subhead text-sm uppercase tracking-widest text-ash">
            Referencia
          </span>
          <Input name="referencia" placeholder="Opcional" />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block font-subhead text-sm uppercase tracking-widest text-ash">
          Notas internas
        </span>
        <Input name="notas" placeholder="Opcional" />
      </label>
      {state.error && (
        <p className="flex items-center gap-1 text-lg text-signal-rust">
          <AlertCircle className="h-5 w-5" /> {state.error}
        </p>
      )}
      <SubmitButton saldoPendiente={saldoPendiente} />
    </form>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="font-subhead text-xs uppercase tracking-widest text-ash">{label}</p>
      <p className={accent ? "font-display text-xl text-ember-bright" : "text-bone"}>{value}</p>
    </div>
  );
}

function SubmitButton({ saldoPendiente }: { saldoPendiente: number }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending} className="h-12 w-full md:h-10">
      {pending ? (
        <>
          <RpmLoader />
          Registrando...
        </>
      ) : (
        <>
          <WalletCards className="h-6 w-6" />
          Marcar como pagado por {formatCOP(saldoPendiente)}
        </>
      )}
    </Button>
  );
}
