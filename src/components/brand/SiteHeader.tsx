import Link from "next/link";
import { auth } from "@/auth";
import { Logo } from "@/components/brand/Logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogIn, User as UserIcon } from "lucide-react";

export async function SiteHeader() {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-taller-iron bg-taller-night/90 backdrop-blur supports-[backdrop-filter]:bg-taller-night/70">
      <div className="container mx-auto flex h-16 items-center justify-between px-3 sm:px-4">
        <Link
          href="/"
          aria-label="Inicio · Bajo el Capó"
          className="flex items-center min-h-[44px]"
        >
          <Logo size="sm" />
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-2">
          {isLoggedIn ? (
            <>
              <Link
                href="/mi-reserva"
                aria-label="Mi reserva"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "min-h-[44px] sm:min-h-0 px-3 sm:px-3"
                )}
              >
                <UserIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Mi reserva</span>
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm" }),
                    "min-h-[44px] sm:min-h-0"
                  )}
                >
                  Panel
                </Link>
              )}
            </>
          ) : (
            <>
              <Link
                href="/registro"
                aria-label="Registrarse"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "min-h-[44px] sm:min-h-0 px-3 sm:px-3"
                )}
              >
                <span className="hidden sm:inline">Sacá tu llave</span>
                <span className="sm:hidden">Llave</span>
              </Link>
              <Link
                href="/login"
                aria-label="Entrar"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "min-h-[44px] sm:min-h-0 px-3 sm:px-3"
                )}
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Entrar</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
