import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-subhead font-semibold uppercase tracking-wider transition-all rounded-md disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-bright focus-visible:ring-offset-2 focus-visible:ring-offset-taller-night",
  {
    variants: {
      variant: {
        primary:
          "bg-ember-rust text-cream hover:bg-ember-bright shadow-plate hover:shadow-ember active:scale-[0.98]",
        secondary:
          "bg-taller-steel text-bone border border-taller-iron hover:border-ember-rust",
        ghost: "text-bone hover:bg-taller-steel",
        whatsapp:
          "bg-[#25D366] text-taller-night hover:bg-[#1EBE57]",
        outline:
          "border-2 border-ember-bright text-ember-bright hover:bg-ember-bright/10",
        danger:
          "bg-signal-rust text-cream hover:bg-signal-rust/85 shadow-plate active:scale-[0.98]",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-11 px-5 text-sm",
        lg: "h-14 px-7 text-base",
        xl: "h-16 px-8 text-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
