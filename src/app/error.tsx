"use client";

import { useEffect } from "react";
import { Wrench } from "lucide-react";

export default function ErrorPage({
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
    <div className="min-h-screen flex flex-col font-body bg-taller-night">
      <main className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md text-center">
          <Wrench className="h-16 w-16 text-signal-rust mx-auto mb-6" strokeWidth={2.5} />
          <h1 className="font-display text-4xl text-cream mb-2">Algo salió mal</h1>
          <p className="text-ash text-lg mb-8">Parece que el motor se paró. Intentá de nuevo.</p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 font-subhead text-base uppercase tracking-widest text-ember-bright hover:text-signal-green transition-colors bg-transparent border-none cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      </main>
    </div>
  );
}
