import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowDown,
  CalendarDays,
  CheckCircle2,
  HeartHandshake,
  Leaf,
  MapPin,
  Sprout,
  UsersRound,
  Wallet,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { buttonVariants } from "@/components/ui/button";
import { HomeAnimations } from "@/components/home/HomeAnimations";
import { EVENT_CONFIG, EVENT_JSON_LD } from "@/config/event";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Cumbre Impacto Putumayo 2026 | Mocoa",
    description:
      "Cumbre Impacto Putumayo 2026. Sembrando y cosechando juntos. 10 y 11 de julio de 2026 en Mocoa, Putumayo. Aporte de inscripción: $45.000 COP, incluye materiales y alimentación.",
    applicationName: EVENT_CONFIG.name,
    metadataBase: new URL(process.env.PUBLIC_APP_URL ?? "http://localhost:3000"),
    alternates: { canonical: "/" },
    openGraph: {
      title: "Cumbre Impacto Putumayo 2026 | Mocoa",
      description:
        "Sembrando y cosechando juntos. 10 y 11 de julio de 2026 en Mocoa, Putumayo.",
      siteName: EVENT_CONFIG.name,
      locale: "es_CO",
      type: "website",
      images: [
        {
          url: EVENT_CONFIG.wallpaper,
          width: 1200,
          height: 630,
          alt: "Imagen oficial de Cumbre Impacto Putumayo 2026",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Cumbre Impacto Putumayo 2026 | Mocoa",
      description:
        "Sembrando y cosechando juntos. Aporte de inscripción: $45.000 COP.",
      images: [EVENT_CONFIG.wallpaper],
    },
    robots: { index: true, follow: true },
  };
}

const quickInfo = [
  { label: "Fecha", value: EVENT_CONFIG.displayDate, icon: CalendarDays },
  { label: "Lugar", value: "Iglesia Fuente de Agua Viva", icon: MapPin },
  { label: "Ciudad", value: EVENT_CONFIG.city, icon: UsersRound },
  { label: "Aporte", value: EVENT_CONFIG.registrationContributionDisplay, icon: Wallet },
  { label: "Incluye", value: "Materiales y alimentación", icon: CheckCircle2 },
];

const pillars = [
  {
    kicker: "01 — Encuentro",
    title: "Una comunidad unida",
    desc: "Un espacio para encontrarnos, compartir experiencias y fortalecer relaciones que generen impacto.",
    icon: UsersRound,
  },
  {
    kicker: "02 — Crecimiento",
    title: "Sembrar para crecer",
    desc: "Momentos orientados a fortalecer la fe, el propósito y el compromiso con nuestra comunidad.",
    icon: Sprout,
  },
  {
    kicker: "03 — Impacto",
    title: "Cosechar juntos",
    desc: "Una invitación a convertir lo aprendido en acciones que produzcan transformación.",
    icon: HeartHandshake,
  },
];

