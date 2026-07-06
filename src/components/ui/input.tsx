import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        "w-full h-12 px-4",
        "bg-taller-steel border border-taller-iron rounded-sm",
        "text-bone placeholder:text-smoke",
        "font-body text-base",
        "focus:outline-none focus:border-ember-bright focus:ring-2 focus:ring-ember-bright/20",
        "focus-glow",
        "transition-all duration-200 ease-out",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };


