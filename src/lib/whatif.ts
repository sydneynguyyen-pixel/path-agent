import { options, progress, syllabi, terms, TRANSFER_MIN_UNITS, TERM_LOAD_LIMIT, TERM_LOAD_MAX, TUITION_PER_UNIT } from "@/data/scenario";
import { isPileup } from "@/lib/weeks";

export type StatsChoice = "stat2" | "math13" | "psyc5" | "bus21" | "skip";

/** A sandbox draft. It never touches the real plan. A null `stats` means "whatever you hold now". */
export type WhatIf = { dropped: string[]; stats: StatsChoice | null; internship: boolean; termOff: boolean; early: boolean };
export const NO_CHANGE: WhatIf = { dropped: [], stats: null, internship: false, termOff: false, early: false };

export const OFF_TERM = "Spring 2028";
export const WINTER_CLASSES = syllabi.map((s) => s.course);

const STATS: Record<StatsChoice, { name: string; units: number; quarter: number; optionId?: string }> = {
  stat2: { name: "STAT 2", units: 3.3, quarter: 5 },
  math13: { name: "MATH 13", units: 3.3, quarter: 5, optionId: "math13" },
  psyc5: { name: "PSYC 5", units: 3.3, quarter: 5, optionId: "psyc5" },
  bus21: { name: "BUS 21", units: 2.7, quarter: 4, optionId: "bus21" },
  skip: { name: "No statistics", units: 0, quarter: 0 },
};
export const STATS_CHOICES = Object.keys(STATS) as StatsChoice[];
export const statsName = (c: StatsChoice) => STATS[c].name;

