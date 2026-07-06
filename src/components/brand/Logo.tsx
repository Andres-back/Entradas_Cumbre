import Link from "next/link";
import { Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  href?: string | null;
  className?: string;
}

const sizeMap = {
  sm: { icon: "h-5 w-5", top: "text-[10px]", main: "text-lg" },
  md: { icon: "h-7 w-7", top: "text-xs", main: "text-2xl" },
  lg: { icon: "h-9 w-9", top: "text-sm", main: "text-4xl" },
  xl: { icon: "h-14 w-14", top: "text-base", main: "text-7xl" },
};

export function Logo({ size = "md", href = null, className }: LogoProps) {
  const sizes = sizeMap[size];

  const content = (
    <div className={cn("group flex items-center gap-3", className)}>
      <span className="grid rounded-full border border-ember-bright/40 bg-ember-bright/10 p-2 text-ember-bright shadow-ember">
        <Sprout className={cn(sizes.icon)} strokeWidth={2.2} />
      </span>
      <div className="flex flex-col font-display tracking-wider leading-none">
        <span className={cn("text-cumbre-mist", sizes.top)}>CUMBRE</span>
        <span className={cn("text-ember-bright", sizes.main)}>IMPACTO</span>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}


