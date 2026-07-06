"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import {
  asignarMesa,
  cambiarCapacidadMesa,
  eliminarMesa,
  quitarDeMesa,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Armchair, X, Trash2, Settings, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { EstadoInvitado } from "@prisma/client";
import { Drawer } from "vaul";

export interface InvitadoSinMesa {
  id: string;
  numero: number;
  nombreCompleto: string;
  telefono: string;
  reserva: { user: { nombreCompleto: string } };
}

interface InvitadoSilla {
  id: string;
  nombreCompleto: string;
  telefono: string;
  silla: number | null;
  estado: EstadoInvitado;
  reserva: { user: { nombreCompleto: string; telefono: string } };
}

interface MesaCardProps {
  mesa: {
    id: string;
    numero: number;
    capacidad: number;
    invitados: InvitadoSilla[];
  };
  invitadosSinMesa: InvitadoSinMesa[];
}

function formatLocal(telefono: string): string {
  const digits = (telefono ?? "").replace(/\D/g, "");
  if (digits.length < 10) return telefono;
  const d = digits.slice(-10);
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export function MesaCard({ mesa, invitadosSinMesa }: MesaCardProps) {
  const [editCap, setEditCap] = useState(false);
  const [capValue, setCapValue] = useState(mesa.capacidad);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [openSilla, setOpenSilla] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openSilla === null) return;
    const el = modalRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) focusable[0].focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [openSilla]);

  const occupied = mesa.invitados.filter((i) => i.silla !== null);
  const sillasOcupadas = new Set(occupied.map((i) => i.silla!));

  const onSillaClick = (silla: number) => {
    if (sillasOcupadas.has(silla)) return;
    setOpenSilla(silla);
  };

  const onAsignar = (invitadoId: string) => {
    if (openSilla === null) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("invitadoId", invitadoId);
      fd.set("mesaId", mesa.id);
      fd.set("silla", String(openSilla));
      const res = await asignarMesa(fd);
      if (res.error) {
        setError(res.error);
      } else {
        setOpenSilla(null);
      }
    });
  };

  const onQuitar = (invitadoId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await quitarDeMesa(invitadoId);
      if (res.error) setError(res.error);
    });
  };

  const onEliminar = () => {
    if (occupied.length > 0) {
      setError("No se puede eliminar: hay invitados sentados.");
      return;
    }
    if (!confirm(`Eliminar Mesa ${mesa.numero}?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await eliminarMesa(mesa.id);
      if (res.error) setError(res.error);
    });
  };

  const onGuardarCap = () => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("mesaId", mesa.id);
      fd.set("capacidad", String(capValue));
      const res = await cambiarCapacidadMesa(fd);
      if (res.error) {
        setError(res.error);
      } else {
        setEditCap(false);
      }
    });
  };

  return (
    <div className="rounded-lg border border-taller-iron bg-taller-steel/30 p-3 md:p-4">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-display text-xl md:text-2xl text-ember-bright">
            Mesa {mesa.numero}
          </span>
          <span className="text-ash text-sm md:text-base font-subhead uppercase tracking-widest">
            {occupied.length}/{mesa.capacidad}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {editCap ? (
            <>
              <input
                type="number"
                min={1}
                max={20}
                value={capValue}
                onChange={(e) => setCapValue(Number(e.target.value))}
                className="w-14 h-11 md:h-8 rounded-md border border-taller-iron bg-taller-shadow px-2 text-bone text-lg focus:border-ember-bright focus:outline-none"
              />
              <Button
                size="sm"
                variant="primary"
                type="button"
                disabled={pending}
                onClick={onGuardarCap}
                className="h-11 md:h-9"
              >
                OK
              </Button>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => {
                  setEditCap(false);
                  setCapValue(mesa.capacidad);
                }}
                className="h-11 md:h-9"
              >
                X
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => setEditCap(true)}
              title="Cambiar capacidad"
              className="h-11 md:h-9 px-3"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Cap</span>
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            type="button"
            disabled={pending || occupied.length > 0}
            onClick={onEliminar}
            title={
              occupied.length > 0
                ? "Quita los invitados primero"
                : "Eliminar mesa"
            }
            className="h-11 w-11 md:h-9 md:w-9 p-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-signal-rust text-base mb-2">{error}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 md:gap-2">
        {Array.from({ length: mesa.capacidad }, (_, i) => i + 1).map(
          (sillaNum) => {
            const inv = occupied.find((i) => i.silla === sillaNum);
            return (
              <div
                key={sillaNum}
                className={cn(
                  "rounded-md border p-2 min-h-[64px] md:min-h-[60px] text-base",
                  inv
                    ? "border-ember-bright/40 bg-ember-bright/5"
                    : "border-taller-iron bg-taller-shadow/30 border-dashed cursor-pointer hover:border-ember-rust active:scale-95 transition-transform"
                )}
                onClick={() => !inv && onSillaClick(sillaNum)}
              >
                {inv ? (
                  <div>
                    <p className="font-subhead text-bone truncate">
                      {inv.nombreCompleto}
                    </p>
                    <p className="text-ash text-sm font-mono truncate">
                      {formatLocal(inv.telefono)}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-ash text-sm flex items-center gap-0.5">
                        <Armchair className="h-3.5 w-3.5" /> S{sillaNum}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuitar(inv.id);
                        }}
                        className="text-ash hover:text-signal-rust min-h-[24px] min-w-[24px] flex items-center justify-center -mr-1 -mt-0.5"
                        title="Quitar de la mesa"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="w-full h-full min-h-[48px] flex flex-col items-center justify-center text-ash hover:text-ember-bright"
                  >
                    <Armchair className="h-5 w-5" />
                    <span className="text-sm mt-0.5 font-subhead">
                      Silla {sillaNum}
                    </span>
                  </button>
                )}
              </div>
            );
          }
        )}
      </div>

      {openSilla !== null && (
        <>
          <div className="sm:hidden">
            <Drawer.Root
              open={true}
              onOpenChange={(open: boolean) => {
                if (!open) setOpenSilla(null);
              }}
            >
              <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-50 bg-black/80" />
                <Drawer.Content
                  className="fixed inset-x-0 bottom-0 z-50 bg-taller-night border-t border-taller-iron rounded-t-2xl max-h-[85vh] flex flex-col"
                  aria-labelledby={`mesa-drawer-title-${mesa.id}-${openSilla}`}
                >
                  <Drawer.Handle className="mt-3 mb-1" />
                  {/* Vaul/Radix exige un Title para accesibilidad de screen readers.
                      Se vincula via aria-labelledby del Content. */}
                  <Drawer.Title className="sr-only">
                    Asignar invitado a Mesa {mesa.numero}, Silla {openSilla}
                  </Drawer.Title>
                  <Drawer.Description className="sr-only">
                    Lista de invitados pagados sin mesa asignada. Toca uno para
                    asignarlo a esta silla.
                  </Drawer.Description>
                  <div className="p-4 overflow-y-auto flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h2
                        id={`mesa-drawer-title-${mesa.id}-${openSilla}`}
                        className="font-display text-xl text-cream flex items-center gap-2"
                      >
                        <UserCheck className="h-6 w-6 text-ember-bright" /> Mesa{" "}
                        {mesa.numero} · Silla {openSilla}
                      </h2>
                      <Button
                        size="sm"
                        variant="ghost"
                        type="button"
                        onClick={() => setOpenSilla(null)}
                        className="h-11 w-11 p-0"
                        aria-label="Cerrar"
                      >
                        <X className="h-6 w-6" />
                      </Button>
                    </div>
                    {invitadosSinMesa.length === 0 ? (
                      <p className="text-ash text-lg">
                        No quedan invitados pagados sin silla.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {invitadosSinMesa.map((inv) => (
                          <li key={inv.id}>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => onAsignar(inv.id)}
                              className="w-full text-left p-3 rounded-md border border-taller-iron bg-taller-steel/30 hover:border-ember-bright active:scale-[0.98] disabled:opacity-50 transition-transform min-h-[56px]"
                            >
                              <p className="text-bone font-subhead text-lg truncate">
                                #{inv.numero} · {inv.nombreCompleto}
                              </p>
                              <p className="text-ash text-base font-mono truncate">
                                {formatLocal(inv.telefono)} ·{" "}
                                {inv.reserva.user.nombreCompleto}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Drawer.Content>
              </Drawer.Portal>
            </Drawer.Root>
          </div>

          <div
            ref={modalRef}
            className="hidden sm:flex fixed inset-0 z-50 bg-black/80 items-center justify-center p-4 animate-modal-overlay"
            onClick={() => setOpenSilla(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`mesa-modal-title-${mesa.id}-${openSilla}`}
          >
            <div
              className="bg-taller-night border border-taller-iron rounded-lg p-4 w-full max-w-md max-h-[80vh] overflow-y-auto flex flex-col animate-modal-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h2
                  id={`mesa-modal-title-${mesa.id}-${openSilla}`}
                  className="font-display text-xl md:text-2xl text-cream flex items-center gap-2"
                >
                  <UserCheck className="h-6 w-6 text-ember-bright" /> Mesa{" "}
                  {mesa.numero} · Silla {openSilla}
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => setOpenSilla(null)}
                  className="h-9 w-9 p-0"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {invitadosSinMesa.length === 0 ? (
                <p className="text-ash text-lg">
                  No quedan invitados pagados sin silla.
                </p>
              ) : (
                <ul className="space-y-1.5 overflow-y-auto flex-1 -mx-1 px-1">
                  {invitadosSinMesa.map((inv) => (
                    <li key={inv.id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onAsignar(inv.id)}
                        className="w-full text-left p-2 rounded-md border border-taller-iron bg-taller-steel/30 hover:border-ember-bright active:scale-[0.98] disabled:opacity-50 transition-transform"
                      >
                        <p className="text-bone font-subhead text-lg truncate">
                          #{inv.numero} · {inv.nombreCompleto}
                        </p>
                        <p className="text-ash text-base font-mono truncate">
                          {formatLocal(inv.telefono)} ·{" "}
                          {inv.reserva.user.nombreCompleto}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