export default async function Home() {
  const session = await auth();
  let ctaHref = "/registro?next=/reservar";

  if (session?.user) {
    const reserva = await prisma.reserva.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    ctaHref = reserva ? "/mi-reserva" : "/reservar";
  }

  return (
    <>
      <SiteHeader ctaHref={ctaHref} />
      <main id="main-content" className="flex-1 overflow-hidden">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(EVENT_JSON_LD) }}
        />

        <section
          id="inicio"
          className="relative min-h-[100svh] overflow-hidden bg-taller-night"
          aria-label="Inicio"
        >
          <div
            data-anim-hero-image
            className="absolute inset-0 bg-cover bg-center md:bg-[position:center_42%] will-change-transform"
            style={{ backgroundImage: `url(${EVENT_CONFIG.wallpaper})` }}
            role="img"
            aria-label="Imagen oficial de Cumbre Impacto Putumayo 2026"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,23,42,0.94)_0%,rgba(3,23,42,0.78)_36%,rgba(3,23,42,0.36)_68%,rgba(3,23,42,0.16)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_45%,rgba(52,213,255,0.22),transparent_34%),linear-gradient(180deg,rgba(3,23,42,0.2),#03172a_96%)]" />

          <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-5 pb-20 pt-28 sm:px-8 lg:px-10">
            <div className="max-w-2xl">
              <p
                data-anim-hero-kicker
                className="font-subhead text-xs uppercase tracking-[0.35em] text-ember-bright sm:text-sm"
              >
                Edición 2026
              </p>
              <h1
                data-anim-hero-title
                className="mt-5 font-display text-[clamp(3.75rem,13vw,8.75rem)] leading-[0.88] text-cream text-balance"
              >
                Cumbre
                <span className="block text-ember-bright">Impacto</span>
              </h1>
              <p
                data-anim-hero-subtitle
                className="mt-4 font-subhead text-lg uppercase tracking-[0.28em] text-cumbre-mist sm:text-2xl"
              >
                {EVENT_CONFIG.slogan}
              </p>
              <p
                data-anim-hero-body
                className="mt-5 max-w-xl text-base leading-8 text-cumbre-mist sm:text-lg"
              >
                Un encuentro para crecer, compartir y sembrar juntos una
                transformación que impacte nuestra región.
              </p>
              <div
                data-anim-hero-chips
                className="mt-7 flex flex-wrap gap-3 text-sm text-cumbre-mist"
              >
                <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 backdrop-blur">
                  <CalendarDays className="h-4 w-4 text-ember-bright" />
                  {EVENT_CONFIG.displayDate}
                </span>
                <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 backdrop-blur">
                  <MapPin className="h-4 w-4 text-ember-bright" />
                  {EVENT_CONFIG.venue.replace(" Cruzada Cristiana", "")}
                </span>
              </div>
              <div
                data-anim-hero-cta
                className="mt-9 flex flex-col gap-3 sm:flex-row"
              >
                <Link
                  href={ctaHref}
                  className={cn(buttonVariants({ size: "lg" }), "min-h-14")}
                >
                  ¡Inscríbete ahora!
                </Link>
                <Link
                  href="#la-cumbre"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "min-h-14"
                  )}
                >
                  Conoce la cumbre
                </Link>
              </div>
            </div>
          </div>

          <a
            href="#informacion"
            aria-label="Bajar a información rápida"
            data-anim-hero-scroll
            className="absolute bottom-7 left-1/2 z-10 hidden -translate-x-1/2 text-cumbre-mist sm:inline-flex"
          >
            <ArrowDown className="h-6 w-6" />
          </a>
        </section>

        <section
          id="informacion"
          data-anim-section
          className="border-y border-white/10 bg-taller-steel/70 px-5 py-8 backdrop-blur"
        >
          <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {quickInfo.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="glass-panel hover-lift rounded-lg p-4"
                >
                  <Icon className="mb-4 h-5 w-5 text-ember-bright" />
                  <p className="font-subhead text-xs uppercase tracking-[0.22em] text-cumbre-mist/70">
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-cream">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section
          id="la-cumbre"
          data-anim-section
          className="relative bg-taller-night px-5 py-20 sm:px-8 lg:py-28"
        >
          <div
            className="absolute inset-0 opacity-25 cumbre-topography"
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="font-subhead text-xs uppercase tracking-[0.32em] text-ember-bright">
                La Cumbre
              </p>
              <h2 className="mt-4 font-display text-4xl leading-tight text-cream sm:text-6xl text-balance">
                Una cumbre para sembrar impacto
              </h2>
            </div>
            <p className="text-lg leading-9 text-cumbre-mist sm:text-xl">
              Cumbre Impacto Putumayo 2026 es un espacio de encuentro,
              crecimiento y unidad. Dos días para compartir, fortalecer nuestra
              fe y sembrar acciones que produzcan frutos en nuestras
              comunidades.
            </p>
          </div>
        </section>

        <section
          data-anim-section
          className="bg-[#062b49] px-5 py-20 sm:px-8 lg:py-24"
        >
          <div
            data-anim-card-group
            className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3"
          >
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article
                  key={pillar.title}
                  className="glass-panel hover-lift card-shine rounded-lg p-6 shadow-card"
                >
                  <Icon className="h-8 w-8 text-ember-bright" />
                  <p className="mt-8 font-subhead text-xs uppercase tracking-[0.24em] text-cumbre-mist/70">
                    {pillar.kicker}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-cream">
                    {pillar.title}
                  </h3>
                  <p className="mt-4 leading-7 text-cumbre-mist">
                    {pillar.desc}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section
          id="aporte"
          data-anim-section
          className="bg-taller-night px-5 py-20 sm:px-8 lg:py-28"
        >
          <div className="mx-auto grid max-w-7xl gap-8 rounded-lg border border-ember-bright/25 bg-[linear-gradient(135deg,rgba(0,174,239,0.14),rgba(255,255,255,0.04))] p-6 sm:p-10 lg:grid-cols-[1fr_0.85fr] lg:items-center">
            <div>
              <p className="font-subhead text-xs uppercase tracking-[0.3em] text-ember-bright">
                Aporte de inscripción
              </p>
              <h2 className="mt-4 font-display text-5xl text-cream sm:text-7xl">
                {EVENT_CONFIG.registrationContributionDisplay}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-cumbre-mist">
                Tu aporte de inscripción incluye los materiales necesarios para
                el desarrollo del evento y la alimentación durante la Cumbre.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-taller-night/55 p-5">
              <p className="font-subhead text-xs uppercase tracking-[0.24em] text-cumbre-mist/70">
                Incluye
              </p>
              <ul className="mt-4 space-y-3 text-cream">
                {EVENT_CONFIG.registrationIncludes.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-ember-bright" /> {item}
                  </li>
                ))}
              </ul>
              <Link
                href={ctaHref}
                className={cn(buttonVariants({ size: "lg" }), "mt-7 w-full min-h-14")}
              >
                Inscríbete ahora
              </Link>
            </div>
          </div>
        </section>

        <section
          data-anim-verse
          className="relative overflow-hidden bg-[#073b5c] px-5 py-20 text-center sm:px-8 lg:py-24"
        >
          <Leaf className="animate-float-slow mx-auto h-10 w-10 text-ember-bright" />
          <p className="mt-5 font-subhead text-xs uppercase tracking-[0.3em] text-cumbre-mist/70">
            Versículo ancla
          </p>
          <h2 className="mt-3 font-display text-4xl text-cream sm:text-6xl">
            {EVENT_CONFIG.biblicalReference}
          </h2>
          <p className="mt-5 text-2xl text-cumbre-mist">
            {EVENT_CONFIG.slogan}.
          </p>
        </section>

        <section
          id="ubicacion"
          data-anim-section
          className="bg-taller-night px-5 py-20 sm:px-8 lg:py-28"
        >
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
            <div>
              <p className="font-subhead text-xs uppercase tracking-[0.3em] text-ember-bright">
                Ubicación
              </p>
              <h2 className="mt-4 font-display text-4xl text-cream sm:text-6xl">
                Nos encontramos en Mocoa
              </h2>
              <div className="mt-7 space-y-2 text-lg text-cumbre-mist">
                <p className="font-semibold text-cream">{EVENT_CONFIG.venue}</p>
                <p>{EVENT_CONFIG.addressLine1}</p>
                <p>{EVENT_CONFIG.addressLine2}</p>
                <p>{EVENT_CONFIG.city}</p>
              </div>
              {EVENT_CONFIG.mapsUrl ? (
                <a
                  href={EVENT_CONFIG.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "lg" }),
                    "mt-7"
                  )}
                >
                  Ver ubicación
                </a>
              ) : (
                <p className="mt-7 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-cumbre-mist">
                  El enlace del mapa está pendiente de configuración.
                </p>
              )}
            </div>
            <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(52,213,255,0.12),rgba(255,255,255,0.04))] p-6 text-center">
              <div>
                <MapPin className="mx-auto h-10 w-10 text-ember-bright" />
                <p className="mt-4 font-subhead uppercase tracking-[0.22em] text-cumbre-mist/70">
                  Mapa configurable
                </p>
                <p className="mt-3 text-cream">
                  {EVENT_CONFIG.address}, {EVENT_CONFIG.city}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="inscribete"
          data-anim-section
          className="bg-[#062b49] px-5 py-20 text-center sm:px-8 lg:py-24"
        >
          <h2 className="mx-auto max-w-3xl font-display text-4xl text-cream sm:text-6xl">
            Es tiempo de sembrar impacto
          </h2>
          <p className="mt-5 text-lg text-cumbre-mist">
            Sé parte de Cumbre Impacto Putumayo 2026.
          </p>
          <p className="mt-5 font-semibold text-cream">
            Aporte de inscripción:{" "}
            {EVENT_CONFIG.registrationContributionDisplay}
          </p>
          <p className="text-cumbre-mist">Incluye materiales y alimentación.</p>
          <p className="mt-2 text-sm uppercase tracking-[0.18em] text-cumbre-mist/70">
            {EVENT_CONFIG.displayDate} · {EVENT_CONFIG.city}
          </p>
          <Link
            href={ctaHref}
            className={cn(buttonVariants({ size: "lg" }), "mt-8 min-h-14")}
          >
            ¡Inscríbete!
          </Link>
        </section>

        <footer className="border-t border-white/10 bg-taller-night px-5 py-10 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 text-cumbre-mist md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-display text-2xl text-cream">
                {EVENT_CONFIG.name}
              </p>
              <p className="mt-2">{EVENT_CONFIG.slogan}</p>
              <p className="mt-4 text-sm">
                {EVENT_CONFIG.displayDate} · {EVENT_CONFIG.city}
              </p>
              <p className="text-sm">{EVENT_CONFIG.venue}</p>
              <p className="text-sm">{EVENT_CONFIG.socialHandle}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href={ctaHref} className="text-ember-bright hover:underline">
                Inscripción
              </Link>
              {EVENT_CONFIG.mapsUrl && (
                <a href={EVENT_CONFIG.mapsUrl} className="text-ember-bright hover:underline">
                  Ubicación
                </a>
              )}
              <span>© 2026</span>
            </div>
          </div>
        </footer>

        <HomeAnimations />
      </main>
    </>
  );
}
