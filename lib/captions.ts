import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Captions for one feed, read from content/captions/<feed>.txt.
 *
 * The file is plain text so it can be edited anywhere. Each post starts with
 * a line like "== 03-steak ==" and its caption is everything up to the next
 * one. Anything above the first post is notes and is ignored.
 */
export async function loadCaptions(feed: string): Promise<Record<string, string>> {
  let text: string;
  try {
    text = await readFile(path.join(process.cwd(), "content", "captions", `${feed}.txt`), "utf8");
  } catch {
    return {};
  }

  const captions: Record<string, string> = {};
  const parts = text.split(/^==\s*(.+?)\s*==\s*$/m);
  // split() with a capture group gives [notes, name, body, name, body, ...]
  for (let i = 1; i < parts.length; i += 2) {
    captions[parts[i]] = parts[i + 1].trim();
  }
  return captions;
}
