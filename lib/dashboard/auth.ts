import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * One password for the dashboard, kept in the DASHBOARD_PASSWORD secret.
 *
 * Signing in sets a cookie holding an HMAC of the password, so the password
 * itself is never stored in the browser. Changing the password signs every
 * device out.
 */

export const COOKIE = "sl_dashboard";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const password = () => process.env.DASHBOARD_PASSWORD ?? "";
const sign = (pw: string) => createHmac("sha256", pw).update("studio-l-dashboard-v1").digest("hex");

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** True when the dashboard has a password at all. With none set, nobody can get in. */
export const isConfigured = () => password().length >= 8;

export async function isSignedIn(): Promise<boolean> {
  if (!isConfigured()) return false;
  const token = (await cookies()).get(COOKIE)?.value;
  return !!token && same(token, sign(password()));
}

export async function signIn(attempt: string): Promise<boolean> {
  if (!isConfigured() || !same(sign(attempt), sign(password()))) return false;
  (await cookies()).set(COOKIE, sign(password()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/dashboard",
    maxAge: MAX_AGE,
  });
  return true;
}

export async function signOut() {
  (await cookies()).delete({ name: COOKIE, path: "/dashboard" });
}
