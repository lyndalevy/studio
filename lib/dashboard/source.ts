import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

/**
 * Where the dashboard reads the studio folder from.
 *
 * On the live site it's Dropbox's API, using a refresh token kept in Cloud
 * Secret Manager. On the Mac, set DASHBOARD_LOCAL_ROOT in .env.local to the
 * Dropbox folder on disk and it reads the files directly instead.
 */

export type Entry = { path: string; kind: "file" | "folder" };

export interface Source {
  /** Files and folders under `dir` (every level, or just the top one), with paths relative to the studio root. */
  list(dir: string, recursive?: boolean): Promise<Entry[]>;
  /** A small text file (client.json, captions.txt), or null if it isn't there. */
  read(file: string): Promise<string | null>;
}

const ROOT = process.env.DROPBOX_ROOT ?? "/STUDIO L SOCIAL";

// ─────────────────────────────────────────────────────────────
//  dropbox — the live site
// ─────────────────────────────────────────────────────────────

let cachedToken: { value: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.DROPBOX_REFRESH_TOKEN!,
      client_id: process.env.DROPBOX_APP_KEY!,
      client_secret: process.env.DROPBOX_APP_SECRET!,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Dropbox sign-in failed (${res.status}). Reconnect Dropbox.`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

/** Dropbox wants its JSON argument header in plain ASCII, so escape everything else. */
const headerJson = (v: unknown) =>
  JSON.stringify(v).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);

const dropbox: Source = {
  async list(dir, recursive = true) {
    const token = await accessToken();
    const base = `${ROOT}/${dir}`.replace(/\/+$/, "");
    const out: Entry[] = [];
    let body: Record<string, unknown> = { path: base, recursive, limit: 2000 };
    let url = "https://api.dropboxapi.com/2/files/list_folder";
    for (;;) {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Couldn't list ${base} in Dropbox (${res.status}).`);
      const page = (await res.json()) as {
        entries: { ".tag": string; path_display: string }[];
        has_more: boolean;
        cursor: string;
      };
      for (const e of page.entries) {
        if (e[".tag"] === "deleted") continue;
        const rel = e.path_display.slice(ROOT.length + 1);
        out.push({ path: rel, kind: e[".tag"] === "folder" ? "folder" : "file" });
      }
      if (!page.has_more) return out;
      url = "https://api.dropboxapi.com/2/files/list_folder/continue";
      body = { cursor: page.cursor };
    }
  },

  async read(file) {
    const token = await accessToken();
    const res = await fetch("https://content.dropboxapi.com/2/files/download", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Dropbox-API-Arg": headerJson({ path: `${ROOT}/${file}` }) },
      cache: "no-store",
    });
    if (res.status === 409) return null; // not found
    if (!res.ok) throw new Error(`Couldn't read ${file} from Dropbox (${res.status}).`);
    return res.text();
  },
};

// ─────────────────────────────────────────────────────────────
//  local — the Dropbox folder on this Mac, for testing
// ─────────────────────────────────────────────────────────────

function local(root: string): Source {
  return {
    async list(dir, recursive = true) {
      const out: Entry[] = [];
      const walk = async (rel: string) => {
        for (const name of await readdir(path.join(root, rel))) {
          if (name.startsWith(".")) continue;
          const child = rel ? `${rel}/${name}` : name;
          const isDir = (await stat(path.join(root, child))).isDirectory();
          out.push({ path: child, kind: isDir ? "folder" : "file" });
          if (isDir && recursive) await walk(child);
        }
      };
      await walk(dir);
      return out;
    },
    async read(file) {
      try {
        return await readFile(path.join(root, file), "utf8");
      } catch {
        return null;
      }
    },
  };
}

/** The configured source, or null when the dashboard hasn't been connected yet. */
export function source(): Source | null {
  if (process.env.DASHBOARD_LOCAL_ROOT) return local(process.env.DASHBOARD_LOCAL_ROOT);
  if (process.env.DROPBOX_REFRESH_TOKEN && process.env.DROPBOX_APP_KEY && process.env.DROPBOX_APP_SECRET) return dropbox;
  return null;
}
