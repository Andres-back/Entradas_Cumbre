"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogIn, Menu, User as UserIcon, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EVENT_CONFIG } from "@/config/event";

const links = [
  { href: "/#inicio", label: "Inicio" },
  { href: "/#la-cumbre", label: "La Cumbre" },
  { href: "/#informacion", label: "Información" },
  { href: "/#aporte", label: "Aporte" },
  { href: "/#ubicacion", label: "Ubicación" },
];

export function SiteHeaderClient({
  ctaHref,
  isLoggedIn,
  isAdmin,
}: {
  ctaHref: string;
  isLoggedIn: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="fixed top-0 z-40 w-full border-b border-white/10 bg-taller-night/72 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label={`Inicio · ${EVENT_CONFIG.shortName}`} className="flex min-h-11 items-center">
          <Logo size="sm" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-md px-3 py-2 font-subhead text-xs uppercase tracking-[0.18em] text-cumbre-mist hover:bg-white/8 hover:text-cream">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          {isLoggedIn && (
            <Link href="/mi-reserva" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-11")}>
              <UserIcon className="h-4 w-4" /> Mi inscripción
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "min-h-11")}>Panel</Link>
          )}
          {!isLoggedIn && (
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-11")}>
              <LogIn className="h-4 w-4" /> Entrar
            </Link>
          )}
          <Link href={ctaHref} className={cn(buttonVariants({ size: "sm" }), "min-h-11")}>Inscríbete</Link>
        </div>

        <button
          ref={buttonRef}
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-white/10 text-cumbre-mist sm:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-white/10 bg-taller-night/96 px-4 py-4 sm:hidden">
          <nav className="flex flex-col gap-1" aria-label="Navegación móvil">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="min-h-11 rounded-md px-3 py-3 font-subhead text-sm uppercase tracking-[0.18em] text-cumbre-mist hover:bg-white/8">
                {link.label}
              </Link>
            ))}
            {isLoggedIn && <Link href="/mi-reserva" onClick={() => setOpen(false)} className="min-h-11 rounded-md px-3 py-3 font-subhead text-sm uppercase tracking-[0.18em] text-cumbre-mist hover:bg-white/8">Mi inscripción</Link>}
            {isAdmin && <Link href="/admin" onClick={() => setOpen(false)} className="min-h-11 rounded-md px-3 py-3 font-subhead text-sm uppercase tracking-[0.18em] text-cumbre-mist hover:bg-white/8">Panel</Link>}
            {!isLoggedIn && <Link href="/login" onClick={() => setOpen(false)} className="min-h-11 rounded-md px-3 py-3 font-subhead text-sm uppercase tracking-[0.18em] text-cumbre-mist hover:bg-white/8">Entrar</Link>}
            <Link href={ctaHref} onClick={() => setOpen(false)} className={cn(buttonVariants({ size: "lg" }), "mt-2 min-h-12 w-full")}>¡Inscríbete!</Link>
          </nav>
        </div>
      )}
    </header>
  );
}


