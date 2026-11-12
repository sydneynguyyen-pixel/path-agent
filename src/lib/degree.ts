import { electiveClasses, earlierCredit, treeColumns, treeRows, type DegreeSlot, type DegreeTemplate, type TreeColumnId, type TreeRowId } from "@/data/degree";
import { DROP_DEADLINE, options, outsideSchool, progress, student, terms, type Option, type Requirement, type Term } from "@/data/scenario";
import { recoveryPath } from "@/lib/confidence";

export type SlotStatus = "done" | "now" | "planned" | "open" | "check";
export const SLOT_LABEL: Record<SlotStatus | "option", string> = { done: "Done", now: "In progress", planned: "Planned", open: "Open", check: "Needs a check", option: "Option" };

export type AuditInput = {
  stage: string;
  seatHeld: boolean;
  chosenId: string | null;
  counselor: null | "confirmed" | "declined";
  atRisk: boolean;
  savedOpportunities: string[];
};

export type AuditSlot = {
  id: string;
  need: string;
  status: SlotStatus;
  /** Credits this slot holds right now. Zero when nothing can count yet. */
  credits: number;
  code?: string | undefined;
  title?: string | undefined;
  grade?: string | undefined;
  hint?: string | undefined;
  detail?: string | undefined;
  termId?: string | undefined;
  termName?: string | undefined;
  row?: TreeRowId | undefined;
  upper: boolean;
  northgate: boolean;
};

type Bucket = "done" | "now" | "planned";
type Credits = Record<Bucket, number>;
const BUCKETS: Bucket[] = ["done", "now", "planned"];
const bucketOf = (s: SlotStatus): Bucket => (s === "done" ? "done" : s === "now" || s === "check" ? "now" : "planned");

export type AuditCategory = { id: string; name: string; about: string; color: string; needed: number; credits: Credits; extra: number; slots: AuditSlot[] };
export type AuditRule = { id: string; name: string; about: string; needed: number; done: number; planned: number };
export type DegreeAudit = {
  degree: string;
  school: string;
  gradTerm: string;
  needed: number;
  earned: number;
  now: number;
  planned: number;
  /** Credits still without a place in the plan. */
  short: number;
  categories: AuditCategory[];
  rules: AuditRule[];
};

const PLACEHOLDERS = new Set(["GE-D", "UD-GE", "Elective"]);

/** Everything is shown in semester credits, so nobody has to convert quarter units. */
export function semesterCredits(units: string): number {
  const n = Number.parseFloat(units);
  return /quarter/i.test(units) ? (n * 2) / 3 : n;
}

export function formatCredits(n: number): string {
  return String(Math.round(n * 10) / 10);
}

const termStatus = (t: Term): SlotStatus => (t.status === "done" ? "done" : t.status === "in_progress" ? "now" : "planned");
const shortCourse = (course: string) => course.replace("BCC ", "");

function statisticsFill(input: AuditInput): Pick<AuditSlot, "status" | "code" | "title" | "detail"> & { empty?: boolean } {
  const chosen = options.find((o) => o.id === input.chosenId);
  const named = chosen ? { code: shortCourse(chosen.course), title: chosen.title.split(" · ")[0] } : {};
  if (chosen && input.counselor === "declined") return { status: "open", detail: `${student.counselor} said ${shortCourse(chosen.course)} won't count. Drop it by ${DROP_DEADLINE}.`, empty: true };
  if (chosen && input.counselor === "confirmed") return { status: "now", ...named, detail: `Confirmed by ${student.counselor}` };
  if (chosen && input.seatHeld) return recoveryPath(chosen) === "hold" ? { status: "check", ...named, detail: `Seat held, waiting on ${student.counselor}` } : { status: "now", ...named, detail: "You registered" };
  if (input.atRisk) return { status: "open", detail: "STAT 2 is full. Pick another way to finish this.", empty: true };
  return { status: "planned", code: "STAT 2", title: "Introduction to Statistics" };
}

