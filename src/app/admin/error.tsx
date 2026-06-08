"use client";

import { useEffect } from "react";
import { Wrench } from "lucide-react";

export default function AdminErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center py-20 px-4">
      <div className="w-full max-w-md text-center">
        <Wrench className="h-12 w-12 text-signal-rust mx-auto mb-4" strokeWidth={2.5} />
        <h2 className="font-display text-2xl text-cream mb-2">Error del panel</h2>
        <p className="text-ash text-base mb-6">No se pudo cargar esta sección. Intentá de nuevo.</p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 font-subhead text-sm uppercase tracking-widest text-ember-bright hover:text-signal-green transition-colors bg-transparent border-none cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
