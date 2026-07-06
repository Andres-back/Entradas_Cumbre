import Link from "next/link";
import { Wrench, ChevronDown, Calendar, Clock, MapPin } from "lucide-react";
import { EVENT_DATE, EVENT_BARRIO } from "@/lib/constants";

/**
 * Hero con foto full-bleed (background-image CSS) y contenido superpuesto
 * a la derecha (desktop) o centrado (mobile).
 *
 * Look editorial limpio: sin cajas/placas. La marca garage vive en la
 * tipografia slab, la paleta y los remates en el aire, no en marcos.
 *
 * Animaciones 100% CSS (sin GSAP), solo fade-up con stagger.
 *
 *   t=0.0s  Section visible, foto del taller como background (position 30% center)
 *   t=0.3s  "Bienvenido a" label hace fade-up
 *   t=0.5s  "BAJO EL" + Wrench + "CAPÓ" (todo el h1) fade-up
 *   t=0.7s  Divider horizontal scaleX desde la derecha
 *   t=0.9s  Subtitulo "Lo que ningún hombre..." fade-up
 *   t=1.1s  Tagline con "hablar de lo que callamos" en cursiva fade-up
 *   t=1.3s  Info strip (fecha / hora / barrio) fade-up
 *   t=1.5s  CTA (Inscríbete) fade-up
 *   t=1.8s  Scroll indicator pulse infinite (delay inicial para no chocar con el CTA)
 */

const heroFechaCorta = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(new Date(EVENT_DATE));

function fechaCortaMovil(fecha: Date): string {
  const wd = new Intl.DateTimeFormat("es-CO", { weekday: "short" }).format(fecha);
  const day = new Intl.DateTimeFormat("es-CO", { day: "numeric" }).format(fecha);
  const month = new Intl.DateTimeFormat("es-CO", { month: "short" }).format(fecha);
  return `${wd} ${day} ${month}`;
}

const heroFechaMovil = fechaCortaMovil(new Date(EVENT_DATE));
const heroHora = new Intl.DateTimeFormat("es-CO", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
}).format(new Date(EVENT_DATE));

