import { readdir } from "node:fs/promises";
import path from "node:path";

import type { GallerySource } from "@/content/galleries";
import { imageSize } from "./imageSize";
import { fetchShare, proxied } from "./lightroom";

/**
 * One photo, normalised. Every source below returns this same shape, so the
 * gallery components never know or care where a photo came from. Swapping a
 * category from "local" to "lightroom" is a one-line change in
 * content/galleries.ts and nothing else in the site moves.
 */
export type Photo = {
  id: string;
  /** Display-size image used in the grid and lightbox. */
  src: string;
  /** Small image for the grid, if the source offers one. Falls back to src. */
  thumb: string;
  /** Largest available, used when the lightbox is opened. Falls back to src. */
  full: string;
  width?: number;
  height?: number;
  alt: string;
};

export type GalleryResult = {
  photos: Photo[];
  /** Set when the source could not be read. Surfaced in the UI, not thrown. */
  error?: string;
};

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

// ─────────────────────────────────────────────────────────────
//  local — files in public/photos/<dir>
// ─────────────────────────────────────────────────────────────

async function fromLocal(dir: string, alt: string): Promise<GalleryResult> {
  const abs = path.join(process.cwd(), "public", "photos", dir);
  let names: string[];
  try {
    names = await readdir(abs);
  } catch {
    return {
      photos: [],
      error: `No folder at public/photos/${dir}. Create it and drop images in.`,
    };
  }

  const files = names
    .filter((n) => !n.startsWith(".") && IMAGE_EXT.has(path.extname(n).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const photos = await Promise.all(
    files.map(async (name): Promise<Photo> => {
      const src = `/photos/${dir}/${name}`;
      const size = await imageSize(path.join(abs, name));
      return {
        id: src,
        src,
        thumb: src,
        full: src,
        width: size?.width,
        height: size?.height,
        alt,
      };
    })
  );

  return { photos };
}

// ─────────────────────────────────────────────────────────────
//  icloud — a Shared Album, read from Apple's public stream API
// ─────────────────────────────────────────────────────────────

const ICLOUD_BASE = "https://sharedstreams.icloud.com";

type Derivative = { fileSize: string; checksum: string; width?: string; height?: string };

async function fromICloud(token: string, alt: string): Promise<GalleryResult> {
  try {
    const post = (host: string, endpoint: string, body: unknown) =>
      fetch(`https://${host}/${token}/sharedstreams/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        next: { revalidate: 300 },
      });

    let host = new URL(ICLOUD_BASE).host;
    let res = await post(host, "webstream", { streamCtag: null });

    // Apple answers 330 with the real partition host to talk to.
    if (res.status === 330) {
      const redirect = await res.json();
      host = redirect["X-Apple-MMe-Host"] as string;
      res = await post(host, "webstream", { streamCtag: null });
    }

    const stream = await res.json();
    const items = (stream.photos as Array<Record<string, unknown>>) ?? [];
    if (!items.length) return { photos: [] };

    const assetRes = await post(host, "webasseturls", {
      photoGuids: items.map((p) => p.photoGuid as string),
    });
    const assets = (await assetRes.json()).items as Record<
      string,
      { url_location: string; url_path: string }
    >;

    const urlFor = (checksum?: string) => {
      if (!checksum || !assets?.[checksum]) return null;
      const { url_location, url_path } = assets[checksum];
      return `https://${url_location}${url_path}`;
    };

    const photos = items
      .filter((p) => p.mediaAssetType !== "video")
      .map((p): Photo | null => {
        const derivs = Object.entries(
          (p.derivatives as Record<string, Derivative>) ?? {}
        )
          .filter(([k]) => !["720p", "360p", "1080p", "PosterFrame"].includes(k))
          .map(([, d]) => d)
          .filter((d) => d.checksum)
          .sort((a, b) => Number(a.fileSize) - Number(b.fileSize));

        if (!derivs.length) return null;

        const smallest = derivs[0];
        const largest = derivs[derivs.length - 1];

        // Prefer something near 2048px wide for display: sharp on retina
        // without shipping the full-resolution original.
        const sized = derivs.filter((d) => d.width && Number(d.width) >= 720);
        const display = sized.length
          ? sized.reduce((best, d) =>
              Math.abs(Number(d.width) - 2048) < Math.abs(Number(best.width) - 2048) ? d : best
            )
          : largest;

        const src = urlFor(display.checksum);
        if (!src) return null;

        return {
          id: p.photoGuid as string,
          src,
          thumb: urlFor(smallest.checksum) ?? src,
          full: urlFor(largest.checksum) ?? src,
          width: display.width ? Number(display.width) : undefined,
          height: display.height ? Number(display.height) : undefined,
          alt: (p.caption as string) || alt,
        };
      })
      .filter((p): p is Photo => p !== null);

    return { photos };
  } catch (err) {
    console.error("[icloud]", err);
    return { photos: [], error: "Couldn't reach the iCloud album." };
  }
}

// ─────────────────────────────────────────────────────────────
//  lightroom — an Adobe Lightroom share link
//
//  Adobe publishes no supported API for share links. The share page
//  itself reads its photos from an internal JSON endpoint, and that's what
//  we read here. It works, but it is undocumented, so it can change without
//  warning — which is why a failure here degrades to an on-page message
//  instead of breaking the build or the route.
//
//  Requirements for a share link to be readable:
//    • the share must be public (not "require sign in")
//    • the link looks like https://lightroom.adobe.com/shared/<id>
// ─────────────────────────────────────────────────────────────

async function fromLightroom(shareUrl: string, alt: string): Promise<GalleryResult> {
  try {
    const album = await fetchShare(shareUrl);

    const photos = album.assets
      .map((a): Photo | null => {
        // Rendition ids are opaque, so take whatever sizes this asset offers
        // rather than assuming a fixed set.
        const display = a.renditions["2048"] ?? a.renditions["1280"] ?? a.renditions["640"];
        if (!display) return null;
        const small = a.renditions["640"] ?? a.renditions["thumbnail2x"] ?? display;

        return {
          id: a.id,
          src: proxied(display),
          thumb: proxied(small),
          full: proxied(a.renditions["2048"] ?? display),
          width: a.width,
          height: a.height,
          alt,
        };
      })
      .filter((p): p is Photo => p !== null);

    if (!photos.length) {
      return {
        photos: [],
        error: "That Lightroom album came back empty. Is the share still public?",
      };
    }

    return { photos };
  } catch (err) {
    console.error("[lightroom]", (err as Error).message);
    return {
      photos: [],
      error:
        "Couldn't read that Lightroom share — it may have been deleted, unshared, or made private.",
    };
  }
}

// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  adobe portfolio — a published page on myportfolio.com
//
//  Portfolio pages are plain public HTML with the photographs served from
//  Adobe's CDN, so this reads the page and collects the image URLs in the
//  order they appear. No login, no API key, and it keeps working as long as
//  the page is published.
// ─────────────────────────────────────────────────────────────

/** Pull the widest candidate out of a srcset attribute. */
function widestFromSrcset(srcset: string): string | null {
  let best: { url: string; w: number } | null = null;
  for (const part of srcset.split(",")) {
    const [url, size] = part.trim().split(/\s+/);
    if (!url) continue;
    const w = size?.endsWith("w") ? parseInt(size, 10) : 0;
    if (!best || w > best.w) best = { url, w };
  }
  return best?.url ?? null;
}

function absolutise(url: string, base: string): string | null {
  try {
    return new URL(url, base).href;
  } catch {
    return null;
  }
}

async function fromAdobePortfolio(pageUrl: string, alt: string): Promise<GalleryResult> {
  try {
    const res = await fetch(pageUrl, {
      headers: {
        // Portfolio serves a stripped page to clients that look like bots.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return { photos: [], error: `That Portfolio page returned ${res.status}. Is it published?` };
    }

    const html = await res.text();
    const seen = new Set<string>();
    const urls: string[] = [];

    // Walk every <img>, preferring the largest srcset entry, then the lazy-load
    // data-src, then plain src.
    for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
      const srcset =
        tag.match(/\bdata-srcset\s*=\s*["']([^"']+)["']/i)?.[1] ??
        tag.match(/\bsrcset\s*=\s*["']([^"']+)["']/i)?.[1];

      const raw =
        (srcset && widestFromSrcset(srcset)) ??
        tag.match(/\bdata-src\s*=\s*["']([^"']+)["']/i)?.[1] ??
        tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];

      if (!raw) continue;
      const abs = absolutise(raw, pageUrl);
      if (!abs) continue;

      // Keep real photographs; drop spacers, icons, and inline data URIs.
      if (!/^https?:/i.test(abs)) continue;
      if (!/\.(jpe?g|png|webp|avif)(\?|$)/i.test(abs)) continue;
      if (/logo|icon|favicon|spacer|avatar/i.test(abs)) continue;

      const key = abs.split("?")[0];
      if (seen.has(key)) continue;
      seen.add(key);
      urls.push(abs);
    }

    if (!urls.length) {
      return {
        photos: [],
        error:
          "Couldn't find any photos on that Portfolio page. Check the link opens publicly in a private browser window.",
      };
    }

    return {
      photos: urls.map((src, i) => ({
        id: `${src.split("?")[0]}#${i}`,
        src,
        thumb: src,
        full: src,
        alt,
      })),
    };
  } catch (err) {
    console.error("[portfolio]", err);
    return { photos: [], error: "Couldn't reach that Adobe Portfolio page." };
  }
}

// ─────────────────────────────────────────────────────────────

/**
 * Fisher–Yates. Runs on the server only, so the browser receives one fixed
 * order and there's no risk of a hydration mismatch. The order re-rolls
 * whenever the page revalidates.
 */
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function loadGallery(
  source: GallerySource,
  alt = "Photograph by Studio L",
  { randomize = true }: { randomize?: boolean } = {}
): Promise<GalleryResult> {
  const result = await (async (): Promise<GalleryResult> => {
    switch (source.kind) {
      case "local":
        return fromLocal(source.dir, alt);
      case "icloud":
        return fromICloud(source.token, alt);
      case "lightroom":
        return fromLightroom(source.url, alt);
      case "portfolio":
        return fromAdobePortfolio(source.url, alt);
    }
  })();

  if (!randomize || result.photos.length < 2) return result;
  return { ...result, photos: shuffle(result.photos) };
}
