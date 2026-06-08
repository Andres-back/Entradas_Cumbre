"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type AnimatedNumberProps = {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
  startOnView?: boolean;
};

export function AnimatedNumber({
  value,
  duration = 900,
  format,
  className,
  startOnView = true,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    const node = ref.current;
    if (!node) return;

    const start = () => {
      if (startedRef.current) return;
      startedRef.current = true;

      const startTime = performance.now();
      const initial = 0;
      const target = value;
      let raf = 0;

      const tick = (now: number) => {
        const t = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = initial + (target - initial) * eased;
        setDisplay(v);
        if (t < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          setDisplay(target);
        }
      };
      raf = requestAnimationFrame(tick);

      return () => cancelAnimationFrame(raf);
    };

    if (!startOnView) {
      start();
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      start();
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const cleanup = start();
            obs.disconnect();
            return cleanup;
          }
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [value, duration, startOnView]);

  const text = format ? format(display) : Math.round(display).toLocaleString("es-CO");

  return (
    <span ref={ref} className={cn("inline-block tabular-nums", className)}>
      {text}
    </span>
  );
}
