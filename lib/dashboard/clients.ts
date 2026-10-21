import { addOns, packages, type TierKey } from "@/content/social";
import { source, type Entry, type Source } from "./source";

/**
 * Everything the dashboard shows for one client, worked out from their folder
 * in the studio Dropbox:
 *
 *   <CLIENT>/client.json            package, add-ons, start month, payments
 *   <CLIENT>/SET 1 - 10:20:26/...   one folder per set, dated in its name
 *   <CLIENT>/SET 1 .../captions.txt a post marked "(SCHEDULED)" or "(POSTED)" is scheduled
 *
 * A post's tier comes from what it is: a photo is Bronze, a carousel of 4+
 * slides or an .mp4 is Silver, a filmed .mov reel is Gold. client.json can
 * override any one of them.
 */

export type ClientFile = {
  client: string;
  package: string | null;
  add_ons?: string[];
  extras?: { month: string; name: string }[];
  start?: string;
  stripe_customer?: string;
  paid?: string[];
  notes?: string;
  tiers?: Record<string, TierKey>;
};

export type Deliverable = {
  set: string;
  name: string;
  kind: "photo" | "carousel" | "video";
  tier: TierKey;
  /** Scheduled in LinkMe or already posted: either way, nothing left to do. */
  scheduled: boolean;
};

export type MonthPlan = {
  month: string; // YYYY-MM
  label: string; // "November 2026"
  weeks: number;
  needed: Record<TierKey, number>;
  made: Record<TierKey, number>;
  scheduled: number;
};

export type Invoice = {
  month: string;
  label: string;
  sent: string; // YYYY-MM-DD
  due: string;
  amount: number;
  lines: string[];
  status: "paid" | "overdue" | "due" | "upcoming";
};

export type ClientStatus = {
  folder: string;
  info: ClientFile;
  monthly: number | null;
  perWeek: Record<TierKey, number>;
  sets: { name: string; date: string | null; items: Deliverable[] }[];
  loose: string[];
  thisMonth: MonthPlan;
  nextMonth: MonthPlan;
  invoices: Invoice[];
  minimumEnds: string | null;
  problems: string[];
};

const TIERS: TierKey[] = ["bronze", "silver", "gold"];
const zero = (): Record<TierKey, number> => ({ bronze: 0, silver: 0, gold: 0 });

const IMAGE = /\.(jpe?g|png|webp|heic)$/i;
const VIDEO = /\.(mp4|mov|m4v)$/i;
const NOT_A_POST = /(cover|grid-preview|safe-check)/i;
const WORK_FOLDERS = new Set(["raw", "ai", "work", "checks", "spare"]);

// ── dates ────────────────────────────────────────────────────

/** Today in New Jersey, as YYYY-MM-DD. */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
const addMonths = (key: string, n: number) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return monthKey(d.getUTCFullYear(), d.getUTCMonth() + 1);
};
const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
};
/** Posting weeks in a month: one per Monday. */
const mondays = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  let n = 0;
  for (let d = 1; d <= new Date(Date.UTC(y, m, 0)).getUTCDate(); d++) {
    if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 1) n++;
  }
  return n;
};

/** "SET 2 - 10:27:26" → 2026-10-27. Finder shows the colons as slashes, so accept those too. */
function setDate(name: string): string | null {
  const m = name.match(/(\d{1,2})[:/.\-](\d{1,2})[:/.\-](\d{2,4})\s*$/);
  if (!m) return null;
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return `${monthKey(year, Number(m[1]))}-${m[2].padStart(2, "0")}`;
}

// ── packages ─────────────────────────────────────────────────

const tierOf = (text: string): TierKey | null =>
  (TIERS.find((t) => text.toLowerCase().includes(t)) as TierKey | undefined) ?? null;

function perWeekFor(info: ClientFile): Record<TierKey, number> {
  const counts = zero();
  const pkg = packages.find((p) => p.name === info.package);
  for (const item of pkg?.perWeek ?? []) {
    const tier = tierOf(item);
    if (tier) counts[tier] += parseInt(item, 10) || 1;
  }
  for (const name of info.add_ons ?? []) {
    const tier = /^\+1/.test(name) ? tierOf(name) : null;
    if (tier) counts[tier] += 1;
  }
  return counts;
}

