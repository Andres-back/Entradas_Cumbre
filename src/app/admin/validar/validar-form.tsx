"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  validarCodigo,
  confirmarIngreso,
} from "../actions";
import type { ValidarResult, ValidarEstado } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { RpmLoader } from "@/components/brand/RpmLoader";
import { QrScanner } from "@/components/brand/QrScanner";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Check,
  Users,
  Clock,
  Armchair,
  Camera,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  codigo: z
    .string()
    .min(1, "Ingresa un código")
    .regex(/^BC-[A-Z2-9]{8}$/, "Formato: BC-XXXXXXXX"),
});

type FormValues = z.infer<typeof formSchema>;

const estadoConfig: Record<
  ValidarEstado,
  {
    border: string;
    bg: string;
    text: string;
    icon: typeof CheckCircle2;
    label: string;
  }
> = {
  ok: {
    border: "border-signal-green",
    bg: "bg-signal-green/10",
    text: "text-signal-green",
    icon: CheckCircle2,
    label: "VALIDO",
  },
  completo: {
    border: "border-signal-rust",
    bg: "bg-signal-rust/15",
    text: "text-signal-rust",
    icon: XCircle,
    label: "CÓDIGO YA ESCANEADO",
  },
  cancelado: {
    border: "border-signal-rust",
    bg: "bg-signal-rust/10",
    text: "text-signal-rust",
    icon: XCircle,
    label: "CANCELADO",
  },
  no_pagado: {
    border: "border-ember-rust",
    bg: "bg-ember-rust/10",
    text: "text-ember-rust",
    icon: AlertTriangle,
    label: "PAGO PENDIENTE",
  },
  no_encontrado: {
    border: "border-signal-rust",
    bg: "bg-signal-rust/10",
    text: "text-signal-rust",
    icon: XCircle,
    label: "NO ENCONTRADO",
  },
};

