import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
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
  /** Save a small text file, replacing what's there. */
  write(file: string, text: string): Promise<void>;
  /** Move a file or folder, making the folders it goes into. */
  move(from: string, to: string): Promise<void>;
  /** Delete a file (Dropbox keeps it in Deleted files for 30 days). */
  remove(file: string): Promise<void>;
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
  if (!res.ok) throw new Error(`Dropbox sign-in failed (${res.status}): ${await reason(res)} Reconnect Dropbox.`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

/** Dropbox's own explanation of a failed call (an error summary, never a token). */
async function reason(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { error_summary?: string; error_description?: string; error?: unknown };
    return (j.error_summary ?? j.error_description ?? JSON.stringify(j.error) ?? "").slice(0, 300);
  } catch {
    return text.slice(0, 300);
  }
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
      if (!res.ok) throw new Error(`Couldn't list ${base} in Dropbox (${res.status}): ${await reason(res)}`);
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
    if (!res.ok) throw new Error(`Couldn't read ${file} from Dropbox (${res.status}): ${await reason(res)}`);
    return res.text();
  },

  async write(file, text) {
    const token = await accessToken();
    const res = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": headerJson({ path: `${ROOT}/${file}`, mode: "overwrite", mute: true }),
      },
      body: text,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Couldn't save ${file} to Dropbox (${res.status}): ${await reason(res)}`);
  },

  async move(from, to) {
    const token = await accessToken();
    const res = await fetch("https://api.dropboxapi.com/2/files/move_v2", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from_path: `${ROOT}/${from}`, to_path: `${ROOT}/${to}`, autorename: true }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Couldn't move ${from} in Dropbox (${res.status}): ${await reason(res)}`);
  },

  async remove(file) {
    const token = await accessToken();
    const res = await fetch("https://api.dropboxapi.com/2/files/delete_v2", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ path: `${ROOT}/${file}` }),
      cache: "no-store",
    });
    if (res.status === 409) return; // already gone
    if (!res.ok) throw new Error(`Couldn't delete ${file} in Dropbox (${res.status}): ${await reason(res)}`);
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
    async write(file, text) {
      await writeFile(path.join(root, file), text, "utf8");
    },
    async move(from, to) {
      await mkdir(path.dirname(path.join(root, to)), { recursive: true });
      await rename(path.join(root, from), path.join(root, to));
    },
    async remove(file) {
      await rm(path.join(root, file), { force: true });
    },
  };
}

// Saved Instagram links (.url files) never change once saved, so each is downloaded once per server.
const LINK_FILE = /\.(url|webloc)$/i;
const linkCache = new Map<string, string>();

function withLinkCache(src: Source): Source {
  return {
    ...src,
    async read(file) {
      if (!LINK_FILE.test(file)) return src.read(file);
      const hit = linkCache.get(file);
      if (hit !== undefined) return hit;
      const text = await src.read(file);
      if (text !== null) linkCache.set(file, text);
      return text;
    },
    async move(from, to) {
      await src.move(from, to);
      const text = linkCache.get(from);
      linkCache.delete(from);
      if (text !== undefined && LINK_FILE.test(to)) linkCache.set(to, text);
    },
    async remove(file) {
      await src.remove(file);
      linkCache.delete(file);
    },
  };
}

const cachedDropbox = withLinkCache(dropbox);

/** The configured source, or null when the dashboard hasn't been connected yet. */
export function source(): Source | null {
  if (process.env.DASHBOARD_LOCAL_ROOT) return withLinkCache(local(process.env.DASHBOARD_LOCAL_ROOT));
  if (process.env.DROPBOX_REFRESH_TOKEN && process.env.DROPBOX_APP_KEY && process.env.DROPBOX_APP_SECRET) return cachedDropbox;
  return null;
}