const priceOf = (name: string) => {
  const a = addOns.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return a ? Number(a.price.replace(/[^\d.]/g, "")) : null;
};

// ── deliverables ─────────────────────────────────────────────

/** "(SCHEDULED)" or "(POSTED)" after a post's name in captions.txt. */
const MARK = /\((scheduled|posted)\)/i;

/** Is this captions.txt line the heading for a post? (lower-cased line, file name, stem) */
const headingFor = (line: string, name: string, stem: string) =>
  line.startsWith(name.toLowerCase()) || line.startsWith(stem);

function deliverables(folder: string, set: string, entries: Entry[], captions: string, info: ClientFile): Deliverable[] {
  const prefix = `${folder}/${set}/`;
  const inSet = entries.filter((e) => e.path.startsWith(prefix));
  const children = inSet.filter((e) => !e.path.slice(prefix.length).includes("/"));
  const markedLines = captions
    .split("\n")
    .filter((l) => MARK.test(l))
    .map((l) => l.trim().toLowerCase());

  const items: Deliverable[] = [];
  for (const e of children) {
    const name = e.path.slice(prefix.length);
    if (NOT_A_POST.test(name) || WORK_FOLDERS.has(name.toLowerCase())) continue;
    let kind: Deliverable["kind"];
    let tier: TierKey;
    if (e.kind === "folder") {
      const slides = inSet.filter((s) => s.kind === "file" && s.path.startsWith(`${e.path}/`) && IMAGE.test(s.path)).length;
      if (!slides) continue;
      kind = "carousel";
      tier = slides >= 4 ? "silver" : "bronze";
    } else if (VIDEO.test(name)) {
      kind = "video";
      tier = /\.mov$/i.test(name) ? "gold" : "silver";
    } else if (IMAGE.test(name)) {
      kind = "photo";
      tier = "bronze";
    } else continue;

    tier = info.tiers?.[`${set}/${name}`] ?? tier;
    const stem = name.replace(/\.[^.]+$/, "").toLowerCase();
    const scheduled = markedLines.some((l) => headingFor(l, name, stem));
    items.push({ set, name, kind, tier, scheduled });
  }
  return items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

// ── one client ───────────────────────────────────────────────

async function load(src: Source, folder: string, raw: string): Promise<ClientStatus> {
  const problems: string[] = [];
  let info: ClientFile;
  try {
    info = JSON.parse(raw) as ClientFile;
  } catch {
    info = { client: folder, package: null };
    problems.push("client.json isn't valid JSON, so nothing else in it could be read.");
  }

  const pkg = packages.find((p) => p.name === info.package);
  if (!pkg) {
    problems.push(
      info.package
        ? `"${info.package}" isn't a package. Use ${packages.map((p) => p.name).join(", ")}.`
        : "No package set in client.json yet."
    );
  }
  const unknown = (info.add_ons ?? []).filter((a) => priceOf(a) === null);
  if (unknown.length) problems.push(`Unknown add-on: ${unknown.join(", ")}.`);

  const entries = await src.list(folder);
  const setNames = entries
    .filter((e) => e.kind === "folder" && /^set\b/i.test(e.path.slice(folder.length + 1)) && !e.path.slice(folder.length + 1).includes("/"))
    .map((e) => e.path.slice(folder.length + 1));

  const sets = await Promise.all(
    setNames.map(async (name) => {
      const captions = (await src.read(`${folder}/${name}/captions.txt`)) ?? "";
      return { name, date: setDate(name), items: deliverables(folder, name, entries, captions, info) };
    })
  );
  sets.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.name.localeCompare(b.name, undefined, { numeric: true }));
  for (const s of sets) if (!s.date) problems.push(`"${s.name}" has no date in its name, so it isn't counted in a month.`);

  // Finished reels sitting in the client folder, not in a set yet.
  const loose = entries
    .filter((e) => e.kind === "file" && !e.path.slice(folder.length + 1).includes("/"))
    .map((e) => e.path.slice(folder.length + 1))
    .filter((n) => VIDEO.test(n) && !NOT_A_POST.test(n));

  const perWeek = perWeekFor(info);
  const now = today().slice(0, 7);
  const plan = (month: string): MonthPlan => {
    const weeks = mondays(month);
    const needed = zero();
    const made = zero();
    let scheduled = 0;
    for (const t of TIERS) needed[t] = perWeek[t] * weeks;
    for (const s of sets.filter((x) => x.date?.startsWith(month))) {
      for (const it of s.items) {
        made[it.tier]++;
        if (it.scheduled) scheduled++;
      }
    }
    return { month, label: monthLabel(month), weeks, needed, made, scheduled };
  };

  // Payments: an invoice on the 1st of every month from the start, due 7 days later.
  const monthly = pkg ? pkg.price + (info.add_ons ?? []).reduce((n, a) => n + (priceOf(a) ?? 0), 0) : null;
  const invoices: Invoice[] = [];
  const start = /^\d{4}-\d{2}$/.test(info.start ?? "") ? info.start! : null;
  if (!start) problems.push('Add a start month to client.json, like "start": "2026-10".');
  if (start && monthly !== null) {
    const d = today();
    for (let m = start; m <= addMonths(now, 2); m = addMonths(m, 1)) {
      const extras = (info.extras ?? []).filter((x) => x.month === m);
      const lines = [`${info.package} ${"$" + pkg!.price}`, ...(info.add_ons ?? []).map((a) => `${a} $${priceOf(a)}`)];
      let amount = monthly;
      for (const x of extras) {
        const p = priceOf(x.name) ?? 0;
        amount += p;
        lines.push(`${x.name} $${p}`);
      }
      const sent = `${m}-01`;
      const due = `${m}-08`;
      const status: Invoice["status"] = (info.paid ?? []).includes(m)
        ? "paid"
        : d > due
          ? "overdue"
          : d >= sent
            ? "due"
            : "upcoming";
      invoices.push({ month: m, label: monthLabel(m), sent, due, amount, lines, status });
    }
  }

  return {
    folder,
    info,
    monthly,
    perWeek,
    sets,
    loose,
    thisMonth: plan(now),
    nextMonth: plan(addMonths(now, 1)),
    invoices,
    minimumEnds: start ? monthLabel(addMonths(start, 2)) : null,
    problems,
  };
}

