"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrScannerProps {
  open: boolean;
  onClose: () => void;
  /** Callback con el texto del QR detectado. */
  onScan: (text: string) => void;
}

/**
 * Modal con scanner QR de camara.
 * Usa html5-qrcode para acceder a la camara del celular/PC y decodificar QRs.
 * Pensado para Fredy en la puerta: escanea el QR del PNG del ticket,
 * autocompleta el input del validador y dispara la validacion.
 */
export function QrScanner({ open, onClose, onScan }: QrScannerProps) {
  const containerId = "qr-scanner-container";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onScan, onClose]);

  useEffect(() => {
    if (!open) return;

    let stopped = false;
    let scanner: Html5Qrcode | null = null;

    const start = async () => {
      setStarting(true);
      setError(null);
      try {
        scanner = new Html5Qrcode(containerId, {
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (vw, vh) => {
              const minEdge = Math.min(vw, vh);
              const size = Math.floor(minEdge * 0.7);
              return { width: size, height: size };
            },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (stopped) return;
            stopped = true;
            onScanRef.current(decodedText.trim().toUpperCase());
            void stop();
            onCloseRef.current();
          },
          () => {
            // ignore per-frame errors
          }
        );
        if (!stopped) setStarting(false);
      } catch (err) {
        if (stopped) return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo acceder a la cámara."
        );
        setStarting(false);
      }
    };

    const stop = async () => {
      try {
        if (scannerRef.current) {
          await scannerRef.current.stop();
          await scannerRef.current.clear();
          scannerRef.current = null;
        }
      } catch {
        // best effort
      }
    };

    void start();

    return () => {
      stopped = true;
      void stop();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-taller-night/95 flex items-stretch sm:items-center justify-center sm:p-4 animate-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Lector QR"
    >
      <div className="w-full sm:max-w-md bg-taller-steel border-0 sm:border-2 border-ember-bright sm:rounded-lg p-3 sm:p-4 shadow-ember flex flex-col sm:block animate-modal-panel">
        <div className="flex items-center justify-between mb-2 sm:mb-3 shrink-0">
          <p className="font-subhead text-ash text-[10px] sm:text-xs uppercase tracking-widest flex items-center gap-2">
            <Camera className="h-4 w-4" /> Lector QR
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Cerrar lector"
            className="h-11 w-11 sm:h-9 sm:w-9 p-0"
          >
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
          </Button>
        </div>

        <div className="relative">
          <div
            id={containerId}
            className="w-full aspect-square bg-taller-night rounded-md overflow-hidden border border-taller-iron shrink-0"
          />
          {/* Scan-line decorativa: NO bloquea deteccion (pointer-events-none) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-md overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-ember-bright to-transparent shadow-[0_0_12px_rgba(232,154,60,0.6)] animate-scan-line" />
          </div>
        </div>

        <div className="flex-1 sm:hidden" />

        {starting && (
          <p className="text-ash text-xs text-center mt-2 sm:mt-3 font-subhead uppercase tracking-widest">
            Iniciando cámara...
          </p>
        )}

        {error && (
          <div className="mt-2 sm:mt-3 p-3 rounded-md border-2 border-signal-rust bg-signal-rust/10 text-center">
            <p className="text-signal-rust text-sm font-subhead">
              Error de cámara
            </p>
            <p className="text-bone text-xs mt-1">{error}</p>
            <p className="text-ash text-xs mt-2">
              Verifica los permisos de cámara en tu navegador, o usa el input
              de texto abajo.
            </p>
          </div>
        )}

        <p className="text-ash text-xs text-center mt-2 sm:mt-3">
          Apunta al QR del ticket. Se validará automáticamente.
        </p>
      </div>
    </div>
  );
}