function fillSlot(slot: DegreeSlot, input: AuditInput): AuditSlot {
  const base = { id: slot.id, need: slot.need, hint: slot.hint, row: slot.row, upper: !!slot.upper };
  if (slot.source === "earlier") return { ...base, status: "done", credits: earlierCredit.units, title: earlierCredit.label, northgate: false };

  const term = terms.find((t) => t.id === slot.term);
  if (!term) throw new Error(`Degree slot ${slot.id} points at a missing term`);
  const where = { termId: term.id, termName: term.name, northgate: term.school === "northgate" };

  if (slot.source === "statistics") {
    const course = term.courses.find((c) => c.flag === "qr1")!;
    const { empty, ...fill } = statisticsFill(input);
    return { ...base, ...where, ...fill, credits: empty ? 0 : semesterCredits(course.units) };
  }

  const course = term.courses.find((c) => c.code === slot.course || c.title === slot.course);
  if (!course) throw new Error(`Degree slot ${slot.id} points at a missing course`);
  const credits = semesterCredits(course.units);
  if (PLACEHOLDERS.has(course.code)) {
    const pick = electiveClasses.find((e) => e.slot === slot.id && input.savedOpportunities.includes(e.id));
    return pick ? { ...base, ...where, status: "planned", credits, code: pick.code, title: pick.title } : { ...base, ...where, status: "open", credits };
  }
  return { ...base, ...where, status: termStatus(term), credits, code: course.code, title: course.title, grade: course.grade };
}

/** A category holds what it needs, finishing what's earned first. Anything past that counts as an elective. */
function tally(raw: Credits, needed: number): { credits: Credits; spill: Credits } {
  let room = needed;
  const credits = { done: 0, now: 0, planned: 0 };
  const spill = { done: 0, now: 0, planned: 0 };
  for (const b of BUCKETS) {
    credits[b] = Math.min(raw[b], room);
    room -= credits[b];
    spill[b] = raw[b] - credits[b];
  }
  return { credits, spill };
}

const rawOf = (slots: AuditSlot[]): Credits => {
  const raw = { done: 0, now: 0, planned: 0 };
  for (const s of slots) raw[bucketOf(s.status)] += s.credits;
  return raw;
};
const total = (c: Credits) => c.done + c.now + c.planned;

/** The student's audit. Its categories and slots come only from the template, so state can't reshape it. */
export function auditFor(template: DegreeTemplate, input: AuditInput): DegreeAudit {
  const filled = template.categories.map((c) => ({ category: c, slots: c.slots.map((s) => fillSlot(s, input)) }));
  const spill = { done: 0, now: 0, planned: 0 };
  const isLast = (i: number) => i === filled.length - 1;

  const categories: AuditCategory[] = [];
  filled.forEach(({ category, slots }, i) => {
    const raw = rawOf(slots);
    if (isLast(i)) for (const b of BUCKETS) raw[b] += spill[b];
    const t = tally(raw, category.needed);
    if (!isLast(i)) for (const b of BUCKETS) spill[b] += t.spill[b];
    categories.push({ id: category.id, name: category.name, about: category.about, color: category.color, needed: category.needed, credits: t.credits, extra: isLast(i) ? total(t.spill) : 0, slots });
  });

  const all = categories.flatMap((c) => c.slots);
  const rules = template.rules.map((r): AuditRule => {
    const raw = rawOf(all.filter((s) => (r.measure === "northgate" ? s.northgate : s.upper)));
    return { id: r.id, name: r.name, about: r.about, needed: r.needed, done: raw.done, planned: raw.now + raw.planned };
  });

  const sum = (b: Bucket) => categories.reduce((n, c) => n + c.credits[b], 0);
  const [earned, now, planned] = [sum("done"), sum("now"), sum("planned")];
  return { degree: template.degree, school: template.school, gradTerm: progress.gradTerm, needed: template.totalNeeded, earned, now, planned, short: Math.max(0, Math.round((template.totalNeeded - earned - now - planned) * 100) / 100), categories, rules };
}

// ---------- Where a class sits in the degree ----------

export type DegreePlace = { row: string; slot: string; need: string };

/** The degree line a term's class fills. Used to link a class on Terms to its row in the audit. */
export function placeOf(template: DegreeTemplate, termId: string, course: { code: string; title: string; flag?: string | undefined }): DegreePlace | undefined {
  for (const c of template.categories) {
    for (const s of c.slots) {
      if (s.term !== termId) continue;
      if (s.source === "statistics" ? course.flag === "qr1" : s.course === course.code || s.course === course.title) return { row: c.id, slot: s.id, need: s.need };
    }
  }
  return undefined;
}

