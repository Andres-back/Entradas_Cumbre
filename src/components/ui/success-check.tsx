import { cn } from "@/lib/utils";

type SuccessCheckProps = {
  size?: number;
  className?: string;
  tone?: "success" | "ember" | "rust";
};

const TONE_COLORS: Record<NonNullable<SuccessCheckProps["tone"]>, { stroke: string; glow: string }> = {
  success: { stroke: "#7BA05B", glow: "rgba(123, 160, 91, 0.45)" },
  ember:   { stroke: "#E89A3C", glow: "rgba(232, 154, 60, 0.45)" },
  rust:    { stroke: "#C8771E", glow: "rgba(200, 119, 30, 0.45)" },
};

export function SuccessCheck({ size = 64, className, tone = "success" }: SuccessCheckProps) {
  const { stroke, glow } = TONE_COLORS[tone];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("drop-shadow-[0_0_12px_var(--glow)]", className)}
      style={{ ["--glow" as string]: glow } as React.CSSProperties}
      role="img"
      aria-label="Confirmado"
    >
      <circle
        cx="32"
        cy="32"
        r="28"
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        className="check-circle-anim"
      />
      <path
        d="M20 33 L29 42 L45 24"
        fill="none"
        stroke={stroke}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="check-stroke-anim"
      />
    </svg>
  );
}


