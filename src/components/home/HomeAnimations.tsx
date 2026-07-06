"use client";

import { useEffect } from "react";
import { animate, stagger, splitText, createTimeline, onScroll } from "animejs";

/**
 * Animaciones de la página de inicio con anime.js v4.
 *
 * Selecciona por data-anim-* (ver page.tsx):
 *   - [data-anim-hero-kicker]    : etiqueta superior (fade + slide)
 *   - [data-anim-hero-title]     : titulo principal, stagger por letra
 *   - [data-anim-hero-subtitle]  : subtitulo
 *   - [data-anim-hero-body]      : parrafo descriptivo
 *   - [data-anim-hero-chips]     : contenedor de chips de fecha/lugar
 *   - [data-anim-hero-cta]       : contenedor de botones CTA
 *   - [data-anim-hero-scroll]    : indicador de scroll
 *   - [data-anim-section]        : secciones, entrada por scroll
 *   - [data-anim-card-group]     : grupo de tarjetas (stagger al entrar)
 *   - [data-anim-verse]          : versiculo
 *   - [data-anim-hero-image]     : parallax sutil de la imagen de fondo
 *
 * Si el usuario pidio menos movimiento, no se ejecuta nada.
 */
export function HomeAnimations() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cleanups: Array<() => void> = [];

    try {
      // --- HERO: timeline de entrada -----------------------------------------
      const kicker = document.querySelector<HTMLElement>("[data-anim-hero-kicker]");
      const titleEl = document.querySelector<HTMLElement>("[data-anim-hero-title]");
      const subtitleEl = document.querySelector<HTMLElement>("[data-anim-hero-subtitle]");
      const body = document.querySelector<HTMLElement>("[data-anim-hero-body]");
      const chipsContainer = document.querySelector<HTMLElement>("[data-anim-hero-chips]");
      const ctasContainer = document.querySelector<HTMLElement>("[data-anim-hero-cta]");
      const scrollHint = document.querySelector<HTMLElement>("[data-anim-hero-scroll]");

      if (kicker) {
        animate(kicker, {
          opacity: [0, 1],
          translateY: [12, 0],
          duration: 600,
          ease: "out(3)",
        });
      }

      let splitter: ReturnType<typeof splitText> | null = null;
      if (titleEl) {
        splitter = splitText(titleEl, { words: false, chars: true });
        const chars = splitter?.chars ?? [];
        if (chars.length) {
          animate(chars, {
            opacity: [0, 1],
            translateY: [18, 0],
            rotateZ: [4, 0],
            duration: 900,
            delay: stagger(28),
            ease: "out(4)",
          });
        }
      }

      const tl = createTimeline({ delay: 250 });

      if (subtitleEl) {
        tl.add(subtitleEl, {
          opacity: [0, 1],
          translateY: [14, 0],
          duration: 700,
          ease: "out(3)",
        }, 0);
      }
      if (body) {
        tl.add(body, {
          opacity: [0, 1],
          translateY: [14, 0],
          duration: 700,
          ease: "out(3)",
        }, 120);
      }
      if (chipsContainer) {
        const chips = Array.from(chipsContainer.children) as HTMLElement[];
        if (chips.length) {
          tl.add(chips, {
            opacity: [0, 1],
            translateY: [12, 0],
            scale: [0.96, 1],
            duration: 550,
            delay: stagger(70),
            ease: "out(3)",
          }, 240);
        }
      }
      if (ctasContainer) {
        const ctas = Array.from(ctasContainer.children) as HTMLElement[];
        if (ctas.length) {
          tl.add(ctas, {
            opacity: [0, 1],
            translateY: [16, 0],
            duration: 650,
            delay: stagger(90),
            ease: "out(3)",
          }, 380);
        }
      }
      if (scrollHint) {
        tl.add(scrollHint, {
          opacity: [0, 0.6],
          translateY: [-8, 0],
          duration: 600,
          ease: "out(2)",
        }, 520);
      }

      if (splitter) cleanups.push(() => splitter!.revert());

      // --- HERO: parallax sutil de la imagen de fondo -----------------------
      const bgImage = document.querySelector<HTMLElement>("[data-anim-hero-image]");
      if (bgImage) {
        const ctrl = onScroll({
          target: bgImage,
          enter: "max",
          leave: "min",
          onUpdate: (observer) => {
            const t = observer.target ?? bgImage;
            const y = -observer.progress * 36;
            t.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scale(1.06)`;
          },
        });
        cleanups.push(() => ctrl.revert());
      }

      // --- Secciones: fade + slide al entrar al viewport --------------------
      const sections = Array.from(
        document.querySelectorAll<HTMLElement>("[data-anim-section]")
      );
      for (const sec of sections) {
        const ctrl = onScroll({
          target: sec,
          enter: "top-=12% bottom",
          leave: "top bottom+=12%",
          repeat: true,
          onEnter: () => {
            animate(sec, {
              opacity: [0, 1],
              translateY: [28, 0],
              duration: 800,
              ease: "out(3)",
            });
          },
        });
        cleanups.push(() => ctrl.revert());
      }

      // --- Cards (pilares): stagger al entrar ------------------------------
      const cardGroups = Array.from(
        document.querySelectorAll<HTMLElement>("[data-anim-card-group]")
      );
      for (const group of cardGroups) {
        const cards = Array.from(group.children) as HTMLElement[];
        if (!cards.length) continue;
        const ctrl = onScroll({
          target: group,
          enter: "top-=10% bottom",
          leave: "top bottom+=10%",
          repeat: true,
          onEnter: () => {
            animate(cards, {
              opacity: [0, 1],
              translateY: [40, 0],
              scale: [0.96, 1],
              duration: 800,
              delay: stagger(110),
              ease: "out(3)",
            });
          },
        });
        cleanups.push(() => ctrl.revert());
      }

      // --- Versículo: pulso + entrada --------------------------------------
      const verse = document.querySelector<HTMLElement>("[data-anim-verse]");
      if (verse) {
        const ctrl = onScroll({
          target: verse,
          enter: "top-=12% bottom",
          leave: "top bottom+=12%",
          repeat: true,
          onEnter: () => {
            animate(verse, {
              opacity: [0, 1],
              translateY: [20, 0],
              scale: [0.98, 1],
              duration: 900,
              ease: "out(3)",
            });
            animate(verse, {
              boxShadow: [
                "0 0 0 0 rgba(52,213,255,0)",
                "0 0 0 14px rgba(52,213,255,0.18)",
                "0 0 0 0 rgba(52,213,255,0)",
              ],
              duration: 1600,
              delay: 250,
              ease: "out(2)",
            });
          },
        });
        cleanups.push(() => ctrl.revert());
      }
    } catch (err) {
      console.warn("HomeAnimations: anime.js no se pudo inicializar", err);
    }

    return () => {
      for (const fn of cleanups) {
        try {
          fn();
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  return null;
}
