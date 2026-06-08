import { cn } from "@/lib/utils";
import * as React from "react";

interface CodeProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "md" | "lg";
}

/**
 * Display tipo "ticket viejo" para codigos de entrada BC-XXXXXXXX.
 * Tipografia mono vintage (Special Elite), borde dasheado, glow naranja.
 */
export function Code({ size = "md", className, ...props }: CodeProps) {
  return (
    <div
      className={cn(
        "relative inline-flex items-center",
        "bg-taller-shadow border-2 border-dashed border-taller-iron",
        "rounded-md font-mono text-cream tracking-widest",
        "shadow-ember",
        size === "lg"
          ? "px-8 py-4 text-2xl md:text-3xl"
          : "px-6 py-3 text-base md:text-lg",
        className
      )}
      {...props}
    />
  );
}
