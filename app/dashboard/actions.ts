"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isSignedIn, signIn, signOut } from "@/lib/dashboard/auth";
import { setScheduled } from "@/lib/dashboard/clients";

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

/** Mark a post scheduled (or clear it) in its set's captions.txt in Dropbox. */
export async function toggleScheduled(folder: string, set: string, name: string, on: boolean): Promise<string | null> {
  if (!(await isSignedIn())) return "Signed out. Reload and sign in again.";
  try {
    await setScheduled(folder, set, name, on);
  } catch (err) {
    return (err as Error).message;
  }
  revalidatePath("/dashboard");
  return null;
}