/** The degree line currently held by a class code. */
export function slotForCourse(audit: DegreeAudit, code: string): DegreePlace | undefined {
  for (const c of audit.categories) {
    const s = c.slots.find((x) => x.code === code);
    if (s) return { row: c.id, slot: s.id, need: s.need };
  }
  return undefined;
}

export type TransferItem = { id: string; name: string; status: SlotStatus; detail: string; credits: number };

/** The Bayview requirements to finish before transferring, following the Statistics decision. */
export function transferReadiness(requirements: Requirement[], input: AuditInput): TransferItem[] {
  const statusOf: Record<Requirement["status"], SlotStatus> = { done: "done", transfer: "done", in_progress: "now", pending: "check", at_risk: "open", remaining: "planned" };
  return requirements
    .filter((r) => r.detail.startsWith("BCC") || r.detail.startsWith("Planned: BCC"))
    .map((r) => {
      const item = { id: r.id, name: r.name, credits: Number.parseFloat(r.units) };
      if (r.id !== "qr1") return { ...item, status: statusOf[r.status], detail: r.detail };
      const fill = statisticsFill(input);
      return { ...item, status: fill.status, detail: fill.code ? `${fill.code} · ${fill.detail ?? "Winter 2027"}` : fill.detail ?? "" };
    });
}

// ---------- Graduation tree ----------

export const TREE_CARD_W = 168;
export const TREE_CARD_H = 80;
const LABEL_W = 148;
const COL_GAP = 48;
const STACK_GAP = 10;
const ROW_GAP = 40;
const HEAD_H = 56;

export type TreeWay = { id: string; option?: Option | undefined; title: string; time: string; about: string; seats: string; chosen: boolean };
export type TreeCard = {
  id: string;
  row: TreeRowId | "grad";
  col: TreeColumnId;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "group" | "way" | "option" | "grad";
  title: string;
  sub: string;
  status: SlotStatus | "option";
  slots: AuditSlot[];
  way?: TreeWay | undefined;
  optionId?: string | undefined;
  about?: string | undefined;
};
export type TreeLink = { id: string; d: string; state: "done" | "plan" | "option" };
export type TreeRow = { id: TreeRowId; name: string; color: string; status: string; y: number; h: number };
export type TreeLayout = {
  cards: TreeCard[];
  links: TreeLink[];
  rows: TreeRow[];
  columns: { id: TreeColumnId; label: string; sub: string; x: number }[];
  branch: { x: number; y: number; count: number };
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};

const columnOf = (termId?: string): TreeColumnId => {
  const t = terms.find((x) => x.id === termId);
  if (!t || t.status === "done") return "done";
  if (termId === "su27") return "sp27";
  return termId === "f26" || termId === "w27" || termId === "sp27" || termId === "fa27" ? termId : "later";
};

/** "PSYC 1 · 2 · 14" when the subject repeats, otherwise the codes, with long lists cut short. */
export function groupTitle(slots: AuditSlot[]): string {
  const named = slots.filter((s) => s.code);
  if (!named.length) return slots.length > 1 ? `${slots[0]!.need}s` : slots[0]!.need;
  const codes = named.map((s) => s.code!);
  const sameSubject = new Set(codes.map((c) => c.split(" ")[0])).size === 1;
  const parts = sameSubject ? [codes[0]!, ...codes.slice(1).map((c) => c.split(" ").slice(1).join(" "))] : codes;
  return parts.length > 3 ? `${parts.slice(0, 2).join(" · ")} +${parts.length - 2}` : parts.join(" · ");
}

function groupStatus(slots: AuditSlot[]): SlotStatus {
  const first = slots[0]!.status;
  return slots.every((s) => s.status === first) ? first : "planned";
}

function groupSub(slots: AuditSlot[], col: TreeColumnId): string {
  const credits = formatCredits(slots.reduce((n, s) => n + s.credits, 0));
  if (slots.length === 1) {
    const s = slots[0]!;
    return s.code ? [s.title, s.grade].filter(Boolean).join(" · ") : s.hint ?? "";
  }
  const closes = terms.find((t) => t.id === "w27")?.registration?.match(/closes (.+)$/)?.[1];
  if (col === "w27" && closes) return `Register by ${closes}`;
  return slots.every((s) => s.code) ? `${slots.length} classes · ${credits} credits` : `${credits} credits`;
}

