import { source } from "./source";

/** STUDIO L/ideas.json in the studio Dropbox folder: things to film for Lynda's own accounts. */
export type IdeaStatus = "to film" | "filmed" | "posted";
export type Idea = {
  id: string;
  text: string;
  status: IdeaStatus;
  /** YYYY-MM-DD. */
  added: string;
  /** A reel or post to look at, if there is one ("photo:<Dropbox id>" for a photo saved in ideas/business). */
  link?: string;
  /** For ideas brought in from ideas/business: that file's name, without its extension. */
  file?: string;
};

export const STATUSES: IdeaStatus[] = ["to film", "filmed", "posted"];
const FILE = "STUDIO L/ideas.json";
/** Links (Instagram reels shared to Dropbox as .url files) and photos saved here show up as ideas on their own. */
const BUSINESS = "ideas/business";

export async function loadIdeas(): Promise<{ ideas: Idea[]; error?: string }> {
  const src = source();
  if (!src) return { ideas: [] };
  const raw = await src.read(FILE);
  if (raw === null) return { ideas: [] };
  try {
    const ideas = (JSON.parse(raw) as { ideas?: Idea[] }).ideas ?? [];
    return { ideas };
  } catch {
    return { ideas: [], error: "ideas.json isn't valid JSON. Check for a missing comma or quote." };
  }
}

/** Read, change and save the list in one go. */
export async function updateIdeas(change: (ideas: Idea[]) => Idea[]): Promise<void> {
  const src = source();
  if (!src) throw new Error("Dropbox isn't connected yet.");
  const { ideas, error } = await loadIdeas();
  if (error) throw new Error(error);
  await src.write(FILE, JSON.stringify({ ideas: change(ideas) }, null, 2) + "\n");
}

/** A link without its tracking query, so the same reel shared twice still matches. */
const key = (u: string) => u.replace(/\?.*$/, "").replace(/\/$/, "");

const LINK = /\.(url|webloc)$/i;
const PHOTO = /\.(jpe?g|png|heic|heif|webp|gif)$/i;

async function businessFiles(): Promise<{ path: string; id?: string }[]> {
  const src = source();
  if (!src) return [];
  try {
    return (await src.list(BUSINESS, false)).filter(
      (e) => e.kind === "file" && (LINK.test(e.path) || PHOTO.test(e.path)) && !e.path.split("/").pop()!.startsWith("._")
    );
  } catch {
    return []; // no ideas/business folder yet
  }
}

/** Each link with the reel it points to; each photo as "photo:<Dropbox id>" (its id survives a rename). */
async function readLinks(files: { path: string; id?: string }[]): Promise<{ path: string; name: string; url: string }[]> {
  const src = source()!;
  const out: { path: string; name: string; url: string }[] = files
    .filter((f) => PHOTO.test(f.path))
    .map((f) => ({ path: f.path, name: f.path.split("/").pop()!.replace(PHOTO, ""), url: `photo:${f.id ?? f.path}` }));
  const read = await Promise.all(
    files.filter((f) => LINK.test(f.path)).map(async (f) => ({ path: f.path, text: (await src.read(f.path)) ?? "" }))
  );
  for (const { path, text } of read) {
    const url = text.match(/^URL=(\S+)/m)?.[1] ?? text.match(/<string>(https?:[^<]+)<\/string>/)?.[1];
    if (url) out.push({ path, name: path.split("/").pop()!.replace(LINK, ""), url: url.trim() });
  }
  return out;
}

/** Delete the ideas/business link file for this reel, so a deleted idea doesn't come back. */
export async function removeBusinessLink(link: string): Promise<void> {
  const src = source();
  if (!src) return;
  for (const l of await readLinks(await businessFiles())) {
    if (key(l.url) === key(link)) await src.remove(l.path);
  }
}

/**
 * Bring in every link saved in ideas/business that isn't an idea yet, and keep their names in step
 * when a link file is renamed. Ideas already on the list keep their step (to film, filmed, posted).
 */
export async function syncBusinessLinks(day: string): Promise<string | null> {
  const src = source();
  if (!src) return null;
  const files = await businessFiles();
  const links = await readLinks(files);
  if (!links.length) return null;

  const { ideas, error } = await loadIdeas();
  if (error) return error;
  let changed = false;
  const next = ideas.map((i) => {
    const l = i.link && links.find((x) => key(x.url) === key(i.link!));
    // renamed link file: follow the new name unless the idea was retyped by hand
    if (l && i.file !== undefined && i.file !== l.name && i.text === i.file) {
      changed = true;
      return { ...i, text: l.name, file: l.name };
    }
    return i;
  });
  for (const l of links) {
    if (next.some((i) => i.link && key(i.link) === key(l.url))) continue;
    next.unshift({ id: crypto.randomUUID(), text: l.name, status: "to film", added: day, link: l.url, file: l.name });
    changed = true;
  }
  if (!changed) return null;
  try {
    await src.write(FILE, JSON.stringify({ ideas: next }, null, 2) + "\n");
  } catch (err) {
    return (err as Error).message;
  }
  return null;
}
