"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isSignedIn, signIn, signOut } from "@/lib/dashboard/auth";
import { setScheduled, today } from "@/lib/dashboard/clients";
import { STATUSES, updateIdeas, type Idea, type IdeaStatus } from "@/lib/dashboard/ideas";

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

/** Add an idea to film from the dashboard form. */
export async function addIdea(_: string | null, form: FormData): Promise<string | null> {
  if (!(await isSignedIn())) return "Signed out. Reload and sign in again.";
  const text = String(form.get("text") ?? "").trim().slice(0, 500);
  if (!text) return "Write the idea first.";
  const forWhich: Idea["for"] = form.get("for") === "Photography" ? "Photography" : "Social";
  const link = String(form.get("link") ?? "").trim();
  if (link && !/^https?:\/\//i.test(link)) return "The link should start with https://";
  try {
    await updateIdeas((ideas) => [
      { id: crypto.randomUUID(), text, for: forWhich, status: "to film", added: today(), ...(link ? { link } : {}) },
      ...ideas,
    ]);
  } catch (err) {
    return (err as Error).message;
  }
  revalidatePath("/dashboard");
  return null;
}

/** Move an idea to its next step (to film, filmed, posted), or delete it. */
export async function changeIdea(id: string, to: IdeaStatus | "delete"): Promise<string | null> {
  if (!(await isSignedIn())) return "Signed out. Reload and sign in again.";
  if (to !== "delete" && !STATUSES.includes(to)) return "That isn't a step.";
  try {
    await updateIdeas((ideas) =>
      to === "delete" ? ideas.filter((i) => i.id !== id) : ideas.map((i) => (i.id === id ? { ...i, status: to } : i))
    );
  } catch (err) {
    return (err as Error).message;
  }
  revalidatePath("/dashboard");
  return null;
}
