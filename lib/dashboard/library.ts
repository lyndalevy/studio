import type { TierKey } from "@/content/social";
import type { ClientStatus } from "./clients";
import { isPhoto } from "./photo";
import { source } from "./source";

/**
 * The post idea library in Dropbox: Instagram links (.url files) and photos saved from the phone into ideas/,
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
  /** The reel's link, or "photo:<Dropbox id>" for a photo. */
  url: string;
  /** Still named the way the phone saved it: a photo like "IMG_1234", or a link like "DeAZsuwoiw6". */
  needsName?: boolean;
  /** A fingerprint of a photo's contents, to spot the same photo saved twice. */
  hash?: string;
  /** When it was saved to Dropbox (ISO time); the newest show first. */
  added?: string;
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
const PHOTO = /\.(jpe?g|png|heic|heif|webp|gif)$/i;
const IDEA_FILE = /\.(url|webloc|jpe?g|png|heic|heif|webp|gif)$/i;
const cameraName = (name: string) =>
  /^(IMG|DSC|DSCN|PXL|MVIMG|Photo|image|Screenshot)[\s_-]?[\d\s_-]+/i.test(name) ||
  /^temp_image/i.test(name) ||
  /[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}/i.test(name);
/** A link still named by its Instagram code (DeAZsuwoiw6) or its site and page (example.com page). */
const codeName = (name: string) =>
  (/^[A-Za-z0-9_-]{8,}$/.test(name) && /\d|[a-z][A-Z]/.test(name)) || /^[\w-]+(\.[\w-]+)*\.[a-z]{2,}( |$)/i.test(name);
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

async function listShelf(
  shelf: Shelf
): Promise<{ path: string; name: string; url: string; needsName?: boolean; hash?: string; added?: string }[]> {
  const src = source()!;
  let files: { path: string; id?: string; hash?: string; added?: string }[];
  try {
    files = (await src.list(folderOf(shelf), false)).filter(
      (e) => e.kind === "file" && IDEA_FILE.test(e.path) && !e.path.split("/").pop()!.startsWith("._")
    );
  } catch {
    return []; // that folder isn't there yet
  }
  const photos = files
    .filter((f) => PHOTO.test(f.path))
    .map((f) => {
      const name = f.path.split("/").pop()!.replace(PHOTO, "");
      return { path: f.path, name, url: `photo:${f.id ?? f.path}`, needsName: cameraName(name), hash: f.hash, added: f.added };
    });
  const read = await Promise.all(
    files.filter((f) => LINK.test(f.path)).map(async (f) => ({ path: f.path, added: f.added, text: (await src.read(f.path)) ?? "" }))
  );
  const links = [];
  for (const { path, added, text } of read) {
    const url = text.match(/^URL=(\S+)/m)?.[1] ?? text.match(/<string>(https?:[^<]+)<\/string>/)?.[1];
    const name = path.split("/").pop()!.replace(LINK, "");
    if (url) links.push({ path, name, url: url.trim(), needsName: codeName(name), added });
  }
  return [...links, ...photos];
}

// ── naming ───────────────────────────────────────────────────

const safeName = (n: string) => n.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().replace(/\.+$/, "").slice(0, 60);

// ── cycles ───────────────────────────────────────────────────

const tierOfShelf = (shelf: Shelf): TierKey | null =>
  shelf === "bronze" || shelf === "silver" || shelf === "gold" ? shelf : null;

/** All of this cycle's posts of this tier are made (the idea's slot included). */
function cycleDone(c: ClientStatus, cycle: number, tier: TierKey) {
  const p = c.cycles[cycle - 1];
  return !!p && p.needed[tier] > 0 && p.made[tier] >= p.needed[tier];
}

/**
 * The first cycle from now on with room for one more of this tier, after posts made and earlier ideas, and
 * under the client's ideas_per_cycle limit (any tier).
 */