/** A seat the student already holds becomes the starting point. */
export function statsFromSeat(chosenId: string | null, seatHeld: boolean): StatsChoice {
  if (!seatHeld) return "stat2";
  return STATS_CHOICES.find((c) => c !== "stat2" && c !== "skip" && STATS[c].optionId === chosenId) ?? "stat2";
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const CLASS_UNITS = 3.3;
const CLASS_QUARTER = 5;
const CATCH_UP_COURSE = 3;
const WEEKS = 8;

const unitsOf = (label: string) => parseFloat(label);
/** Terms after transfer. Bayview terms other than Winter are fixed and only count toward transfer units. */
const plannedTerms = terms.filter((t) => t.status === "planned" && t.school === "northgate").map((t) => ({ id: t.id, name: t.name, units: t.courses.reduce((n, c) => n + unitsOf(c.units), 0) }));

const termOrder = (name: string) => {
  const [season, year] = name.split(" ");
  return Number(year) * 2 + (season === "Fall" ? 1 : 0);
};
const nextTerm = (name: string) => {
  const [season, year] = name.split(" ");
  return season === "Fall" ? `Spring ${Number(year) + 1}` : `Fall ${year}`;
};

export type TermState = "same" | "heavier" | "lighter" | "new" | "off" | "bayview" | "unused";
export type TermBar = { id: string; name: string; units: number; baseUnits: number; state: TermState };
export type TransferStatus = "ready" | "conditional" | "review" | "blocked";
export type Note = { text: string; sourceId?: string; alert?: boolean };

export type Projection = {
  stats: StatsChoice;
  graduation: string;
  unitsAtTransfer: number;
  winterUnits: number;
  transfer: TransferStatus;
  transferTerm: string;
  weekLoad: number[];
  pileups: number[];
  tuition: number;
  bars: TermBar[];
};

function weekLoads(dropped: string[], stats: StatsChoice) {
  const loads = Array.from({ length: WEEKS }, () => 0);
  const add = (week: number) => (loads[week - 1] = (loads[week - 1] ?? 0) + 1);
  for (const s of syllabi) if (!dropped.includes(s.course)) s.items.forEach((i) => add(i.week));
  const optionId = STATS[stats].optionId;
  options.find((o) => o.id === optionId)?.deadlines.forEach((d) => add(d.week));
  return loads;
}

/** Works out a plan from the same rules every time, so the same change always gives the same answer. */
export function project(change: WhatIf, currentStats: StatsChoice): Projection {
  const stats = change.stats ?? currentStats;
  const kept = WINTER_CLASSES.filter((c) => !change.dropped.includes(c));
  const winterUnits = round1(kept.length * CLASS_UNITS + STATS[stats].units);
  const unitsAtTransfer = round1(progress.earned + progress.inProgress + progress.planned + winterUnits);

  const blocked = unitsAtTransfer < TRANSFER_MIN_UNITS || stats === "skip";
  const transfer: TransferStatus = blocked ? "blocked" : stats === "bus21" ? "review" : stats === "psyc5" ? "conditional" : "ready";
  const firstTerm = plannedTerms[0]!;
  const lastTerm = plannedTerms.at(-1)!;

  const stateFor = (t: (typeof plannedTerms)[number]): TermState | undefined => {
    if (blocked && t.id === firstTerm.id) return "bayview";
    if (change.termOff && t.name === OFF_TERM) return "off";
    if (change.early && t.id === lastTerm.id) return "unused";
    return undefined;
  };
  const active = plannedTerms.filter((t) => !stateFor(t)).map((t) => ({ ...t, baseUnits: t.units, isNew: false }));
  const limit = change.early ? TERM_LOAD_MAX : TERM_LOAD_LIMIT;
  const deficit = round1(progress.needed - unitsAtTransfer - active.reduce((n, t) => n + t.units, 0));

  // Catch-up courses go to the lightest term with room. Past that, the degree needs another term.
  for (let left = deficit > 0 ? Math.ceil(deficit / CATCH_UP_COURSE) : 0; left > 0; left--) {
    const open = active.filter((t) => t.units + CATCH_UP_COURSE <= limit);
    let target = open.reduce<(typeof open)[number] | undefined>((best, t) => (!best || t.units < best.units ? t : best), undefined);
    if (!target) {
      const name = nextTerm(active.at(-1)?.name ?? lastTerm.name);
      target = { id: name, name, units: 0, baseUnits: 0, isNew: true };
      active.push(target);
    }
    target.units += CATCH_UP_COURSE;
  }

  const bars: TermBar[] = [
    ...plannedTerms.map((t): TermBar => {
      const set = stateFor(t);
      if (set) return { id: t.id, name: t.name, units: 0, baseUnits: t.units, state: set };
      const units = active.find((a) => a.id === t.id)!.units;
      return { id: t.id, name: t.name, units, baseUnits: t.units, state: units > t.units ? "heavier" : units < t.units ? "lighter" : "same" };
    }),
    ...active.filter((t) => t.isNew).map((t): TermBar => ({ id: t.id, name: t.name, units: t.units, baseUnits: 0, state: "new" })),
  ];

  const plannedTotal = plannedTerms.reduce((n, t) => n + t.units, 0);
  const finalTotal = active.reduce((n, t) => n + t.units, 0);
  const movedToNorthgate = Math.max(0, finalTotal - plannedTotal);
  const quarterKept = kept.length * CLASS_QUARTER + STATS[stats].quarter;
  const quarterBase = WINTER_CLASSES.length * CLASS_QUARTER + STATS[currentStats].quarter;
  const tuition = movedToNorthgate * TUITION_PER_UNIT.northgate - (quarterBase - quarterKept) * TUITION_PER_UNIT.bayview;

  const weekLoad = weekLoads(change.dropped, stats);
  return {
    stats,
    graduation: active.at(-1)!.name,
    unitsAtTransfer,
    winterUnits,
    transfer,
    transferTerm: blocked ? nextTerm(firstTerm.name) : firstTerm.name,
    weekLoad,
    pileups: weekLoad.flatMap((n, i) => (isPileup(n) ? [i + 1] : [])),
    tuition,
    bars,
  };
}

/** How many terms later (positive) or earlier (negative) than the current plan. */
export const termsMoved = (now: Projection, then: Projection) => termOrder(then.graduation) - termOrder(now.graduation);

const STATS_NOTES: Partial<Record<StatsChoice, Note>> = {
  math13: { text: "MATH 13 counts for QR-1.", sourceId: "artic-math13" },
  psyc5: { text: "PSYC 5 counts for QR-1 only with a C or better.", sourceId: "artic-psyc5" },
  bus21: { text: "Northgate's catalog and transfer rules disagree on BUS 21. Your counselor decides.", sourceId: "artic-bus21", alert: true },
  skip: { text: "Transfer needs QR-1 finished first.", sourceId: "nsu-admit", alert: true },
};

/** The consequences, in plain language, and only the ones that differ from the current plan. */
export function explain(change: WhatIf, base: Projection, next: Projection): Note[] {
  const notes: Note[] = [];
  if (next.stats !== base.stats) {
    const note = STATS_NOTES[next.stats];
    if (note) notes.push(note);
  }
  if (next.unitsAtTransfer < TRANSFER_MIN_UNITS) notes.push({ text: `${next.unitsAtTransfer} units is under the ${TRANSFER_MIN_UNITS} Northgate needs to transfer.`, sourceId: "nsu-admit", alert: true });
  if (next.transfer === "blocked") notes.push({ text: `Transfer moves to ${next.transferTerm}. You'd need Northgate to approve the new start.`, sourceId: "nsu-admit", alert: true });
  if (change.termOff) notes.push({ text: `${OFF_TERM} is off, so its classes move to other terms.` });
  for (const bar of next.bars) {
    if (bar.state === "new") notes.push({ text: `Adds ${bar.name} with ${bar.units} units.`, alert: true });
    if (bar.state !== "heavier") continue;
    const over = bar.units > TERM_LOAD_LIMIT;
    notes.push({ text: `${bar.name} goes from ${bar.baseUnits} to ${bar.units} units${over ? ", which needs advisor approval" : ""}.`, ...(over ? { sourceId: "nsu-admit", alert: true } : {}) });
  }
  if (next.winterUnits > 0) for (const w of next.pileups) if (!base.pileups.includes(w)) notes.push({ text: `Week ${w} of Winter becomes a pile-up.`, alert: true });
  if (next.winterUnits > 0) for (const w of base.pileups) if (!next.pileups.includes(w)) notes.push({ text: `Week ${w} of Winter is no longer a pile-up.` });
  if (change.internship) notes.push({ text: "Adds 8 hours a week and fills your usability testing gap." });
  return notes;
}

const COURSE_WORDS: [RegExp, string][] = [
  [/\b(engl(ish)?\s*(1b)?)\b/, "ENGL 1B"],
  [/\bbio(logy)?(\s*12)?\b/, "BIO 12"],
  [/\bhist(ory)?(\s*18)?\b/, "HIST 18"],
];
const STATS_WORDS: [RegExp, StatsChoice][] = [
  [/\bmath\s*13\b/, "math13"],
  [/\bpsyc?h?\s*5\b/, "psyc5"],
  [/\bbus(iness)?\s*21\b/, "bus21"],
];

/** Reads a typed change into the sandbox. Returns null when the words match nothing it can test. */
export function parseWhatIf(text: string, current: WhatIf): WhatIf | null {
  const t = text.toLowerCase().trim();
  if (!t) return null;
  if (/\b(reset|start over|undo all|clear)\b/.test(t)) return NO_CHANGE;
  if (/\bwinter\s+off\b/.test(t)) return { ...current, dropped: WINTER_CLASSES, stats: "skip" };

  const removing = /\b(drop|remove|skip|without|cut|no)\b/.test(t);
  const restoring = /\b(keep|add back|put back|restore)\b/.test(t);
  const next: WhatIf = { ...current, dropped: [...current.dropped] };
  let matched = false;

  for (const [pattern, course] of COURSE_WORDS) {
    if (!pattern.test(t)) continue;
    matched = true;
    if (restoring) next.dropped = next.dropped.filter((c) => c !== course);
    else if (removing && !next.dropped.includes(course)) next.dropped.push(course);
  }
  const swapTo = STATS_WORDS.find(([pattern]) => pattern.test(t))?.[1];
  if (swapTo) {
    matched = true;
    next.stats = swapTo;
  } else if (/\bstat(s|istics)?(\s*2)?\b/.test(t)) {
    matched = true;
    next.stats = removing ? "skip" : "stat2";
  }
  if (/\bintern/.test(t)) {
    matched = true;
    next.internship = !removing;
  }
  if (/\b(spring|term|semester|gap)\b/.test(t) && /\b(off|gap|break)\b/.test(t)) {
    matched = true;
    next.termOff = !restoring;
  }
  if (/\b(early|earlier|sooner|faster)\b/.test(t)) {
    matched = true;
    next.early = !restoring;
  }
  return matched ? next : null;
}

/** Degree lines a change touches, plus "graduate" if the finish moves. The tree marks these with a dashed edge. */
export function changedSlots(change: WhatIf, slots: { id: string; code?: string | undefined; termName?: string | undefined }[], statsChanged: boolean, graduationMoved: boolean, lastTerm: string): Set<string> {
  const out = new Set<string>();
  for (const s of slots) {
    if (s.code && change.dropped.includes(s.code)) out.add(s.id);
    if (change.termOff && s.termName === OFF_TERM) out.add(s.id);
    if (change.early && s.termName === lastTerm) out.add(s.id);
  }
  if (statsChanged) out.add("qr1");
  if (graduationMoved) out.add("graduate");
  return out;
}
