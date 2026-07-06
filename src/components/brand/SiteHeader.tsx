import { auth } from "@/auth";
import { SiteHeaderClient } from "./SiteHeaderClient";

export async function SiteHeader({ ctaHref }: { ctaHref?: string }) {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <SiteHeaderClient
      ctaHref={ctaHref ?? (isLoggedIn ? "/mi-reserva" : "/registro?next=/reservar")}
      isLoggedIn={isLoggedIn}
      isAdmin={isAdmin}
    />
  );
}