function formatLocal(telefono: string): string {
  const digits = (telefono ?? "").replace(/\D/g, "");
  if (digits.length < 10) return telefono;
  const d = digits.slice(-10);
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export function ValidarForm() {
  const [result, setResult] = useState<ValidarResult | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "ok" | "error";
    message: string;
  } | null>(null);
  const [count, setCount] = useState<{
    ingresados: number;
    total: number;
  } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    setFocus,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (result) {
      reset();
      setFocus("codigo");
    }
  }, [result, reset, setFocus]);

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      setFeedback(null);
      const fd = new FormData();
      fd.set("codigo", data.codigo);
      const res = await validarCodigo(null, fd);
      setResult(res);
    });
  };

  const handleScan = async (text: string) => {
    setScannerOpen(false);
    setFeedback(null);
    const trimmed = text.trim().toUpperCase().replace(/\s+/g, "");
    await new Promise((r) => setTimeout(r, 0));
    setValue("codigo", trimmed);
    const fd = new FormData();
    fd.set("codigo", trimmed);
    setResult(null);
    startTransition(async () => {
      setFeedback(null);
      const res = await validarCodigo(null, fd);
      setResult(res);
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-taller-night border-2 border-ember-bright rounded-lg p-3 md:p-4 shadow-ember"
      >
        <label
          htmlFor="codigo"
          className="block text-ash text-sm md:text-base uppercase tracking-widest font-subhead mb-1.5"
        >
          Código de entrada
        </label>
        <div className="flex gap-2">
          <input
            {...register("codigo")}
            id="codigo"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="BC-XXXXXXXX"
            className="flex-1 min-w-0 h-20 md:h-16 px-3 md:px-4 rounded-md border-2 border-taller-iron bg-taller-shadow font-mono text-3xl md:text-2xl tracking-widest text-ember-bright uppercase placeholder:text-ash/40 focus:border-ember-bright focus:outline-none"
            style={{ fontFamily: "var(--font-special-elite), monospace" }}
            ref={(e) => {
              register("codigo").ref(e);
              (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
            }}
          />
          <ScanButton onClick={() => setScannerOpen(true)} />
          <SubmitButton isPending={isPending} />
        </div>
        <p className="text-ash text-sm md:text-base mt-1.5 flex items-center gap-1">
          <Search className="h-4 w-4" /> Enter para validar · o{" "}
          <Camera className="h-4 w-4" /> escanea QR
        </p>
      </form>

      <QrScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
      />

      {result && result.estado !== "no_encontrado" && result.reserva && result.invitado && (
        <div key={result.codigo ?? "result"} className="animate-page-in">
          <ResultadoCard
            result={result}
            onConfirmar={async (res) => {
              const r = await res;
              if (!r.success || r.error) {
                setFeedback({
                  type: "error",
                  message: r.error ?? "Error desconocido",
                });
              } else {
                setFeedback({ type: "ok", message: r.message ?? "OK" });
                if (r.reserva) {
                  setCount({
                    ingresados: r.reserva.cantidadIngresados,
                    total: r.reserva.cantidadAsistentes,
                  });
                }
              }
            }}
          />
        </div>
      )}

      {result && result.estado === "no_encontrado" && (
        <div
          key={result.codigo ?? "nf"}
          className="rounded-lg border-2 border-signal-rust bg-signal-rust/10 p-4 text-center animate-shake-short"
        >
          <XCircle className="h-12 w-12 text-signal-rust mx-auto mb-2" />
          <p className="font-display text-xl text-signal-rust">NO ENCONTRADO</p>
          <p className="text-bone text-lg mt-2">{result.mensaje}</p>
          {result.codigo && (
            <p className="font-mono text-ash text-base mt-2 tracking-widest">
              {result.codigo}
            </p>
          )}
        </div>
      )}

      {feedback && (
        <div
          className={cn(
            "rounded-md border-2 p-3 text-lg font-subhead text-center",
            feedback.type === "ok"
              ? "border-signal-green bg-signal-green/10 text-signal-green"
              : "border-signal-rust bg-signal-rust/10 text-signal-rust"
          )}
        >
          {feedback.message}
        </div>
      )}

      {count && (
        <div
          key={`${count.ingresados}-${count.total}`}
          className="rounded-md border border-taller-iron bg-taller-steel/50 p-3 text-center animate-counter-tick"
        >
          <p className="text-ash text-base uppercase tracking-widest font-subhead flex items-center justify-center gap-2">
            <Users className="h-4 w-4" /> Entradas hoy
          </p>
          <p className="font-display text-2xl text-ember-bright mt-1">
            {count.ingresados}
            <span className="text-ash text-lg"> / {count.total}</span>
          </p>
        </div>
      )}
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
      className="h-20 md:h-16 px-4 md:px-5 shrink-0"
    >
      {isPending ? <RpmLoader /> : <Search className="h-6 w-6 md:h-6 md:w-6" />}
    </Button>
  );
}

function ScanButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      onClick={onClick}
      className="h-20 md:h-16 px-4 md:px-5 shrink-0"
      title="Escanear QR"
      aria-label="Escanear QR"
    >
      <Camera className="h-6 w-6" />
    </Button>
  );
}