/** The ways to finish Statistics: the planned class, then the two best open options. A chosen class is always shown. */
export function statisticsWays(input: AuditInput): TreeWay[] {
  const way = (id: string): TreeWay => {
    const option = options.find((o) => o.id === id)!;
    const [name, format] = option.title.split(" · ");
    return {
      id,
      option,
      title: `${shortCourse(option.course)} · ${format ?? name}`,
      time: option.sectionTime,
      about: option.reason,
      seats: `${option.seatsOpen} seats open`,
      chosen: input.chosenId === id && input.counselor !== "declined",
    };
  };
  const planned: TreeWay = {
    id: "stat2",
    title: "STAT 2 · Evening",
    time: "Evening · In person",
    about: "The class already on your plan.",
    seats: input.stage === "idle" ? "Your plan" : "Section full",
    chosen: !input.chosenId && !input.atRisk,
  };
  const ids = ["math13", "psyc5"];
  if (input.chosenId && !ids.includes(input.chosenId)) ids[1] = input.chosenId;
  return [planned, ...ids.map(way)];
}

function waySub(w: TreeWay, slot: AuditSlot): string {
  if (w.chosen) return slot.detail ?? "Your plan";
  if (w.id === "stat2") return w.seats;
  if (w.option?.verdict === "conditional") return "Counts with a C or better";
  if (w.option?.verdict === "conflict") return "Needs a counselor's OK";
  return w.seats;
}

function rowStatus(id: TreeRowId, audit: DegreeAudit): string {
  const slots = audit.categories.flatMap((c) => c.slots);
  if (id === "major") return "On track";
  if (id === "ux") return "Your electives";
  if (id === "statistics") {
    const s = slots.find((x) => x.id === "qr1")!;
    return s.status === "open" ? "Pick one this winter" : s.status === "check" ? "Waiting on your counselor" : s.status === "now" ? "Registered" : "Planned for winter";
  }
  const later = slots.filter((s) => s.row === "ge" && (columnOf(s.termId) === "fa27" || columnOf(s.termId) === "later")).length;
  return `${later} left after winter`;
}

type Draft = Omit<TreeCard, "x" | "y" | "w" | "h" | "row" | "col">;

