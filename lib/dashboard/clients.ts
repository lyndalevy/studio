import { addOns, packages, type TierKey } from "@/content/social";
import { source, type Entry, type Source } from "./source";

/**
 * Everything the dashboard shows for one client, worked out from their folder
 * in the studio Dropbox:
 *
 *   <CLIENT>/client.json            package, add-ons, cycle start, billing
 *   <CLIENT>/CYCLE 1 - 10:19:26/... one folder per 2-week cycle (or SET), dated in its name
 *   11:17 BRONZE living-room.mp4    each post named by the day it posts (older ones: its week's Monday) and tier
 *   <CLIENT>/SET 1 .../captions.txt a post marked "(SCHEDULED)" or "(POSTED)" is scheduled
 *
 * A post's tier comes from what it is: a photo or an animated .mp4 is Bronze,
 * a carousel of 4+ slides is Silver, a filmed .mov reel is Gold. client.json can
 * override any one of them.
 */

export type ClientFile = {
  client: string;
  package: string | null;
  add_ons?: string[];
  extras?: { month: string; name: string }[];
  first_invoice?: string | null;
  due_days?: number;
  /** Invoices sent, by month (YYYY-MM) with the day it went out (YYYY-MM-DD). Set from the dashboard. */
  sent?: Record<string, string>;
  /** Months paid (YYYY-MM). Set from the dashboard. */
  paid?: string[];
  /** A month's invoice goes out on a different day than usual, e.g. {"2026-10": "2026-10-26"}. */
  send_dates?: Record<string, string>;
  /** The weekday this client's invoices go out, on the last one of each month (default "Wednesday"). */
  send_day?: string;
  /** false keeps the client off the dashboard calendar. */
  calendar?: boolean;
  /** true when Lynda picks up this client's checks in person: the invoice is due the Monday after it goes out
   * (instead of due_days), and the calendar shows a pickup that Monday. */
  pickup_checks?: boolean;
  /** true when the client pays by ACH: the payment is due the Monday after the invoice goes out, and the calendar
   * shows a reminder that Monday to check it went through. */
  ach?: boolean;
  /** true while work is on hold: no cycles, invoices, calendar dates or budget, and nothing moves to SHIPPED. */
  paused?: boolean;
  /** Days earlier than the usual Friday to schedule this client's cycles (and start making them). Set
   * automatically from the order clients started, so each client's work lands on its own day. */
  offset_days?: number;
  notes?: string;
  /** Profile links by platform name, e.g. {"Instagram": "https://www.instagram.com/..."}. */
  socials?: Record<string, string>;
  tiers?: Record<string, TierKey>;
  /** Monday the first cycle starts, YYYY-MM-DD. Defaults to the Monday of the first set. */
  cycle_start?: string;
  /** Short label for the post idea library, e.g. "MCB". Defaults to the client's initials. */
  nickname?: string;
  /** The most post ideas (inspos) queued into one cycle, across all tiers. No limit when left out. */
  ideas_per_cycle?: number;
};

export type Deliverable = {
  set: string;
  name: string;
  kind: "photo" | "carousel" | "video";
  tier: TierKey;
  /** The Monday of the post's week (from the "11:17 ..." date at the start of its name), else the set's date. */
  week: string | null;
  /** The day it posts, from the date at the start of its name (null when the name has none). */
  day: string | null;
  /** Scheduled in Linkme or already posted: either way, nothing left to do. */
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
  sent: string; // YYYY-MM-DD: the day it went out, or the day it should
  due: string;
  amount: number;
  lines: string[];
  status: "paid" | "overdue" | "sent" | "upcoming";
};