function ResultadoCard({
  result,
  onConfirmar,
}: {
  result: ValidarResult;
  onConfirmar: (
    res: Promise<Awaited<ReturnType<typeof confirmarIngreso>>>
  ) => void;
}) {
  const config = estadoConfig[result.estado];
  const Icon = config.icon;
  const reserva = result.reserva!;
  const invitado = result.invitado!;
  const canConfirmar = result.estado === "ok";

  return (
    <div
      className={cn(
        "rounded-lg border-2 p-3 md:p-5",
        config.border,
        config.bg,
        result.estado === "ok" && "animate-validado-glow"
      )}
    >
      <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
        <Icon className={cn("h-9 w-9 md:h-10 md:w-10 shrink-0", config.text)} />
        <div className="min-w-0">
          <p
            className={cn(
              "font-display text-lg md:text-2xl leading-tight",
              config.text
            )}
          >
            {config.label}
          </p>
          <p className="font-mono text-ash text-base md:text-lg tracking-widest truncate">
            {result.codigo}
          </p>
        </div>
      </div>

      <div className="border-t border-taller-iron/50 pt-2.5 md:pt-3 mt-2.5 md:mt-3 space-y-2.5 md:space-y-3">
        <div>
          <p className="font-subhead text-cream text-xl md:text-2xl truncate">
            {invitado.nombreCompleto}
          </p>
          <p className="text-ash text-base font-mono flex items-center gap-1 mt-0.5">
            <Phone className="h-4 w-4" /> {formatLocal(invitado.telefono)}
          </p>
        </div>

        {invitado.mesaNumero && invitado.silla && (
          <p className="text-ember-bright font-subhead uppercase tracking-widest text-base md:text-lg flex items-center gap-2">
            <Armchair className="h-5 w-5" /> Mesa {invitado.mesaNumero} · Silla{" "}
            {invitado.silla}
          </p>
        )}

        <div className="flex items-baseline justify-between gap-2 text-lg">
          <p className="text-ash text-sm md:text-base uppercase tracking-widest font-subhead">
            Progreso del grupo
          </p>
          <p className="text-ember-bright font-display text-xl md:text-2xl shrink-0">
            {reserva.cantidadIngresados}
            <span className="text-ash text-lg">
              {" "}
              / {reserva.cantidadAsistentes}
            </span>
          </p>
        </div>

        {reserva.invitados.length > 0 && (
          <div className="pt-2.5 md:pt-3 border-t border-taller-iron/30">
          <p className="text-ash text-sm md:text-base uppercase tracking-widest font-subhead mb-1.5 flex items-center gap-1">
            <Check className="h-4 w-4" /> Grupo completo
            </p>
            <ul className="space-y-1 stagger-children">
              {reserva.invitados.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center justify-between gap-2 text-lg"
                  >
                  <span
                    className={cn(
                      "flex items-center gap-1.5 md:gap-2 min-w-0",
                      i.estado === "ASISTIO" ? "text-bone" : "text-ash"
                    )}
                  >
                    <span
                      className={cn(
                        "font-display shrink-0 text-base",
                        i.estado === "ASISTIO"
                          ? "text-signal-green"
                          : "text-ash"
                      )}
                    >
                      {String(i.numero).padStart(2, "0")}
                    </span>
                    <span className="truncate text-base md:text-lg">
                      {i.nombreCompleto}
                    </span>
                    {i.mesaNumero && i.silla && (
                      <span className="text-ash text-sm shrink-0">
                        M{i.mesaNumero}·S{i.silla}
                      </span>
                    )}
                  </span>
                  {i.registradoEn && (
                    <span className="text-ash text-sm shrink-0 flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(i.registradoEn).toLocaleTimeString("es-CO", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="text-bone text-lg mt-2.5 md:mt-3">{result.mensaje}</p>

      {canConfirmar && (
        <ConfirmarEntradaButton
          invitadoId={invitado.id}
          nombrePersona={invitado.nombreCompleto}
          onConfirm={onConfirmar}
        />
      )}
    </div>
  );
}

function ConfirmarEntradaButton({
  invitadoId,
  nombrePersona,
  onConfirm,
}: {
  invitadoId: string;
  nombrePersona: string;
  onConfirm: (
    res: Promise<Awaited<ReturnType<typeof confirmarIngreso>>>
  ) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-3 md:mt-4">
      <Button
        type="button"
        variant="primary"
        size="lg"
        disabled={pending}
        className="w-full h-14 md:h-12"
        onClick={() => {
          startTransition(() => {
            onConfirm(confirmarIngreso(invitadoId));
          });
        }}
      >
        {pending ? (
          <>
            <RpmLoader />
            Marcando...
          </>
        ) : (
          <>
            <Check className="h-5 w-5" />
            Dejar entrar a {nombrePersona.split(" ")[0]}
          </>
        )}
      </Button>
    </div>
  );
}
