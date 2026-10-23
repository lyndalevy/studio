import type { TierKey } from "@/content/social";
import type { ClientStatus } from "./clients";
import { source } from "./source";

/**
 * The post idea library in Dropbox: Instagram links (.url files) saved from the phone into ideas/,
 * sorted by tier in ideas/bronze, ideas/silver and ideas/gold. ideas/business is Lynda's own and shows in
 * "Ideas to film" instead.
 *
 * A tier link can be assigned to one or more clients (by nickname). Each assignment takes the first cycle
 * that still has room for that tier, after the posts already made and the ideas assigned before it, and
 * keeps that cycle; once that cycle has all its posts of that tier made, the assignment is done (the link
 * stays). Tapping a client again marks the idea as not for that client (grayed out); once more clears it.
 */
export type Shelf = "bronze" | "silver" | "gold" | "business";
export type Assignment = { client: string; cycle: number; at: string; done?: boolean };
export type SavedLink = {
  shelf: Shelf;
  name: string;
  url: string;
  path: string;
  assigned: Assignment[];
  /** Clients this idea isn't for (grayed out). */
  declined: string[];
};

export const SHELVES: Shelf[] = ["bronze", "silver", "gold"];
const ROOT = "ideas";
const META = "ideas/library.json";
const folderOf = (shelf: Shelf) => `${ROOT}/${shelf}`;
const LINK = /\.(url|webloc)$/i;
/** A link without its tracking query, so the same reel shared twice still matches. */
export const linkKey = (u: string) => u.replace(/\?.*$/, "").replace(/\/$/, "");

type Meta = Record<string, { assigned: Assignment[]; declined?: string[] }>;

async function readMeta(): Promise<Meta> {
  const raw = await source()!.read(META);
  try {
    return raw ? (JSON.parse(raw).links as Meta) ?? {} : {};
  } catch {
    return {};
  }
}
const writeMeta = (meta: Meta) => source()!.write(META, JSON.stringify({ links: meta }, null, 2) + "\n");

async function listShelf(shelf: Shelf): Promise<{ path: string; name: string; url: string }[]> {
  const src = source()!;
  let files: string[];
  try {
    files = (await src.list(folderOf(shelf), false))
      .filter((e) => e.kind === "file" && LINK.test(e.path) && !e.path.split("/").pop()!.startsWith("._"))
      .map((e) => e.path);
  } catch {
    return []; // that folder isn't there yet
  }
  const read = await Promise.all(files.map(async (path) => ({ path, text: (await src.read(path)) ?? "" })));
  const out = [];
  for (const { path, text } of read) {
    const url = text.match(/^URL=(\S+)/m)?.[1] ?? text.match(/<string>(https?:[^<]+)<\/string>/)?.[1];
    if (url) out.push({ path, name: path.split("/").pop()!.replace(LINK, ""), url: url.trim() });
  }
  return out;
}

// ── naming ───────────────────────────────────────────────────

