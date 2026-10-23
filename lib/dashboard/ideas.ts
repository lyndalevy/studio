import { source } from "./source";

/** ideas.json, in the top of the studio Dropbox folder: things to film for Lynda's own accounts. */
export type IdeaStatus = "to film" | "filmed" | "posted";
export type Idea = {
  id: string;
  text: string;
  /** Which account it's for. */
  for: "Social" | "Photography";
  status: IdeaStatus;
  /** YYYY-MM-DD. */
  added: string;
};

export const STATUSES: IdeaStatus[] = ["to film", "filmed", "posted"];
const FILE = "ideas.json";

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
