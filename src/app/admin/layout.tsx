import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { AdminShell } from "./_components/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  // El middleware ya filtra, pero doble check por defensa
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login?next=/admin");
  }

  return (
    <>
      <SiteHeader />
      <AdminShell userName={session.user.name ?? "Admin"}>
        {children}
      </AdminShell>
    </>
  );
}