export function HeroReveal({ ctaHref = "/reservar" }: { ctaHref?: string }) {
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-taller-night">
      {/* Foto full-bleed con WebP responsive (mobile: 30KB, desktop: 100KB)
          y fallback PNG para navegadores sin WebP.
          Original 1.9MB optimizado con sharp-cli (1600px q=78, 800px q=75). */}
      <picture className="absolute inset-0">
        <source
          media="(max-width: 767px)"
          type="image/webp"
          srcSet="/cumbre-impacto/cumbre-impacto-wallpaper.png"
        />
        <source
          media="(min-width: 768px)"
          type="image/webp"
          srcSet="/cumbre-impacto/cumbre-impacto-wallpaper.png"
        />
        <img
          src="/cumbre-impacto/cumbre-impacto-wallpaper.png"
          alt=""
          className="h-full w-full object-cover"
          style={{ objectPosition: "30% center" }}
        />
      </picture>

      {/* Vignette: esquinas mas oscuras, centro mas claro */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(10,19,34,0.7) 100%)",
        }}
      />

      {/* Gradiente desktop: derecho oscuro para el texto, izquierdo claro para la foto */}
      <div
        aria-hidden
        className="absolute inset-0 hidden md:block bg-gradient-to-r from-transparent via-taller-night/30 to-taller-night/95"
      />

      {/* Gradiente mobile: abajo oscuro para el texto, arriba claro para la foto */}
      <div
        aria-hidden
        className="absolute inset-0 md:hidden bg-gradient-to-t from-taller-night via-taller-night/70 to-transparent"
      />

      {/* Contenido. Mobile: centrado al fondo, padding compacto, min-h 90svh.
          Desktop: alineado a la derecha, padding amplio, min-h 100svh.
          max-w-sm mx-auto en mobile para que el contenido no se estire
          demasiado en pantallas muy anchas tipo tablet pequena. */}
      <div className="relative z-10 container mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-16 md:py-32 min-h-[90svh] sm:min-h-[100svh] flex flex-col items-center justify-end md:justify-center md:items-end">
        <div className="w-full max-w-sm sm:max-w-xl mx-auto md:mx-0 flex flex-col items-center md:items-end text-center md:text-right">
          {/* Label "Bienvenido a" */}
          <p
            data-anim
            className="font-subhead text-[11px] sm:text-xs md:text-sm uppercase tracking-[0.25em] sm:tracking-[0.3em] text-ember-bright animate-fade-up-1"
          >
            Bienvenido a
          </p>

          {/* Titulo: BAJO EL + CAPO, libre, sin placa.
              Mobile: BAJO EL mas pequeno (text-2xl), CAPO en text-6xl (60px).
              Desktop: BAJO EL text-5xl, CAPO text-8xl/9xl.
              w-full en el primer span para que el flex centering funcione. */}
          <h1
            data-anim
            className="mt-3 sm:mt-4 w-full font-display leading-[0.95] tracking-wider text-balance animate-fade-up-2"
          >
            <span className="flex w-full items-center justify-center md:justify-end gap-2 sm:gap-3 text-2xl sm:text-3xl md:text-5xl text-cream">
              <Wrench
                aria-hidden
                className="h-6 w-6 sm:h-7 sm:w-7 md:h-9 md:w-9 text-ember-bright shrink-0"
                strokeWidth={2}
              />
              <span>BAJO EL</span>
            </span>
            <span className="block text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-ember-bright mt-1 md:mt-2">
              CAPÓ
            </span>
          </h1>

          {/* Divider horizontal: se abre de derecha a izquierda (origin-right) */}
          <div
            data-anim
            className="mt-5 sm:mt-6 md:mt-8 h-px w-24 sm:w-32 md:w-48 bg-ember-rust/60 origin-right animate-fade-up-divider"
          />

          {/* Subtitulo: sin caja.
              Mobile: text-[10.5px] con tracking minimo para que NO desborde.
              Desktop: text-base con tracking-[0.25em] para presencia. */}
          <p
            data-anim
            className="mt-4 sm:mt-5 md:mt-6 w-full font-subhead text-[10.5px] sm:text-xs md:text-base uppercase tracking-[0.1em] sm:tracking-[0.2em] md:tracking-[0.25em] text-bone animate-fade-up-3"
          >
            Lo que ningún hombre se atreve a decir.
          </p>

          {/* Tagline.
              Mobile: px-2 para que el texto respire de los bordes.
              max-w-md en sm+ para limitar ancho de lectura. */}
          <p
            data-anim
            className="mt-3 sm:mt-4 px-2 sm:px-0 max-w-md text-[13px] sm:text-sm md:text-base leading-relaxed text-bone animate-fade-up-4"
          >
            Un encuentro para{" "}
            <span className="italic text-ember-bright">
              hablar de lo que callamos
            </span>
            . Sin máscaras, sin filtros y sin religiosidad.
          </p>

          {/* Info strip: sin background, solo iconos + texto.
              Mobile: stack vertical, gap-2.5, tracking minimo. Desktop: row, gap-6. */}
          <div
            data-anim
            className="mt-5 sm:mt-6 md:mt-8 flex flex-col sm:flex-row items-center gap-2.5 sm:gap-6 text-ember-bright animate-fade-up-5"
          >
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span className="font-subhead text-[11px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.2em] text-cream">
                <span className="sm:hidden">{heroFechaMovil}</span>
                <span className="hidden sm:inline">{heroFechaCorta}</span>
              </span>
            </span>
            <span
              aria-hidden
              className="hidden sm:inline-block h-3 w-px bg-taller-iron/60"
            />
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span className="font-subhead text-[11px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.2em] text-cream">
                {heroHora}
              </span>
            </span>
            <span
              aria-hidden
              className="hidden sm:inline-block h-3 w-px bg-taller-iron/60"
            />
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span className="font-subhead text-[11px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.2em] text-cream">
                {EVENT_BARRIO}
              </span>
            </span>
          </div>

          {/* CTA principal: "Realiza tu inscripción".
              El acceso admin ya no se muestra aqui: el admin se loguea
              y tiene su panel en /admin. Antes habia un segundo boton
              "Acceso admin" que duplicaba el flujo de /login. */}
          <div
            data-anim
            className="mt-7 sm:mt-8 md:mt-10 flex justify-center md:justify-end w-full sm:w-auto animate-fade-up-6"
          >
            <Link
              href={ctaHref}
              className="inline-flex w-full sm:w-auto h-12 sm:h-14 items-center justify-center gap-2 rounded-md bg-ember-rust px-6 sm:px-8 font-subhead text-sm sm:text-base md:text-lg font-semibold uppercase tracking-wider text-cream shadow-plate transition-all hover:bg-ember-bright hover:shadow-ember active:scale-[0.98]"
            >
              <Wrench className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
              Sac&aacute; tu inscripción
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll indicator (desktop) */}
      <div
        aria-hidden
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-1 animate-scroll-pulse"
      >
        <p className="font-subhead text-[10px] uppercase tracking-widest text-bone/60">
          Scroll
        </p>
        <ChevronDown className="h-5 w-5 text-bone/60" />
      </div>

      <noscript>
        <style>{`
          [data-anim] { opacity: 1 !important; transform: none !important; }
          .animate-fade-up-1, .animate-fade-up-2, .animate-fade-up-3,
          .animate-fade-up-4, .animate-fade-up-5, .animate-fade-up-6,
          .animate-fade-up-7 {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        `}</style>
      </noscript>
    </section>
  );
}


