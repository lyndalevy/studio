import { isSignedIn } from "@/lib/dashboard/auth";
import { source } from "@/lib/dashboard/source";

/**
 * A preview of a photo saved in the ideas folders, for the dashboard: /dashboard/idea-image?ref=<id>&size=large.
 * Signed-in only, and only Dropbox ids or files under ideas/.
 */
export async function GET(req: Request) {
  if (!(await isSignedIn())) return new Response("Sign in first.", { status: 401 });
  const url = new URL(req.url);
  const ref = url.searchParams.get("ref") ?? "";
  const ok = ref.startsWith("id:") || (ref.startsWith("ideas/") && !ref.includes(".."));
  const src = source();
  if (!ok || !src) return new Response("Not found.", { status: 404 });
  const img = await src.thumbnail(ref, url.searchParams.get("size") === "large" ? "large" : "small");
  if (!img) return new Response("Not found.", { status: 404 });
  return new Response(img.body, {
    headers: { "Content-Type": img.type, "Cache-Control": "private, max-age=86400" },
  });
}
