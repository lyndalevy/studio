import { addOns, packages, type TierKey } from "@/content/social";
import { source, type Entry, type Source } from "./source";
import { stripeInvoices, type StripeInvoice } from "./stripe";

/**
 * Everything the dashboard shows for one client, worked out from their folder
 * in the studio Dropbox:
 *
 *   <CLIENT>/client.json            package, add-ons, cycle start, billing
 *   <CLIENT>/CYCLE 1 - 10:19:26/... one folder per 2-week cycle (or SET), dated in its name
 *   10:26 SILVER living-room.mp4    each post named by its week's Monday and tier
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
  first_invoice?: string | null;
  due_days?: number;
  stripe_customer?: string;
  paid?: string[];
  notes?: string;
  tiers?: Record<string, TierKey>;
  /** Monday the first cycle starts, YYYY-MM-DD. Defaults to the Monday of the first set. */
  cycle_start?: string;
};

export type Deliverable = {
  set: string;
  name: string;
  kind: "photo" | "carousel" | "video";
  tier: TierKey;
  /** The Monday of the post's week (from "10:26 ..." at the start of its name), else the set's date. */
  week: string | null;
  /** Scheduled in LinkMe or already posted: either way, nothing left to do. */
  scheduled: boolean;
};

export type CyclePlan = {
  number: number; // 1 = the first cycle
  start: string; // Monday, YYYY-MM-DD
  label: string; // "Oct 19 – Nov 1"
  needed: Record<TierKey, number>;
  made: Record<TierKey, number>;
  scheduled: number;
};

export type Invoice = {
  month: string;
  label: string;
  sent: string; // YYYY-MM-DD (actual from Stripe, or projected)
  due: string;
  amount: number;
  lines: string[];
  status: "paid" | "overdue" | "sent" | "not sent" | "upcoming";
  number: string | null; // Stripe invoice number, once it exists
  url: string | null; // Stripe's hosted invoice page
};

