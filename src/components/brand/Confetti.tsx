"use client";

import { useMemo } from "react";

type Piece = {
  left: number;
  tx: number;
  tr: number;
  dur: number;
  delay: number;
  color: string;
  size: number;
  shape: "rect" | "circle";
};

const COLORS = [
  "#E89A3C", // ember-bright
  "#C8771E", // ember-rust
  "#F4B860", // ember-glow
  "#7BA05B", // signal-green
  "#F4E4C1", // cream
];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function Confetti({
  count = 70,
  seed = 1,
  className,
}: {
  count?: number;
  seed?: number;
  className?: string;
}) {
  const pieces = useMemo<Piece[]>(() => {
    const rand = rng(seed);
    return Array.from({ length: count }, () => ({
      left: rand() * 100,
      tx: (rand() - 0.5) * 320,
      tr: 540 + rand() * 720,
      dur: 1.8 + rand() * 1.6,
      delay: rand() * 0.4,
      color: COLORS[Math.floor(rand() * COLORS.length)],
      size: 6 + rand() * 8,
      shape: rand() > 0.5 ? "rect" : "circle",
    }));
  }, [count, seed]);

  return (
    <div
      aria-hidden
      className={
        "pointer-events-none fixed inset-0 z-[60] overflow-hidden " +
        (className ?? "")
      }
    >
      {pieces.map((p, i) => {
        const style: React.CSSProperties = {
          left: `${p.left}%`,
          top: "-20px",
          width: `${p.size}px`,
          height: `${p.size}px`,
          backgroundColor: p.color,
          // @ts-expect-error CSS vars
          "--tx": `${p.tx}px`,
          "--tr": `${p.tr}deg`,
          "--dur": `${p.dur}s`,
          "--delay": `${p.delay}s`,
          borderRadius: p.shape === "circle" ? "9999px" : "2px",
        };
        return <span key={i} className="absolute animate-confetti" style={style} />;
      })}
    </div>
  );
}
