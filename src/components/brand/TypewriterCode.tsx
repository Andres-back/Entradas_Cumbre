"use client";

import { useEffect, useState } from "react";

/**
 * Typewriter que escribe el codigo letra por letra.
 * Solo anima si !prefers-reduced-motion.
 *
 * El setState en useEffect es necesario para la animacion (no es estado
 * derivado, es efecto de animacion). Lo deshabilitamos por linea.
 */
export function TypewriterCode({ text, className }: { text: string; className?: string }) {
  const [displayed, setDisplayed] = useState(text);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayed(text);
      return;
    }

    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 70);

    return () => clearInterval(interval);
  }, [text]);

  const isTyping = displayed.length < text.length;

  return (
    <span className={className} aria-label={text}>
      {displayed}
      {isTyping && (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[2px] bg-ember-bright align-middle animate-typewriter-cursor"
        />
      )}
    </span>
  );
}


