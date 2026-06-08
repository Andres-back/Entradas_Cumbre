import { cn } from "@/lib/utils";
import * as React from "react";

export type BadgeVariant =
  | "default"
  | "pending"
  | "paid"
  | "cancelled"
  | "success"
  | "info";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "border-taller-iron text-bone bg-taller-iron/40",
  pending: "border-ash/40 text-ash bg-transparent",
  paid: "border-ember-bright/40 text-ember-bright bg-ember-bright/5",
  cancelled: "border-signal-rust/40 text-signal-rust bg-transparent",
  success: "border-signal-green/40 text-signal-green bg-signal-green/5",
  info: "border-signal-steel/40 text-signal-steel bg-signal-steel/5",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-pill",
        "text-xs font-subhead uppercase tracking-wider",
        "border",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
