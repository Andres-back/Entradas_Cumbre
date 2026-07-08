"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, WalletCards, AlertTriangle } from "lucide-react";
import { MedioPago } from "@prisma/client";

import { registrarAbonoReserva, marcarPagadoCompleto, anularPago } from "../../actions";
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
  nombrePersona,
  nombreTaller,
}: {
  reservaId: string;
  valorTotal: number;
  totalPagado: number;
  saldoPendiente: number;
  nombrePersona: string;
  nombreTaller: string | null;
}) {
  const [fullState, fullAction] = useActionState(marcarPagadoCompleto, initial);
  const [partialState, partialAction] = useActionState(registrarAbonoReserva, initial);

  const [showFullConfirm, setShowFullConfirm] = useState(false);
  const [showPartialConfirm, setShowPartialConfirm] = useState(false);
  const [partialMonto, setPartialMonto] = useState(1000);

  const successState = fullState.success && fullState.message ? fullState : partialState.success && partialState.message ? partialState : null;

  if (successState) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-signal-green bg-signal-green/10 p-4">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-signal-green" />
        <p className="text-lg text-bone">{successState.message}</p>
      </div>
    );
  }

  if (saldoPendiente <= 0) {
    return <p className="text-lg text-ash text-center py-4">El aporte esta completo.</p>;
  }

  const errorState = fullState.error ? fullState : partialState.error ? partialState : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-2 rounded-md border border-taller-iron bg-taller-steel/40 p-3 text-base sm:grid-cols-3">
        <Metric label="Total" value={formatCOP(valorTotal)} />
        <Metric label="Abonado" value={formatCOP(totalPagado)} />
        <Metric label="Saldo" value={formatCOP(saldoPendiente)} accent />
      </div>

      {errorState && (
        <p className="flex items-center gap-1 text-lg text-signal-rust">
          <AlertCircle className="h-5 w-5" /> {errorState.error}
        </p>
      )}

      {/* Marcar como pagado completo */}
      <div className="rounded-md border border-signal-green/40 bg-signal-green/5 p-4 space-y-3">
        <p className="font-subhead text-sm uppercase tracking-widest text-signal-green">
          Marcar como pagado completo
        </p>
        <p className="text-bone text-base">
          Se registrara un pago exacto por <strong>{formatCOP(saldoPendiente)}</strong> (saldo pendiente).
        </p>
        <form action={fullAction}>
          <input type="hidden" name="reservaId" value={reservaId} />
          <PaymentFields />

          {!showFullConfirm ? (
            <Button type="button" variant="primary" className="w-full mt-2" onClick={() => setShowFullConfirm(true)}>
              <WalletCards className="h-5 w-5" />
              Marcar como pagado completo
            </Button>
          ) : (
            <FullConfirmDialog
              nombrePersona={nombrePersona}
              nombreTaller={nombreTaller}
              valorTotal={valorTotal}
              totalPagado={totalPagado}
              monto={saldoPendiente}
              onCancel={() => setShowFullConfirm(false)}
            />
          )}
        </form>
      </div>

      {/* Abono parcial separado */}
      <div className="rounded-md border border-ember-bright/30 bg-taller-steel/30 p-4 space-y-3">
        <p className="font-subhead text-sm uppercase tracking-widest text-ember-bright">
          Registrar abono parcial
        </p>
        <form action={partialAction}>
          <input type="hidden" name="reservaId" value={reservaId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-subhead text-xs uppercase tracking-widest text-ash">
                Monto del abono
              </span>
              <input
                name="monto"
                type="number"
                min={1000}
                max={saldoPendiente}
                step={1000}
                required
                value={partialMonto}
                onChange={(e) => setPartialMonto(Number(e.target.value))}
                className="h-11 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-lg text-bone"
              />
              <p className="mt-1 text-xs text-ash">
                Min: $1,000 · Max: {formatCOP(saldoPendiente)}
              </p>
            </label>
            <label className="block">
              <span className="mb-1 block font-subhead text-xs uppercase tracking-widest text-ash">
                Medio
              </span>
              <select name="medio" required className="h-11 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-lg text-bone" defaultValue={MedioPago.NEQUI}>
                <option value={MedioPago.NEQUI}>Nequi</option>
                <option value={MedioPago.BANCOLOMBIA}>Bancolombia</option>
                <option value={MedioPago.DAVIPLATA}>Daviplata</option>
                <option value={MedioPago.EFECTIVO}>Efectivo</option>
              </select>
            </label>
          </div>
          <label className="block mt-3">
            <span className="mb-1 block font-subhead text-xs uppercase tracking-widest text-ash">
              Referencia
            </span>
            <Input name="referencia" placeholder="Opcional" />
          </label>
          <label className="block mt-3">
            <span className="mb-1 block font-subhead text-xs uppercase tracking-widest text-ash">
              Notas internas
            </span>
            <Input name="notas" placeholder="Opcional" />
          </label>

          {!showPartialConfirm ? (
            <Button type="button" variant="secondary" className="w-full mt-3" onClick={() => setShowPartialConfirm(true)} disabled={partialMonto < 1000 || partialMonto > saldoPendiente}>
              Registrar abono de {formatCOP(partialMonto)}
            </Button>
          ) : (
            <PartialConfirmDialog
              monto={partialMonto}
              nuevoSaldo={saldoPendiente - partialMonto}
              onCancel={() => setShowPartialConfirm(false)}
            />
          )}
        </form>
      </div>
    </div>
  );
}

