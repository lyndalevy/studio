/**
 * Reading a public Lightroom share.
 *
 * Adobe publishes no supported API for these, so this follows exactly what the
 * share page itself does:
 *
 *   1. Fetch the share page HTML (adobe.ly short links redirect fine).
 *   2. Pull the album's assets URL out of the embedded `SharesConfig` blob.
 *   3. Call photos.adobe.io for the asset list, sending the same API key the
 *      Lightroom web client uses.
 *   4. Read each asset's rendition links — the URLs are opaque ids, so they
 *      have to be taken from the response rather than constructed.
 *
 * The rendition URLs themselves also need the API key, which a browser can't
 * send on an <img>, so they get routed through /api/lr-image.
 */

export const LR_HOST = "photos.adobe.io";
export const LR_API_BASE = `https://${LR_HOST}/v2/`;

/** The public key the Lightroom web client sends. Not a secret. */
export const LR_API_KEY = "LightroomMobileWeb1";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** Adobe prefixes its JSON with `while (1) {}` to defeat JSON hijacking. */
function stripAdobePrefix(text: string): string {
  return text.replace(/^\s*while\s*\(1\)\s*\{\s*\}\s*/, "");
}

export type LrAsset = {
  id: string;
  /** rendition size name → absolute photos.adobe.io URL */
  renditions: Record<string, string>;
  width?: number;
  height?: number;
  captureDate?: string;
};

export type LrAlbum = {
  name?: string;
  assets: LrAsset[];
};

/**
 * Route a rendition URL through our proxy so the API key can be attached.
 * The path is kept as path segments (not a query string) so next/image will
 * still optimise it.
 */
export function proxied(url: string): string {
  const rest = url.startsWith(LR_API_BASE) ? url.slice(LR_API_BASE.length) : null;
  if (!rest) return url;
  return `/api/lr-image/${rest}`;
}

export async function fetchShare(shareUrl: string, limit = 200): Promise<LrAlbum> {
  const pageRes = await fetch(shareUrl, {
    headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
    redirect: "follow",
    next: { revalidate: 300 },
  });
  if (!pageRes.ok) throw new Error(`share page ${pageRes.status}`);
  const html = await pageRes.text();

  // The page embeds the album's assets href. JSON-escaped ampersands show up
  // as \u0026, so undo those before using it as a URL.
  const match = html.match(
    /spaces\/[a-f0-9]{32}\/albums\/[a-f0-9]{32}\/assets\?[^"'\\]*(?:\\u0026[^"'\\]*)*/
  );
  if (!match) {
    throw new Error("could not find an album in that share page");
  }
  const href = match[0].replace(/\\u0026/g, "&");

  const apiUrl = new URL(`https://${LR_HOST}/v2/${href}`);
  apiUrl.searchParams.set("limit", String(limit));

  const res = await fetch(apiUrl.href, {
    headers: { "X-API-Key": LR_API_KEY, Accept: "application/json", "User-Agent": BROWSER_UA },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`assets ${res.status}`);

  const data = JSON.parse(stripAdobePrefix(await res.text())) as {
    base: string;
    resources?: Array<{
      asset?: {
        id?: string;
        subtype?: string;
        links?: Record<string, { href?: string }>;
        payload?: {
          captureDate?: string;
          importSource?: { originalWidth?: number; originalHeight?: number };
          develop?: { croppedWidth?: number; croppedHeight?: number };
        };
      };
    }>;
  };

  const base = data.base;
  const assets: LrAsset[] = [];

  for (const r of data.resources ?? []) {
    const a = r.asset;
    if (!a?.id || !a.links) continue;
    if (a.subtype && a.subtype !== "image") continue;

    const renditions: Record<string, string> = {};
    for (const [rel, link] of Object.entries(a.links)) {
      const m = rel.match(/^\/rels\/rendition_type\/(.+)$/);
      if (m && link?.href) renditions[m[1]] = new URL(link.href, base).href;
    }
    if (!Object.keys(renditions).length) continue;

    const dev = a.payload?.develop;
    const imp = a.payload?.importSource;
    // Cropped dimensions reflect what you actually see; fall back to the original.
    const width = dev?.croppedWidth ?? imp?.originalWidth;
    const height = dev?.croppedHeight ?? imp?.originalHeight;

    assets.push({
      id: a.id,
      renditions,
      width,
      height,
      captureDate: a.payload?.captureDate,
    });
  }

  // The album's display name, if the page exposes it.
  const nameMatch = html.match(/"name"\s*:\s*"([^"]{1,80})"/);

  return { name: nameMatch?.[1], assets };
}
