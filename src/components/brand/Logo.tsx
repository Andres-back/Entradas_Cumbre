import Link from "next/link";
import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  href?: string | null;
  className?: string;
}

const sizeMap = {
  sm: { wrench: "h-5 w-5", bajo: "text-[10px]", capo: "text-xl" },
  md: { wrench: "h-7 w-7", bajo: "text-xs", capo: "text-2xl" },
  lg: { wrench: "h-9 w-9", bajo: "text-sm", capo: "text-4xl" },
  xl: { wrench: "h-14 w-14", bajo: "text-base", capo: "text-7xl" },
};

export function Logo({ size = "md", href = null, className }: LogoProps) {
  const sizes = sizeMap[size];

  const content = (
    <div className={cn("group flex items-center gap-3", className)}>
      <Wrench
        className={cn(
          "text-ember-rust transition-transform duration-200 group-hover:animate-idle-wrench",
          sizes.wrench
        )}
        strokeWidth={2.5}
      />
      <div className="flex flex-col font-display tracking-wider leading-none">
        <span className={cn("text-bone", sizes.bajo)}>BAJO EL</span>
        <span className={cn("text-ember-bright", sizes.capo)}>CAPÓ</span>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