export type ClientStatus = {
  folder: string;
  info: ClientFile;
  monthly: number | null;
  perWeek: Record<TierKey, number>;
  sets: { name: string; date: string | null; items: Deliverable[] }[];
  loose: string[];
  thisCycle: CyclePlan | null;
  nextCycle: CyclePlan | null;
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
const DAY = 86_400_000;
const toTime = (d: string) => Date.parse(`${d}T00:00:00Z`);
const fromTime = (t: number) => new Date(t).toISOString().slice(0, 10);
/** The Monday on or before a date. */
const mondayOf = (d: string) => {
  const t = toTime(d);
  return fromTime(t - ((new Date(t).getUTCDay() + 6) % 7) * DAY);
};
const shortDay = (d: string) =>
  new Date(toTime(d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** "10:26 SILVER ..." (or the older "W2 10:26 ...") → that Monday, in the year of the folder it's in. */
function weekDate(name: string, folderDate: string | null): string | null {
  const m = name.match(/^(?:W\d+\s+)?(\d{1,2})[:/](\d{1,2})\b/i);
  if (!m || !folderDate) return folderDate;
  let year = Number(folderDate.slice(0, 4));
  if (Number(m[1]) < Number(folderDate.slice(5, 7))) year++; // a cycle running into January
  return `${monthKey(year, Number(m[1]))}-${m[2].padStart(2, "0")}`;
}

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

function deliverables(
  folder: string,
  set: string,
  date: string | null,
  entries: Entry[],
  captions: string,
  info: ClientFile
): Deliverable[] {
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

    const named = name.match(/\b(BRONZE|SILVER|GOLD)\b/);
    if (named) tier = named[1].toLowerCase() as TierKey;
    tier = info.tiers?.[`${set}/${name}`] ?? tier;
    const stem = name.replace(/\.[^.]+$/, "").toLowerCase();
    const scheduled = markedLines.some((l) => headingFor(l, name, stem));
    items.push({ set, name, kind, tier, week: weekDate(name, date), scheduled });
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
    .filter((e) => e.kind === "folder" && /^(set|cycle)\b/i.test(e.path.slice(folder.length + 1)) && !e.path.slice(folder.length + 1).includes("/"))
    .map((e) => e.path.slice(folder.length + 1));

  const sets = await Promise.all(
    setNames.map(async (name) => {
      const captions = (await src.read(`${folder}/${name}/captions.txt`)) ?? "";
      const date = setDate(name);
      return { name, date, items: deliverables(folder, name, date, entries, captions, info) };
    })
  );
  sets.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.name.localeCompare(b.name, undefined, { numeric: true }));
  for (const s of sets) if (!s.date) problems.push(`"${s.name}" has no date in its name, so it isn't counted in a cycle.`);

  // Finished reels sitting in the client folder, not in a set yet.
  const loose = entries
    .filter((e) => e.kind === "file" && !e.path.slice(folder.length + 1).includes("/"))
    .map((e) => e.path.slice(folder.length + 1))
    .filter((n) => VIDEO.test(n) && !NOT_A_POST.test(n));

  const perWeek = perWeekFor(info);
  const now = today().slice(0, 7);
  // Cycles: two weeks each, counted from cycle_start (or the Monday of the first dated set).
  const firstSet = sets.find((x) => x.date)?.date ?? null;
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(info.cycle_start ?? "") ? mondayOf(info.cycle_start!) : firstSet && mondayOf(firstSet);
  const allItems = sets.flatMap((x) => x.items);
  const plan = (n: number): CyclePlan | null => {
    if (!anchor || n < 1) return null;
    const start = fromTime(toTime(anchor) + (n - 1) * 14 * DAY);
    const end = fromTime(toTime(start) + 13 * DAY);
    const needed = zero();
    const made = zero();
    let scheduled = 0;
    for (const t of TIERS) needed[t] = perWeek[t] * 2;
    for (const it of allItems.filter((x) => x.week && x.week >= start && x.week <= end)) {
      made[it.tier]++;
      if (it.scheduled) scheduled++;
    }
    return { number: n, start, label: `${shortDay(start)} – ${shortDay(end)}`, needed, made, scheduled };
  };
  const current = anchor ? Math.max(1, Math.floor((toTime(today()) - toTime(anchor)) / (14 * DAY)) + 1) : 0;

  // Payments: monthly on the same day as the first invoice (the "nth"), due a set number of days
  // later. Real invoices come from Stripe when it's connected; the rest of the schedule is projected.
  const monthly = pkg ? pkg.price + (info.add_ons ?? []).reduce((n, a) => n + (priceOf(a) ?? 0), 0) : null;
  const invoices: Invoice[] = [];
  let real: StripeInvoice[] | null = null;
  try {
    real = info.stripe_customer ? await stripeInvoices(info.stripe_customer) : null;
  } catch (err) {
    problems.push((err as Error).message);
  }
  const sentReal = (real ?? []).filter((i) => i.sent && i.status !== "void").sort((a, b) => a.sent!.localeCompare(b.sent!));
  const drafts = (real ?? []).filter((i) => i.status === "draft");
  const first = sentReal[0]?.sent ?? (/^\d{4}-\d{2}-\d{2}$/.test(info.first_invoice ?? "") ? info.first_invoice! : null);
  const dueDays =
    sentReal[0]?.due && sentReal[0].sent
      ? Math.round((toTime(sentReal[0].due) - toTime(sentReal[0].sent)) / DAY)
      : (info.due_days ?? 7);

  if (first && monthly !== null) {
    const d = today();
    const nth = Number(first.slice(8, 10));
    const onNth = (m: string) => {
      const last = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).getUTCDate();
      return `${m}-${String(Math.min(nth, last)).padStart(2, "0")}`;
    };
    for (let m = first.slice(0, 7), i = 0; m <= addMonths(now, 2); m = addMonths(m, 1), i++) {
      const sent = onNth(m);
      const r = sentReal[i];
      const extras = (info.extras ?? []).filter((x) => x.month === m);
      const lines = [`${info.package} $${pkg!.price}`, ...(info.add_ons ?? []).map((a) => `${a} $${priceOf(a)}`)];
      let amount = monthly;
      for (const x of extras) {
        const p = priceOf(x.name) ?? 0;
        amount += p;
        lines.push(`${x.name} $${p}`);
      }
      const due = r?.due ?? fromTime(toTime(sent) + dueDays * DAY);
      let status: Invoice["status"];
      if (r) status = r.status === "paid" ? "paid" : r.status === "uncollectible" || d > due ? "overdue" : "sent";
      else if ((info.paid ?? []).includes(m)) status = "paid";
      else if (real && d >= sent) status = "not sent";
      else status = d > due ? "overdue" : d >= sent ? "sent" : "upcoming";
      invoices.push({
        month: m,
        label: monthLabel(m),
        sent: r?.sent ?? sent,
        due,
        amount: r?.amount ?? amount,
        lines,
        status,
        number: r?.number ?? null,
        url: r?.url ?? null,
      });
    }
  }
  if (!first && monthly !== null) problems.push("No invoice sent yet. The payment schedule starts from the first one.");
  if (drafts.length) problems.push(`${drafts.length} unsent draft invoice${drafts.length > 1 ? "s" : ""} in Stripe.`);

  return {
    folder,
    info,
    monthly,
    perWeek,
    sets,
    loose,
    thisCycle: plan(current),
    nextCycle: plan(current + 1),
    invoices,
    minimumEnds: first ? monthLabel(addMonths(first.slice(0, 7), 2)) : null,
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
