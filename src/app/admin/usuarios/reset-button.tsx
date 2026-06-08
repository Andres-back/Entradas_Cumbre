"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { resetearContrasenaUsuario } from "../actions";
import { KeyRound, Copy, Check, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildWhatsappSimpleUrl } from "@/lib/whatsapp";

export function ResetPwdButton({
  userId,
  userName,
  userPhone,
}: {
  userId: string;
  userName: string;
  userPhone?: string;
}) {
  const [pwd, setPwd] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onReset() {
    if (
      !confirm(
        `Vas a resetear la contraseña de ${userName}. Se generará una nueva pwd temporal y el usuario deberá cambiarla al entrar. ¿Continuar?`
      )
    ) {
      return;
    }
    setError(null);
    setPwd(null);
    setCopied(false);
    startTransition(async () => {
      const result = await resetearContrasenaUsuario(userId);
      if (result.success && result.contrasenaTemporal) {
        setPwd(result.contrasenaTemporal);
        router.refresh();
      } else {
        setError(result.error ?? "Error desconocido.");
      }
    });
  }

  async function copy() {
    if (!pwd) return;
    await navigator.clipboard.writeText(pwd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (pwd) {
    return (
      <div
        className="rounded-md border border-signal-green/60 bg-signal-green/10 p-3 space-y-2 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-signal-green text-xs font-subhead uppercase tracking-widest">
          Contraseña temporal
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 font-mono text-sm text-bone bg-taller-night/60 px-2 py-1 rounded">
            {pwd}
          </code>
          <button
            type="button"
            onClick={copy}
            className="p-1.5 rounded-md text-bone hover:bg-taller-steel"
            title="Copiar"
          >
            {copied ? (
              <Check className="h-4 w-4 text-signal-green" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>

        {userPhone && (
          <a
            href={buildWhatsappSimpleUrl(
              userPhone,
              `Hola ${userName.split(" ")[0]}, te escribo de Bajo el Capo. Te restableci la contraseña. Entra a la app y segui las instrucciones para crear una nueva.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1.5 text-bone text-xs font-subhead uppercase tracking-wider",
              "bg-[#25D366] text-taller-night hover:bg-[#1EBE57] rounded-md px-3 py-1.5"
            )}
          >
            <Send className="h-3 w-3" />
            Mandar por WhatsApp
          </a>
        )}

        <button
          type="button"
          onClick={() => setPwd(null)}
          className="text-ash text-xs hover:text-bone inline-flex items-center gap-1"
        >
          <X className="h-3 w-3" /> Cerrar
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onReset}
        disabled={pending}
        title={`Resetear contraseña de ${userName}`}
      >
        <KeyRound className="h-3 w-3" />
        {pending ? "..." : "Reset pwd"}
      </Button>
      {error && <p className="text-signal-rust text-[10px]">{error}</p>}
    </div>
  );
}
