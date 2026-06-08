import { redirect } from "next/navigation";
import { signOut } from "@/auth";

export async function POST() {
  await signOut({ redirect: false });
  redirect("/");
}

export async function GET() {
  await signOut({ redirect: false });
  redirect("/");
}
