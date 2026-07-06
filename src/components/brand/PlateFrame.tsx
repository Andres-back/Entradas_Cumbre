import { cn } from "@/lib/utils";

interface PlateFrameProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Marco decorativo con 4 remaches en las esquinas,
 * tipo placa metalica de taller. Usado para envolver titulos hero.
 */
export function PlateFrame({ children, className }: PlateFrameProps) {
  return (
    <div
      className={cn(
        "relative inline-block rounded-md border-2 border-taller-iron bg-taller-steel/50 px-8 py-5 shadow-card md:px-14 md:py-7",
        className
      )}
    >
      {/* Remaches en las 4 esquinas */}
      <span className="absolute left-2 top-2 h-2.5 w-2.5 rounded-full bg-gradient-radial from-taller-steel to-taller-shadow shadow-[inset_0_0_2px_rgba(0,0,0,0.6)]" />
      <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-gradient-radial from-taller-steel to-taller-shadow shadow-[inset_0_0_2px_rgba(0,0,0,0.6)]" />
      <span className="absolute bottom-2 left-2 h-2.5 w-2.5 rounded-full bg-gradient-radial from-taller-steel to-taller-shadow shadow-[inset_0_0_2px_rgba(0,0,0,0.6)]" />
      <span className="absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full bg-gradient-radial from-taller-steel to-taller-shadow shadow-[inset_0_0_2px_rgba(0,0,0,0.6)]" />
      {children}
    </div>
  );
}


