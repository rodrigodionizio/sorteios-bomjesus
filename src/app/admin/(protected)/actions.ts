"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SORTEIO_COOKIE_NAME } from "@/lib/sorteio-atual";

export async function setSorteioAtivo(sorteioId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SORTEIO_COOKIE_NAME, sorteioId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    sameSite: "lax",
  });
  revalidatePath("/admin");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/admin");
  redirect("/");
}