export function layoutTree(audit: DegreeAudit, input: AuditInput): TreeLayout {
  const slots = audit.categories.flatMap((c) => c.slots);
  const qr = slots.find((s) => s.id === "qr1")!;
  const pitch = TREE_CARD_W + COL_GAP;
  const columns = treeColumns.map((c, i) => ({ ...c, x: LABEL_W + COL_GAP / 2 + i * pitch }));
  const colX = (id: TreeColumnId) => columns.find((c) => c.id === id)!.x;

  const cellsFor = (row: TreeRowId): Map<TreeColumnId, Draft[]> => {
    const cells = new Map<TreeColumnId, Draft[]>();
    const groups = new Map<TreeColumnId, AuditSlot[]>();
    for (const s of slots) {
      if (s.row !== row || s.id === "qr1") continue;
      const col = columnOf(s.termId);
      groups.set(col, [...(groups.get(col) ?? []), s]);
    }
    for (const [col, group] of groups) cells.set(col, [{ id: `${row}-${col}`, kind: "group", title: groupTitle(group), sub: groupSub(group, col), status: groupStatus(group), slots: group }]);
    if (row === "major") {
      const saved = input.savedOpportunities.includes("lcc-psyc20");
      cells.set("sp27", [...(cells.get("sp27") ?? []), { id: "lcc-psyc20", kind: "option", title: outsideSchool.course.code, sub: `${outsideSchool.course.title} · needs a check`, status: saved ? "check" : "option", slots: [], optionId: "lcc-psyc20", about: outsideSchool.transfer.caution }]);
    }
    if (row === "statistics") {
      cells.set("w27", statisticsWays(input).map((w) => ({ id: `way-${w.id}`, kind: "way", title: w.title, sub: waySub(w, qr), status: w.chosen ? qr.status : "option", slots: w.chosen ? [qr] : [], way: w })));
    }
    if (row === "ux") {
      cells.set("fa27", electiveClasses.map((e) => ({ id: `elective-${e.id}`, kind: "option", title: e.code, sub: e.title, status: input.savedOpportunities.includes(e.id) ? "planned" : "option", slots: [], optionId: e.id, about: e.about })));
    }
    return cells;
  };

  const cards: TreeCard[] = [];
  const rows: TreeRow[] = [];
  let y = HEAD_H;
  const stackH = (n: number) => n * TREE_CARD_H + (n - 1) * STACK_GAP;
  let branch = { x: 0, y: 0, count: 0 };
  for (const r of treeRows) {
    const cells = cellsFor(r.id);
    // A lone optional class sits below the line, so the planned path runs straight past it.
    const offLine = (stack: Draft[]) => stack.length === 1 && stack[0]!.kind === "option";
    const hasOffLine = [...cells.values()].some(offLine);
    const h = stackH(Math.max(hasOffLine ? 2 : 1, ...[...cells.values()].map((c) => c.length)));
    rows.push({ id: r.id, name: r.name, color: r.color, status: rowStatus(r.id, audit), y, h });
    for (const [col, stack] of cells) {
      const top = hasOffLine ? (offLine(stack) ? y + TREE_CARD_H + STACK_GAP : y) : y + (h - stackH(stack.length)) / 2;
      stack.forEach((d, i) => cards.push({ ...d, row: r.id, col, x: colX(col), y: top + i * (TREE_CARD_H + STACK_GAP), w: TREE_CARD_W, h: TREE_CARD_H }));
    }
    if (r.id === "statistics") branch = { x: colX("w27"), y: y - 8, count: cells.get("w27")!.length };
    y += h + ROW_GAP;
  }
  const bottom = y - ROW_GAP;
  const gradH = 132;
  const grad: TreeCard = { id: "graduate", row: "grad", col: "grad", x: colX("grad"), y: HEAD_H + (bottom - HEAD_H - gradH) / 2, w: TREE_CARD_W, h: gradH, kind: "grad", title: audit.degree, sub: `${audit.school} · ${audit.gradTerm}`, status: "planned", slots: [] };
  cards.push(grad);

  const curve = (a: TreeCard, b: TreeCard) => {
    const [x1, y1, x2, y2] = [a.x + a.w, a.y + a.h / 2, b.x, b.y + b.h / 2];
    const mid = x1 + Math.min(80, (x2 - x1) / 2);
    return `M ${x1} ${y1} C ${mid} ${y1}, ${x2 - Math.min(80, (x2 - x1) / 2)} ${y2}, ${x2} ${y2}`;
  };
  const stateOf = (to: TreeCard): TreeLink["state"] => (to.status === "option" ? "option" : to.status === "done" ? "done" : "plan");
  const links: TreeLink[] = [];
  const order = treeColumns.map((c) => c.id);
  for (const r of treeRows) {
    const inRow = cards.filter((c) => c.row === r.id);
    const cols = order.filter((col) => inRow.some((c) => c.col === col));
    cols.forEach((col, i) => {
      const next = cols[i + 1];
      const from = inRow.filter((c) => c.col === col);
      // Only the class you've settled on continues; with none picked, every option can.
      const leaving = from.some((c) => c.status !== "option") ? from.filter((c) => c.status !== "option") : from;
      const nextCards = next ? inRow.filter((c) => c.col === next) : [grad];
      // When the next term only has options, the plan also carries on without them.
      const after = cols[i + 2];
      const skipped = nextCards.every((c) => c.status === "option") ? (after ? inRow.filter((c) => c.col === after) : [grad]) : [];
      const to = from.every((c) => c.status === "option") ? nextCards : [...nextCards, ...skipped];
      for (const a of leaving) {
        for (const b of to) links.push({ id: `${a.id}>${b.id}`, d: curve(a, b), state: a.status === "option" ? "option" : stateOf(b) });
      }
    });
  }

  return { cards, links, rows, columns, branch, bounds: { minX: 0, minY: 0, maxX: colX("grad") + TREE_CARD_W, maxY: bottom } };
}

const STANDINGS = [
  { name: "Freshman", from: 0 },
  { name: "Sophomore", from: 30 },
  { name: "Junior", from: 60 },
  { name: "Senior", from: 90 },
] as const;

/** Class standing from earned semester units, and the units that reach the next one. */
export function standingOf(earned: number) {
  const i = STANDINGS.filter((s) => earned >= s.from).length - 1;
  const next = STANDINGS[i + 1];
  return { name: STANDINGS[i]!.name, next: next ? { name: next.name, at: next.from } : undefined };
}
