import { source } from "./source";

/**
 * The post idea library in Dropbox: Instagram links (.url files) saved from the phone into ideas/,
 * sorted by tier in ideas/bronze, ideas/silver and ideas/gold. Links saved straight into ideas/ are unsorted.
 * (ideas/business is Lynda's own and shows in "Ideas to film" instead.)
 */
export type Shelf = "unsorted" | "bronze" | "silver" | "gold" | "business";
export type SavedLink = { shelf: Shelf; name: string; url: string; path: string };

export const SHELVES: Shelf[] = ["unsorted", "bronze", "silver", "gold"];
const ROOT = "ideas";
const folderOf = (shelf: Shelf) => (shelf === "unsorted" ? ROOT : `${ROOT}/${shelf}`);
const LINK = /\.(url|webloc)$/i;

export async function loadLibrary(): Promise<{ links: SavedLink[]; error?: string }> {
  const src = source();
  if (!src) return { links: [] };
  const links: SavedLink[] = [];
  for (const shelf of SHELVES) {
    let files: string[];
    try {
      files = (await src.list(folderOf(shelf), false))
        .filter((e) => e.kind === "file" && LINK.test(e.path) && !e.path.split("/").pop()!.startsWith("._"))
        .map((e) => e.path);
    } catch {
      continue; // that folder isn't there yet
    }
    for (const path of files) {
      const text = (await src.read(path)) ?? "";
      const url = text.match(/^URL=(\S+)/m)?.[1] ?? text.match(/<string>(https?:[^<]+)<\/string>/)?.[1];
      if (url) links.push({ shelf, name: path.split("/").pop()!.replace(LINK, ""), url: url.trim(), path });
    }
  }
  links.sort((a, b) => a.name.localeCompare(b.name));
  return { links };
}

/** Only link files directly inside ideas/ or one of its shelves can be moved or deleted. */
function checkPath(path: string) {
  const parts = path.split("/");
  const ok =
    parts[0] === ROOT &&
    LINK.test(path) &&
    !path.includes("..") &&
    (parts.length === 2 || (parts.length === 3 && [...SHELVES, "business"].includes(parts[1] as Shelf)));
  if (!ok) throw new Error("That isn't a saved link.");
}

/** Move a link to another shelf (a tier, unsorted, or business). */
export async function moveLink(path: string, to: Shelf): Promise<void> {
  const src = source();
  if (!src) throw new Error("Dropbox isn't connected yet.");
  checkPath(path);
  if (![...SHELVES, "business"].includes(to)) throw new Error("That isn't a tier.");
  await src.move(path, `${folderOf(to)}/${path.split("/").pop()}`);
}

/** Delete a link file (Dropbox keeps it in Deleted files for 30 days). */
export async function deleteLink(path: string): Promise<void> {
  const src = source();
  if (!src) throw new Error("Dropbox isn't connected yet.");
  checkPath(path);
  await src.remove(path);
}