function PaymentFields() {
  return (
    <div className="flex gap-3">
      <label className="block flex-1">
        <span className="mb-1 block font-subhead text-xs uppercase tracking-widest text-ash">
          Medio
        </span>
        <select name="medio" required className="h-11 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-lg text-bone" defaultValue={MedioPago.NEQUI}>
          <option value={MedioPago.NEQUI}>Nequi</option>
          <option value={MedioPago.BANCOLOMBIA}>Bancolombia</option>
          <option value={MedioPago.DAVIPLATA}>Daviplata</option>
          <option value={MedioPago.EFECTIVO}>Efectivo</option>
        </select>
      </label>
      <label className="block flex-1">
        <span className="mb-1 block font-subhead text-xs uppercase tracking-widest text-ash">
          Referencia
        </span>
        <Input name="referencia" placeholder="Opcional" />
      </label>
    </div>
  );
}

function FullConfirmDialog({
  nombrePersona,
  nombreTaller,
  valorTotal,
  totalPagado,
  monto,
  onCancel,
}: {
  nombrePersona: string;
  nombreTaller: string | null;
  valorTotal: number;
  totalPagado: number;
  monto: number;
  onCancel: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <div className="mt-3 rounded-md border border-signal-green/60 bg-signal-green/5 p-4 space-y-3 max-h-[60vh] overflow-y-auto">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-signal-green shrink-0 mt-0.5" />
        <div>
          <p className="font-subhead text-sm uppercase tracking-widest text-signal-green">
            Confirmar pago completo
          </p>
          <div className="mt-2 space-y-1 text-sm text-bone">
            <p>Persona: <strong>{nombrePersona}</strong></p>
            {nombreTaller && <p>Taller: <strong>{nombreTaller}</strong></p>}
            <p>Valor total: <strong>{formatCOP(valorTotal)}</strong></p>
            <p>Total abonado: <strong>{formatCOP(totalPagado)}</strong></p>
            <p>Saldo pendiente: <strong>{formatCOP(monto)}</strong></p>
            <p>Monto a registrar: <strong>{formatCOP(monto)}</strong></p>
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2 sticky bottom-0 bg-taller-night">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={pending} className="min-h-[44px]">
          {pending ? (
            <><RpmLoader /> Procesando...</>
          ) : (
            <><WalletCards className="h-5 w-5" /> Confirmar pago completo</>
          )}
        </Button>
      </div>
    </div>
  );
}

function PartialConfirmDialog({
  monto,
  nuevoSaldo,
  onCancel,
}: {
  monto: number;
  nuevoSaldo: number;
  onCancel: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <div className="mt-3 rounded-md border border-ember-bright/40 bg-taller-steel/40 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-ember-bright shrink-0 mt-0.5" />
        <div>
          <p className="font-subhead text-sm uppercase tracking-widest text-ember-bright">
            Confirmar abono
          </p>
          <p className="text-bone text-sm mt-1">
            Registrar abono de <strong>{formatCOP(monto)}</strong>. El nuevo saldo sera{" "}
            <strong>{formatCOP(nuevoSaldo)}</strong>.
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" variant="secondary" disabled={pending} className="min-h-[44px]">
          {pending ? (
            <><RpmLoader /> Registrando...</>
          ) : (
            "Confirmar abono"
          )}
        </Button>
      </div>
    </div>
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

export function AnularPagoButton({ pagoId }: { pagoId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [state, action] = useActionState(anularPago, initial);

  if (state.success && state.message) {
    return <p className="text-signal-green text-sm">{state.message}</p>;
  }

  if (!showForm) {
    return (
      <Button type="button" variant="danger" size="sm" onClick={() => setShowForm(true)}>
        Anular pago
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-2 mt-2 p-3 rounded-md border border-signal-rust/40 bg-signal-rust/5">
      <input type="hidden" name="pagoId" value={pagoId} />
      <label className="block">
        <span className="mb-1 block font-subhead text-xs uppercase tracking-widest text-signal-rust">
          Motivo de anulacion
        </span>
        <textarea
          name="motivo"
          required
          minLength={5}
          maxLength={500}
          rows={2}
          placeholder="Explica por que anulas este pago..."
          className="w-full rounded-md border border-taller-iron bg-taller-shadow px-3 py-2 text-bone text-sm"
        />
      </label>
      {state.error && <p className="text-signal-rust text-xs">{state.error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
          Cancelar
        </Button>
        <AnularSubmitButton />
      </div>
    </form>
  );
}

function AnularSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" size="sm" disabled={pending}>
      {pending ? "Anulando..." : "Confirmar anulacion"}
    </Button>
  );
}
