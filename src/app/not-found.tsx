import Link from "next/link";
import { Wrench } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col font-body bg-taller-night">
      <main className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md text-center">
          <Wrench className="h-16 w-16 text-ember-rust mx-auto mb-6" strokeWidth={2.5} />
          <h1 className="font-display text-4xl text-cream mb-2">404</h1>
          <p className="text-ash text-lg mb-8">Esta página no está en el manual.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-subhead text-base uppercase tracking-widest text-ember-bright hover:text-signal-green transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
