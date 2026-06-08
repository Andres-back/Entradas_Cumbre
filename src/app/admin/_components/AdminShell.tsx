"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Wallet, Settings, LogOut, LayoutDashboard, TicketCheck, UserCog, KeyRound, Grid3x3 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/validar", label: "Validar", icon: TicketCheck },
  { href: "/admin/reservas", label: "Reservas", icon: Users },
  { href: "/admin/mesas", label: "Mesas", icon: Grid3x3 },
  { href: "/admin/usuarios", label: "Usuarios", icon: UserCog },
  { href: "/admin/pagos", label: "Pagos", icon: Wallet },
  { href: "/admin/evento", label: "Evento", icon: Settings },
  { href: "/admin/cuenta", label: "Mi cuenta", icon: KeyRound },
];

export function AdminShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-taller-iron bg-taller-night">
        <div className="p-6 border-b border-taller-iron">
          <Logo size="sm" />
          <p className="mt-2 text-base text-ash font-subhead uppercase tracking-widest">
            Panel
          </p>
          <p className="mt-1 text-lg text-bone truncate">{userName}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-lg font-subhead uppercase tracking-wider transition-colors",
                  active
                    ? "bg-ember-rust text-cream"
                    : "text-bone hover:bg-taller-steel"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-taller-iron">
          <form action="/logout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-lg font-subhead uppercase tracking-wider text-bone hover:bg-taller-steel transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Salir
            </button>
          </form>
        </div>
      </aside>

      {/* Top tabs mobile */}
      <nav className="md:hidden flex overflow-x-auto border-b border-taller-iron bg-taller-night sticky top-16 z-30 scrollbar-thin">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 px-3.5 min-h-[48px] text-sm font-subhead uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors shrink-0",
                active
                  ? "border-ember-rust text-ember-bright"
                  : "border-transparent text-ash active:bg-taller-steel/50"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