/** A file still named by its reel code (what the phone saves), not by what it shows. */
const unnamed = (name: string, url: string) => {
  const code = url.match(/\/(?:reel|reels|p|tv)\/([^/?#]+)/)?.[1];
  return name === code || /^[A-Za-z0-9_-]{9,14}$/.test(name);
};

const clean = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, " ");

/** A short name from the reel's caption on Instagram (first few words), else "@account reel". */
async function nameFromInstagram(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const desc = (await res.text()).match(/property="og:description" content="([^"]*)"/)?.[1];
    if (!desc) return null;
    const m = clean(desc).match(/-\s*([\w.]+) on [^:]+:\s*"?([\s\S]*)$/);
    const account = m?.[1];
    const words = (m?.[2] ?? "")
      .replace(/#\S+|@\S+/g, " ")
      .replace(/[^\p{L}\p{N}'\s-]/gu, " ")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 4);
    if (words.length >= 2) return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ").slice(0, 40);
    return account ? `@${account} reel` : null;
  } catch {
    return null;
  }
}

const safeName = (n: string) => n.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().replace(/\.+$/, "").slice(0, 60);

/** Give every link still named by its reel code a real name, in every shelf and in business. */
export async function nameNewLinks(): Promise<void> {
  const src = source();
  if (!src) return;
  for (const shelf of [...SHELVES, "business" as Shelf]) {
    for (const l of await listShelf(shelf)) {
      if (!unnamed(l.name, l.url)) continue;
      const name = await nameFromInstagram(l.url);
      if (!name) continue;
      const ext = l.path.match(LINK)![0];
      try {
        await src.move(l.path, `${folderOf(shelf)}/${safeName(name)}${ext}`);
      } catch {
        // leave it for next time
      }
    }
  }
}

// ── cycles ───────────────────────────────────────────────────

const tierOfShelf = (shelf: Shelf): TierKey | null =>
  shelf === "bronze" || shelf === "silver" || shelf === "gold" ? shelf : null;

/** All of this cycle's posts of this tier are made (the idea's slot included). */
function cycleDone(c: ClientStatus, cycle: number, tier: TierKey) {
  const p = c.cycles[cycle - 1];
  return !!p && p.needed[tier] > 0 && p.made[tier] >= p.needed[tier];
}

/** The first cycle from now on with room for one more of this tier, after posts made and earlier ideas. */
function openCycle(c: ClientStatus, tier: TierKey, taken: Assignment[], tiers: Map<Assignment, TierKey>) {
  for (let n = Math.max(1, c.current); n <= c.cycles.length; n++) {
    const p = c.cycles[n - 1];
    const used = p.made[tier] + taken.filter((a) => a.client === c.nickname && a.cycle === n && tiers.get(a) === tier).length;
    if (used < p.needed[tier]) return n;
  }
  return null;
}

/**
 * The library, with each assignment marked done once its cycle has all its posts of that tier made. An
 * assignment whose cycle ended before it was made moves on to the next cycle with room. Links are never
 * deleted here, and a link with nothing assigned is never touched.
 */
export async function loadLibrary(clients: ClientStatus[]): Promise<{ links: SavedLink[]; error?: string }> {
  const src = source();
  if (!src) return { links: [] };
  const meta = await readMeta();
  const links: SavedLink[] = (
    await Promise.all(SHELVES.map(async (shelf) => (await listShelf(shelf)).map((l) => ({ ...l, shelf }))))
  )
    .flat()
    .map((l) => ({
      ...l,
      assigned: (meta[linkKey(l.url)]?.assigned ?? []).map((a) => ({ ...a })),
      declined: meta[linkKey(l.url)]?.declined ?? [],
    }));

  const byNick = new Map(clients.map((c) => [c.nickname, c]));
  const tiers = new Map<Assignment, TierKey>();
  for (const l of links) for (const a of l.assigned) tiers.set(a, tierOfShelf(l.shelf)!);
  const all = links.flatMap((l) => l.assigned);

  let changed = false;
  for (const l of links) {
    const tier = tierOfShelf(l.shelf)!;
    for (const a of l.assigned) {
      const c = byNick.get(a.client);
      if (!c) continue;
      if (cycleDone(c, a.cycle, tier)) {
        a.done = true;
        continue;
      }
      if (a.cycle < c.current) {
        const n = openCycle(c, tier, all.filter((x) => x !== a), tiers);
        if (n && n !== a.cycle) {
          a.cycle = n;
          meta[linkKey(l.url)].assigned = l.assigned.map((x) => ({ client: x.client, cycle: x.cycle, at: x.at }));
          changed = true;
        }
      }
    }
  }
  if (changed) {
    try {
      await writeMeta(meta);
    } catch (err) {
      return { links, error: (err as Error).message };
    }
  }
  links.sort((a, b) => a.name.localeCompare(b.name));
  return { links };
}

/**
 * Tap a client on a tier link: blank → queued (joins the end of that client's queue) → not for this client
 * (grayed out) → blank.
 */
export async function assignLink(path: string, url: string, nickname: string, clients: ClientStatus[]): Promise<void> {
  checkPath(path);
  const tier = tierOfShelf(path.split("/")[1] as Shelf);
  if (!tier) throw new Error("Only Bronze, Silver and Gold ideas can be assigned.");
  const c = clients.find((x) => x.nickname === nickname);
  if (!c) throw new Error(`No client called ${nickname}.`);
  const meta = await readMeta();
  const key = linkKey(url);
  const entry = { assigned: meta[key]?.assigned ?? [], declined: meta[key]?.declined ?? [] };

  if (entry.assigned.some((a) => a.client === nickname)) {
    entry.assigned = entry.assigned.filter((a) => a.client !== nickname);
    entry.declined = [...entry.declined, nickname];
  } else if (entry.declined.includes(nickname)) {
    entry.declined = entry.declined.filter((n) => n !== nickname);
  } else {
    if (!c.perWeek[tier]) throw new Error(`${nickname}'s package has no ${tier[0].toUpperCase() + tier.slice(1)} posts.`);
    // every other assignment, with its tier, so this one goes after them
    const tiers = new Map<Assignment, TierKey>();
    const taken: Assignment[] = [];
    for (const s of ["bronze", "silver", "gold"] as Shelf[]) {
      for (const l of await listShelf(s)) {
        for (const a of meta[linkKey(l.url)]?.assigned ?? []) {
          tiers.set(a, tierOfShelf(s)!);
          taken.push(a);
        }
      }
    }
    const n = openCycle(c, tier, taken, tiers);
    if (!n) throw new Error(`${nickname} has no room for another ${tier} post in the next year of cycles.`);
    entry.assigned = [...entry.assigned, { client: nickname, cycle: n, at: new Date().toISOString() }];
  }
  if (entry.assigned.length || entry.declined.length) meta[key] = entry;
  else delete meta[key];
  await writeMeta(meta);
}

// ── moving, naming and deleting files ────────────────────────

/** Only link files directly inside one of the ideas/ shelves can be changed. */
function checkPath(path: string) {
  const parts = path.split("/");
  const ok =
    parts[0] === ROOT &&
    LINK.test(path) &&
    !path.includes("..") &&
    parts.length === 3 &&
    [...SHELVES, "business"].includes(parts[1] as Shelf);
  if (!ok) throw new Error("That isn't a saved link.");
}

/** Rename a link (the file in Dropbox). */
export async function renameLink(path: string, name: string): Promise<void> {
  checkPath(path);
  const clean = safeName(name);
  if (!clean) throw new Error("Write a name first.");
  const dir = path.split("/").slice(0, -1).join("/");
  await source()!.move(path, `${dir}/${clean}${path.match(LINK)![0]}`);
}

/** Delete a link file (Dropbox keeps it in Deleted files for 30 days). */
export async function deleteLink(path: string, url: string): Promise<void> {
  checkPath(path);
  await source()!.remove(path);
  const meta = await readMeta();
  if (meta[linkKey(url)]) {
    delete meta[linkKey(url)];
    await writeMeta(meta);
  }
}