function openCycle(c: ClientStatus, tier: TierKey, taken: Assignment[], tiers: Map<Assignment, TierKey>) {
  const cap = c.info.ideas_per_cycle;
  for (let n = Math.max(1, c.current); n <= c.cycles.length; n++) {
    const p = c.cycles[n - 1];
    const inCycle = taken.filter((a) => a.client === c.nickname && a.cycle === n);
    if (cap !== undefined && inCycle.length >= cap) continue;
    const used = p.made[tier] + inCycle.filter((a) => tiers.get(a) === tier).length;
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

  // The same reel or photo in two tiers: keep it in the highest tier, delete the lower copies, and keep
  // any client choices made on them.
  let changed = false;
  const rank: Record<string, number> = { bronze: 1, silver: 2, gold: 3 };
  const same = new Map<string, typeof links>();
  for (const l of links) {
    const id = isPhoto(l.url) ? `photo:${l.hash ?? l.path}` : `link:${linkKey(l.url)}`;
    same.set(id, [...(same.get(id) ?? []), l]);
  }
  const gone = new Set<SavedLink>();
  for (const group of same.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => rank[b.shelf] - rank[a.shelf]);
    const [keep, ...rest] = group;
    let merged = false;
    for (const l of rest) {
      try {
        await src.remove(l.path);
      } catch {
        continue; // try again next time
      }
      gone.add(l);
      for (const a of l.assigned) if (!keep.assigned.some((x) => x.client === a.client)) keep.assigned.push(a);
      for (const n of l.declined) if (!keep.declined.includes(n) && !keep.assigned.some((x) => x.client === n)) keep.declined.push(n);
      if (l.url !== keep.url) delete meta[linkKey(l.url)];
      merged = changed = true;
    }
    if (merged) meta[linkKey(keep.url)] = { assigned: keep.assigned.map((x) => ({ client: x.client, cycle: x.cycle, at: x.at })), declined: keep.declined };
  }
  if (gone.size) links.splice(0, links.length, ...links.filter((l) => !gone.has(l)));

  const byNick = new Map(clients.map((c) => [c.nickname, c]));
  const tiers = new Map<Assignment, TierKey>();
  for (const l of links) for (const a of l.assigned) tiers.set(a, tierOfShelf(l.shelf)!);
  const all = links.flatMap((l) => l.assigned);

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

  // A client with an ideas_per_cycle limit: a cycle holding more ideas than that keeps the ones queued first,
  // and the rest move on to the next cycles with room, in queue order.
  const linkOf = new Map<Assignment, SavedLink>();
  for (const l of links) for (const a of l.assigned) linkOf.set(a, l);
  for (const c of clients) {
    if (c.info.ideas_per_cycle === undefined) continue;
    const mine = all.filter((a) => a.client === c.nickname).sort((a, b) => a.cycle - b.cycle || a.at.localeCompare(b.at));
    const placed: Assignment[] = [];
    for (const a of mine) {
      const inCycle = placed.filter((x) => x.cycle === a.cycle).length;
      if (a.done || inCycle < c.info.ideas_per_cycle) {
        placed.push(a);
        continue;
      }
      const n = openCycle(c, tiers.get(a)!, placed, tiers);
      if (n && n !== a.cycle) {
        a.cycle = n;
        const l = linkOf.get(a)!;
        meta[linkKey(l.url)].assigned = l.assigned.map((x) => ({ client: x.client, cycle: x.cycle, at: x.at }));
        changed = true;
      }
      placed.push(a);
    }
  }
  if (changed) {
    try {
      await writeMeta(meta);
    } catch (err) {
      return { links, error: (err as Error).message };
    }
  }
  // Newest first; ties (or no date) by name.
  links.sort((a, b) => (b.added ?? "").localeCompare(a.added ?? "") || a.name.localeCompare(b.name));
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

// ── adding from the dashboard ────────────────────────────────

const MAX_PHOTO = 20 * 1024 * 1024;

/**
 * The name a pasted link is saved under, the way a phone would save it: an Instagram post or reel keeps its
 * code (DeAZsuwoiw6), anything else its site and page. Ideas are never given titles (CLAUDE.md).
 */
function linkName(url: URL) {
  const code = url.pathname.match(/^\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)?.[1];
  if (code) return code;
  const page = url.pathname.split("/").filter(Boolean).pop();
  return safeName(page ? `${url.hostname.replace(/^www\./, "")} ${page}` : url.hostname.replace(/^www\./, ""));
}

/**
 * Save a pasted link (as a .url file) or a photo into a tier's folder, under the name Lynda typed if she
 * gave one. Returns where it was saved.
 */
export async function addPostIdea(
  shelf: Shelf,
  idea: { link: string } | { photo: { name: string; bytes: Uint8Array } },
  name = ""
): Promise<string> {
  if (!SHELVES.includes(shelf)) throw new Error("Pick Bronze, Silver or Gold.");
  const src = source();
  if (!src) throw new Error("Dropbox isn't connected.");
  const given = safeName(name);

  if ("link" in idea) {
    let url: URL;
    try {
      url = new URL(idea.link.trim());
    } catch {
      throw new Error("That doesn't look like a link. Paste the whole thing, starting with https://");
    }
    if (url.protocol !== "https:") throw new Error("The link should start with https://");
    // The same reel saved twice would just be merged into one later, so say where it already is.
    for (const s of SHELVES) {
      const have = (await listShelf(s)).find((l) => !isPhoto(l.url) && linkKey(l.url) === linkKey(url.href));
      if (have) throw new Error(`That one's already saved in ${s[0].toUpperCase() + s.slice(1)} as "${have.name}".`);
    }
    const text = `[InternetShortcut]\nURL=${url.href}\n`;
    return src.upload(`${folderOf(shelf)}/${given || linkName(url)}.url`, new TextEncoder().encode(text));
  }

  const { name: file, bytes } = idea.photo;
  const ext = file.match(PHOTO)?.[0].toLowerCase();
  if (!ext) throw new Error("That should be a photo (JPG, PNG, HEIC, WebP or GIF).");
  if (!bytes.length) throw new Error("That photo is empty.");
  if (bytes.length > MAX_PHOTO) throw new Error("That photo is over 20 MB. Send a smaller copy.");
  const stem = given || safeName(file.slice(0, -ext.length)) || "photo";
  return src.upload(`${folderOf(shelf)}/${stem}${ext}`, bytes);
}

// ── moving, naming and deleting files ────────────────────────

/** Only link and photo files directly inside one of the ideas/ shelves can be changed. */
function checkPath(path: string) {
  const parts = path.split("/");
  const ok =
    parts[0] === ROOT &&
    IDEA_FILE.test(path) &&
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
  await source()!.move(path, `${dir}/${clean}${path.match(IDEA_FILE)![0]}`);
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
