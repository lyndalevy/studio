"use server";

import { redirect } from "next/navigation";

import { signIn, signOut } from "@/lib/dashboard/auth";

export async function login(_: string | null, form: FormData): Promise<string | null> {
  const ok = await signIn(String(form.get("password") ?? ""));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 1200)); // slow down guessing
    return "That's not the password.";
  }
  redirect("/dashboard");
}

export async function logout() {
  await signOut();
  redirect("/dashboard");
}
