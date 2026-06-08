import {
  Utensils,
  Users,
  Wrench,
  Heart,
  DoorOpen,
  Banknote,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { HeroReveal } from "@/components/hero/HeroReveal";
import { getConfiguracion, toValidDate } from "@/lib/constants";

const queEsperar: Array<{
  icon: LucideIcon;
  title: string;
  desc: string;
}> = [
  {
    icon: Heart,
    title: "Conversaciones reales",
    desc: "Sin máscaras, sin filtros. Hablamos de lo que callamos como hombres: dudas, miedos, fracasos, éxito.",
  },
  {
    icon: Users,
    title: "Espacio entre hermanos",
    desc: "Cena incluida. Nos sentamos, comemos y hablamos. Sin formalidades.",
  },
  {
    icon: Wrench,
    title: "Coordinado por Fredy",
    desc: "Fredy de la Iglesia Cruzada lidera la noche. Tú solo llegas y abres el capó.",
  },
];

// Genera metadata dinamica basada en la configuracion de la BD.
// Asi el <title> y <description> reflejan siempre la fecha y datos reales.
export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getConfiguracion();
  const fecha = toValidDate(cfg.fecha, new Date("2026-06-20T18:00:00-05:00"));
  const fechaCorta = new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(fecha);
  const hora = new Intl.DateTimeFormat("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(fecha);
  return {
    title: `${cfg.nombre} | ${fechaCorta} · ${hora}`,
    description: `Una charla entre hombres para hablar de lo que callamos. ${fechaCorta}, ${hora}, ${cfg.lugar}${cfg.barrio ? `, ${cfg.barrio}` : ""}. Cena incluida.`,
  };
}

export default async function Home() {
  const session = await auth();
  const cfg = await getConfiguracion();

  // Determinar CTA: registrarse, reservar, o ver reserva existente
  let ctaHref = "/registro";
  if (session?.user) {
    const reserva = await prisma.reserva.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    ctaHref = reserva ? "/mi-reserva" : "/reservar";
  }

  // Re-hidratar fecha por si unstable_cache la serializo a string.
  const fecha = toValidDate(cfg.fecha, new Date("2026-06-20T18:00:00-05:00"));
  const precioFmt = new Intl.NumberFormat("es-CO").format(cfg.precioPorPersona);

  // Construir datos para el info strip. Si hay hora de puertas definida, mostrarla;
  // si no, mostrar solo Cena + Valor.
  const datos: Array<{ icon: LucideIcon; label: string; value: string }> = [
    { icon: Utensils, label: "Cena", value: "Incluida" },
  ];
  if (cfg.puertas) {
    datos.push({ icon: DoorOpen, label: "Puertas", value: cfg.puertas });
  }
  datos.push({
    icon: Banknote,
    label: "Valor",
    value: `$${precioFmt} COP`,
  });

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero full-bleed con foto de fondo + contenido editorial */}
        <HeroReveal ctaHref={ctaHref} />

        {/* Info strip horizontal: un solo renglon, sin cajas.
            El hero ya mostró cuándo y dónde. Aquí: logística y costo.
            Mobile: items centrados, icono + label + value en línea.
            Desktop: row con divide-x entre items. */}
        <section className="py-8 sm:py-14 md:py-16 px-5 sm:px-6 border-b border-taller-iron/40">
          <div className="container mx-auto max-w-5xl">
            <p className="font-subhead text-[11px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.3em] text-ember-bright text-center mb-5 sm:mb-8">
              Lo que hay que saber
            </p>
            <ul className="flex flex-col sm:grid sm:grid-cols-3 items-stretch sm:items-center justify-center gap-3 sm:gap-6 md:gap-0 stagger-children">
              {datos.map((d, i) => (
                <li
                  key={d.label}
                  className={`flex items-center justify-center sm:justify-center gap-2.5 sm:gap-4 ${
                    i > 0
                      ? "sm:border-l sm:border-taller-iron/50 sm:pl-6"
                      : ""
                  } ${i === 0 ? "sm:pr-6" : ""} py-2 sm:py-0`}
                >
                  <d.icon
                    className="h-5 w-5 sm:h-5 sm:w-5 text-ember-bright shrink-0"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <div className="flex flex-col">
                    <span className="font-subhead text-[10px] sm:text-[10px] md:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] text-ash leading-tight">
                      {d.label}
                    </span>
                    <span className="font-display text-base sm:text-base text-cream md:text-lg leading-tight mt-0.5">
                      {d.value}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Qué esperar: lista vertical editorial (sin cajas).
            Números 01/02/03 a la izquierda, texto a la derecha.
            Estilo revista, no grid de cards. */}
        <section className="py-10 sm:py-20 md:py-24 px-5 sm:px-6">
          <div className="container mx-auto max-w-3xl">
            <div className="text-center mb-8 sm:mb-14">
              <p className="font-subhead text-[11px] sm:text-xs uppercase tracking-[0.22em] sm:tracking-[0.3em] text-ember-bright">
                El taller
              </p>
              <h2 className="font-display text-2xl sm:text-3xl md:text-5xl text-cream mt-2 sm:mt-3 text-balance">
                Qu&eacute; esperar
              </h2>
              <p className="text-bone mt-3 sm:mt-4 max-w-xl mx-auto leading-relaxed text-sm sm:text-base text-balance">
                No es un culto. No es una conferencia. Es un taller entre
                hombres para abrir el cap&oacute; y ver qu&eacute; hay debajo.
              </p>
            </div>
            <ol className="space-y-6 sm:space-y-10 md:space-y-12 stagger-children">
              {queEsperar.map((q, i) => {
                const Icon = q.icon;
                return (
                  <li
                    key={q.title}
                    className="flex items-start gap-4 sm:gap-6 md:gap-8"
                  >
                    <span
                      aria-hidden
                      className="font-display text-4xl sm:text-5xl md:text-6xl text-ember-rust/30 leading-none shrink-0 select-none w-10 sm:w-16 md:w-20"
                    >
                      0{i + 1}
                    </span>
                    <div className="flex-1 min-w-0 pt-0.5 sm:pt-1">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Icon
                          className="h-5 w-5 sm:h-6 sm:w-6 text-ember-bright shrink-0"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <h3 className="font-display text-lg sm:text-xl md:text-2xl text-cream leading-tight">
                          {q.title}
                        </h3>
                      </div>
                      <p className="text-bone mt-2 sm:mt-3 leading-relaxed text-sm sm:text-sm md:text-base">
                        {q.desc}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Rust divider */}
        <div className="container mx-auto max-w-3xl px-5 sm:px-6">
          <div className="rust-divider" />
        </div>

        {/* Versículo: editorial, con drop-cap dramático y comillas decorativas */}
        <section className="py-12 sm:py-20 md:py-28 px-5 sm:px-6">
          <div className="container mx-auto max-w-3xl">
            <p className="mb-6 sm:mb-8 font-subhead text-[11px] sm:text-xs uppercase tracking-[0.22em] sm:tracking-[0.3em] text-ember-bright text-center">
              Versículo ancla
            </p>

            {/* Comilla decorativa superior */}
            <div className="text-center mb-4 sm:mb-6">
              <span
                className="font-display text-5xl sm:text-6xl md:text-7xl text-ember-rust/20 leading-none select-none"
                aria-hidden
              >
                &ldquo;
              </span>
            </div>

            <blockquote className="font-body text-xl sm:text-2xl md:text-3xl lg:text-4xl italic leading-relaxed sm:leading-loose text-cream text-left text-balance">
              <span className="font-display text-[56px] sm:text-7xl md:text-8xl text-ember-rust float-left mr-2 sm:mr-3 leading-[0.8] mt-1 sm:mt-2 select-none">
                L
              </span>
              a gente se fija en las apariencias, pero yo me fijo en el{" "}
              <span className="font-semibold not-italic text-ember-bright relative inline-block">
                coraz&oacute;n
                <span
                  className="absolute -bottom-1 left-0 right-0 h-0.5 bg-ember-rust/40"
                  aria-hidden
                />
              </span>
              .
            </blockquote>

            <p className="mt-6 sm:mt-8 font-subhead text-[11px] sm:text-sm uppercase tracking-[0.22em] sm:tracking-[0.3em] text-ash text-center">
              &mdash; 1 Samuel 16:7
            </p>
          </div>
        </section>

        {/* Tagline bar */}
        <footer className="border-t border-ember-rust/40 bg-ember-rust/10 py-5 sm:py-8 px-5 sm:px-6">
          <div className="container mx-auto max-w-6xl text-center">
            <p className="font-subhead text-[13px] sm:text-lg uppercase tracking-[0.18em] sm:tracking-[0.3em] text-ember-bright md:text-xl leading-relaxed">
              Hombres reales. Conversaciones reales. Vida real.
            </p>
            <p className="mt-2.5 sm:mt-4 text-[11px] sm:text-sm text-ash">
              &copy; 2026 Iglesia Cruzada Cristiana Fuente de Agua Viva
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