/** Every client: each top-level folder in the studio Dropbox that has a client.json. */
export async function loadClients(): Promise<{ clients: ClientStatus[]; error?: string }> {
  const src = source();
  if (!src) return { clients: [], error: "Dropbox isn't connected yet." };
  try {
    const top = (await src.list("", false)).filter((e) => e.kind === "folder");
    const found = await Promise.all(
      top.map(async (f) => ({ folder: f.path, raw: await src.read(`${f.path}/client.json`) }))
    );
    const clients = await Promise.all(
      found.filter((f) => f.raw !== null).map((f) => load(src, f.folder, f.raw!))
    );
    return { clients: clients.sort((a, b) => a.info.client.localeCompare(b.info.client)) };
  } catch (err) {
    return { clients: [], error: (err as Error).message };
  }
}

/**
 * Mark a post scheduled, or clear it, by editing the heading line in its set's
 * captions.txt. A post with no heading yet gets one added at the end.
 */
export async function setScheduled(folder: string, set: string, name: string, on: boolean): Promise<void> {
  const src = source();
  if (!src) throw new Error("Dropbox isn't connected yet.");
  const safe = (p: string) => p.length > 0 && !p.includes("/") && !p.includes("..");
  if (!safe(folder) || !safe(set) || !safe(name) || !/^set\b/i.test(set)) throw new Error("That isn't a post.");
  if ((await src.read(`${folder}/client.json`)) === null) throw new Error("That isn't a client folder.");

  const file = `${folder}/${set}/captions.txt`;
  const lines = ((await src.read(file)) ?? "").split("\n");
  const stem = name.replace(/\.[^.]+$/, "").toLowerCase();
  const i = lines.findIndex((l) => headingFor(l.trim().toLowerCase(), name, stem));
  if (i === -1) {
    if (!on) return;
    lines.push("", `${name}  (SCHEDULED)`);
  } else {
    const bare = lines[i].replace(/\s*\((scheduled|posted)\)/gi, "").trimEnd();
    lines[i] = on ? `${bare}  (SCHEDULED)` : bare;
  }
  await src.write(file, lines.join("\n"));
}