export type ClientStatus = {
  folder: string;
  info: ClientFile;
  /** Short label used in the post idea library ("MCB", "RDF"). */
  nickname: string;
  /** The cycle running now (1 = the first), 0 if cycles haven't started. */
  current: number;
  /** Every cycle from 1 to well past now, with what each needs and what's made (SHIPPED cycles included). */
  cycles: CyclePlan[];
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
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const zero = (): Record<TierKey, number> => ({ bronze: 0, silver: 0, gold: 0 });

const IMAGE = /\.(jpe?g|png|webp|heic)$/i;
const VIDEO = /\.(mp4|mov|m4v)$/i;
const NOT_A_POST = /(cover|grid-preview|safe-check)/i;
const WORK_FOLDERS = new Set(["raw", "ai", "work", "checks", "spare"]);
/** Where finished cycles go, inside each client's folder. */
const SHIPPED = "SHIPPED";

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

/**
 * "11:17 SILVER ..." (or the older "W2 10:26 ...") → its week, in the year of the folder it's in. Weeks run
 * Sunday to Saturday and are known by their Monday, so a Sunday post counts toward the Monday after it.
 */
function weekDate(name: string, folderDate: string | null): string | null {
  const day = postDay(name, folderDate);
  return day ? mondayOf(fromTime(toTime(day) + DAY)) : folderDate;
}

/** The date at the start of a post's name ("11:17 SILVER ..."), in the year of the folder it's in. */
function postDay(name: string, folderDate: string | null): string | null {
  const m = name.match(/^(?:W\d+\s+)?(\d{1,2})[:/](\d{1,2})\b/i);
  if (!m || !folderDate) return null;
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
      tier = /\.mov$/i.test(name) ? "gold" : "bronze";
    } else if (IMAGE.test(name)) {
      kind = "photo";
      tier = "bronze";
    } else continue;

    const named = name.match(/\b(BRONZE|SILVER|GOLD)\b/);
    if (named) tier = named[1].toLowerCase() as TierKey;
    tier = info.tiers?.[`${set}/${name}`] ?? tier;
    const stem = name.replace(/\.[^.]+$/, "").toLowerCase();
    const scheduled = markedLines.some((l) => headingFor(l, name, stem));
    items.push({ set, name, kind, tier, week: weekDate(name, date), day: postDay(name, date), scheduled });
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

  let entries = await src.list(folder);
  const topFolders = () =>
    entries
      .filter((e) => e.kind === "folder" && /^(set|cycle)\b/i.test(e.path.slice(folder.length + 1)) && !e.path.slice(folder.length + 1).includes("/"))
      .map((e) => e.path.slice(folder.length + 1));

  // A cycle folder moves into SHIPPED/ on its last Sunday, when the dashboard moves on to the next weeks, so
  // only live cycles stay in view.
  const ended = topFolders().filter((name) => {
    const date = /^cycle\b/i.test(name) ? setDate(name) : null;
    return !info.paused && date !== null && toTime(mondayOf(date)) + 13 * DAY <= toTime(today());
  });
  for (const name of ended) {
    try {
      await src.move(`${folder}/${name}`, `${folder}/${SHIPPED}/${name}`);
    } catch (err) {
      problems.push(`Couldn't move "${name}" into ${SHIPPED}: ${(err as Error).message}`);
    }
  }
  if (ended.length) entries = await src.list(folder);
  const setNames = topFolders();

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
  const anchor = info.paused
    ? null
    : /^\d{4}-\d{2}-\d{2}$/.test(info.cycle_start ?? "")
      ? mondayOf(info.cycle_start!)
      : firstSet && mondayOf(firstSet);
  // Posts in finished cycles (moved to SHIPPED/) still count toward their cycle.
  const shippedNames = entries
    .filter((e) => e.kind === "folder" && new RegExp(`^${SHIPPED}/cycle\\b`, "i").test(e.path.slice(folder.length + 1)))
    .map((e) => e.path.slice(folder.length + 1))
    .filter((n) => n.split("/").length === 2);
  const shipped = await Promise.all(
    shippedNames.map(async (name) => {
      const captions = (await src.read(`${folder}/${name}/captions.txt`)) ?? "";
      return deliverables(folder, name, setDate(name), entries, captions, info);
    })
  );
  const allItems = [...sets.flatMap((x) => x.items), ...shipped.flat()];
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
    // Shown Sunday to Saturday: the Sunday before its Monday through the Saturday before the next cycle.
    const label = `${shortDay(fromTime(toTime(start) - DAY))} – ${shortDay(fromTime(toTime(end) - DAY))}`;
    return { number: n, start, label, needed, made, scheduled };
  };
  // A cycle starts on the Sunday before its Monday.
  const current = anchor ? Math.max(1, Math.floor((toTime(today()) - toTime(anchor) + DAY) / (14 * DAY)) + 1) : 0;

  // Payments: invoices go out on the last Wednesday (or the client's send_day) of each month, starting the month of the first
  // invoice, and are due a set number of days after. Clients pay by check; the dashboard's buttons mark each one sent, then paid.
  const monthly = pkg ? pkg.price + (info.add_ons ?? []).reduce((n, a) => n + (priceOf(a) ?? 0), 0) : null;
  const invoices: Invoice[] = [];
  const first = /^\d{4}-\d{2}-\d{2}$/.test(info.first_invoice ?? "") ? info.first_invoice! : null;
  const dueDays = info.due_days ?? 7;

  if (first && monthly !== null && !info.paused) {
    const d = today();
    const day = WEEKDAYS.indexOf((info.send_day ?? "").toLowerCase());
    const weekday = day < 0 ? 3 : day; // Wednesday unless the client has a send_day
    const lastSendDay = (m: string) => {
      const end = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0));
      return fromTime(end.getTime() - ((end.getUTCDay() - weekday + 7) % 7) * DAY);
    };
    for (let m = first.slice(0, 7); m <= addMonths(now, 2); m = addMonths(m, 1)) {
      const went = info.sent?.[m];
      const sent = went ?? info.send_dates?.[m] ?? lastSendDay(m);
      const extras = (info.extras ?? []).filter((x) => x.month === m);
      const lines = [`${info.package} $${pkg!.price}`, ...(info.add_ons ?? []).map((a) => `${a} $${priceOf(a)}`)];
      let amount = monthly;
      for (const x of extras) {
        const p = priceOf(x.name) ?? 0;
        amount += p;
        lines.push(`${x.name} $${p}`);
      }
      // Checks picked up in person, and ACH payments, are due the Monday after the invoice goes out.
      const due = info.pickup_checks || info.ach
        ? fromTime(toTime(sent) + (((8 - new Date(toTime(sent)).getUTCDay()) % 7) || 7) * DAY)
        : fromTime(toTime(sent) + dueDays * DAY);
      const status: Invoice["status"] = (info.paid ?? []).includes(m)
        ? "paid"
        : went
          ? d > due
            ? "overdue"
            : "sent"
          : "upcoming";
      invoices.push({ month: m, label: monthLabel(m), sent, due, amount, lines, status });
    }
  }
  if (!first && monthly !== null && !info.paused) problems.push("No invoice sent yet. The payment schedule starts from the first one.");

  const nickname =
    (info.nickname ?? "").trim().toUpperCase() ||
    info.client
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();

  return {
    folder,
    info,
    nickname,
    current,
    cycles: current ? Array.from({ length: current + 26 }, (_, i) => plan(i + 1)!) : [],
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

let recent: { at: number; result: { clients: ClientStatus[]; error?: string } } | null = null;

/**
 * The clients as the dashboard last loaded them (if within a few minutes), for quick button taps
 * like assigning a post idea, so they don't re-read every client folder.
 */
export async function recentClients(): Promise<{ clients: ClientStatus[]; error?: string }> {
  if (recent && Date.now() - recent.at < 5 * 60_000) return recent.result;
  return loadClients();
}

/** Every client: each top-level folder in the studio Dropbox that has a client.json. */
export async function loadClients(): Promise<{ clients: ClientStatus[]; error?: string }> {
  const result = await readClients();
  if (!result.error) recent = { at: Date.now(), result };
  return result;
}

async function readClients(): Promise<{ clients: ClientStatus[]; error?: string }> {
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

/** Move a month's invoice to its next step: upcoming → sent (today) → paid. Saved in the client's client.json. */
export async function advanceInvoice(folder: string, month: string): Promise<void> {
  const src = source();
  if (!src) throw new Error("Dropbox isn't connected yet.");
  if (!folder || folder.includes("/") || folder.includes("..") || !/^\d{4}-\d{2}$/.test(month)) throw new Error("That isn't an invoice.");
  const raw = await src.read(`${folder}/client.json`);
  if (raw === null) throw new Error("That isn't a client folder.");
  const info = JSON.parse(raw) as ClientFile;
  if ((info.paid ?? []).includes(month)) return;
  if (info.sent?.[month]) {
    info.paid = [...(info.paid ?? []), month].sort();
  } else {
    info.sent = { ...(info.sent ?? {}), [month]: today() };
  }
  await src.write(`${folder}/client.json`, JSON.stringify(info, null, 2) + "\n");
  recent = null;
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
