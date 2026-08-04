import { NextResponse } from "next/server";

import { LR_API_BASE, LR_API_KEY } from "@/lib/lightroom";

/**
 * Streams a Lightroom rendition back to the browser.
 *
 * Adobe requires an `x-api-key` header on rendition requests and a browser
 * can't attach headers to an <img>, so the bytes come through here.
 *
 * The rendition path is carried as URL path segments rather than a query
 * string, because next/image refuses to optimise local sources with
 * unrecognised query strings.
 *
 *   /api/lr-image/spaces/<space>/assets/<asset>/revisions/<rev>/renditions/<id>
 *
 * The upstream origin is fixed in code, so this can only ever reach
 * photos.adobe.io — it can't be turned into an open proxy.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  if (!path?.length || path.some((p) => p === "." || p === "..")) {
    return NextResponse.json({ error: "bad path" }, { status: 400 });
  }

  const target = `${LR_API_BASE}${path.map(encodeURIComponent).join("/")}`;

  const upstream = await fetch(target, {
    headers: { "X-API-Key": LR_API_KEY, Accept: "image/*" },
    // Renditions are immutable once generated, so cache them hard.
    next: { revalidate: 60 * 60 * 24 * 7 },
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `upstream ${upstream.status}` },
      { status: upstream.status === 404 ? 404 : 502 }
    );
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
}
