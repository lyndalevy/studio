/**
 * Reading your own Instagram media.
 *
 * Instagram has no public, unauthenticated API — the old Basic Display API
 * was shut down in December 2024. This uses "Instagram API with Instagram
 * Login", which needs a Business or Creator account and an access token.
 *
 * The token is read from the environment and never appears in this repo:
 *
 *   local dev   .env.local  →  INSTAGRAM_ACCESS_TOKEN=...
 *   production  firebase apphosting:secrets:set INSTAGRAM_ACCESS_TOKEN
 *
 * Tokens last 60 days. See refreshToken() below, and note that the page
 * falls back to the Lightroom albums if the token is missing or expired,
 * so the site never goes blank.
 */

const GRAPH = "https://graph.instagram.com";
const API_VERSION = "v21.0";

export type InstagramPhoto = {
  id: string;
  url: string;
  thumbUrl: string;
  permalink: string;
  caption?: string;
};

type MediaItem = {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  caption?: string;
};

export function hasInstagramToken(): boolean {
  return Boolean(process.env.INSTAGRAM_ACCESS_TOKEN);
}

/**
 * Most recent photos from the connected account, newest first.
 * Throws with a readable message — the caller decides whether to fall back.
 */
export async function fetchInstagramPhotos(limit = 60): Promise<InstagramPhoto[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new Error("INSTAGRAM_ACCESS_TOKEN is not set");

  const url = new URL(`${GRAPH}/${API_VERSION}/me/media`);
  url.searchParams.set(
    "fields",
    "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp"
  );
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("access_token", token);

  const res = await fetch(url.href, { next: { revalidate: 300 } });

  if (!res.ok) {
    // Surface Instagram's own reason — usually an expired token.
    let detail = `${res.status}`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body.error?.message) detail = body.error.message;
    } catch {
      /* non-JSON error body; the status alone will do */
    }
    throw new Error(`Instagram refused the request: ${detail}`);
  }

  const { data } = (await res.json()) as { data?: MediaItem[] };

  return (data ?? [])
    // Carousels report the first image in media_url, which is what we want.
    .filter((m) => m.media_type === "IMAGE" || m.media_type === "CAROUSEL_ALBUM")
    .map((m): InstagramPhoto | null => {
      const src = m.media_url ?? m.thumbnail_url;
      if (!src) return null;
      return {
        id: m.id,
        url: src,
        thumbUrl: m.thumbnail_url ?? src,
        permalink: m.permalink,
        caption: m.caption,
      };
    })
    .filter((p): p is InstagramPhoto => p !== null);
}

/**
 * Extends a long-lived token by another 60 days. Instagram only allows this
 * for tokens that are at least 24 hours old and not yet expired.
 *
 * Run it from the command line and paste the new value into your secret:
 *   npx tsx -e "import('./lib/instagram').then(m=>m.refreshToken().then(console.log))"
 */
export async function refreshToken(): Promise<{ access_token: string; expires_in: number }> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new Error("INSTAGRAM_ACCESS_TOKEN is not set");

  const url = new URL(`${GRAPH}/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", token);

  const res = await fetch(url.href);
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  return res.json();
}
