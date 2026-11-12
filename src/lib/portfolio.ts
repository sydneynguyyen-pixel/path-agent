import type { EvidenceLevel, Skill } from "@/data/scenario";
import { eventSkillKey, type EventSkill } from "@/lib/experiences";
import { evidenceFor, type SkillReview } from "@/lib/skills";
import { isOwnKey, type OwnProof } from "@/lib/activities";

export type SkillSource = "all" | "classes" | "events" | "own";
export type SkillProof =
  | { type: "class"; code: string; quote: string; source: string }
  | { type: "event"; id: string; title: string }
  | { type: "doing"; id: string; title: string }
  /** Self-reported: a skill she added from something she did. Shown as "Added by you", never as verified. */
  | { type: "own"; id: string; title: string };

export type PortfolioSkill = {
  key: string;
  name: string;
  theme: string;
  level: EvidenceLevel;
  proofs: SkillProof[];
  /** Every review this one row stands for, so a single Confirm covers all its proof. */
  reviewKeys: string[];
  confirmed: boolean;
  hidden: boolean;
  unsure: boolean;
  work?: string | undefined;
  /** Every proof is self-reported, so it's labelled "Added by you". */
  selfReported: boolean;
};

const RANK: Record<EvidenceLevel, number> = { Taught: 1, Practiced: 2, Demonstrated: 3 };
const OTHER_THEME = "From doing";
/** Different sources name the same skill differently; they share one row. */
const SAME_SKILL: Record<string, string> = {
  "interviewing basics": "Interviewing",
  "user interviews": "Interviewing",
  "talking with researchers": "Professional networking",
};

/** Class, event and hands-on proof merged into one row per skill. */
export function portfolioSkills(ledger: Skill[], events: EventSkill[], doing: { skill: string; via: { id: string; title: string } }[], reviews: Record<string, SkillReview>, own: OwnProof[] = []): PortfolioSkill[] {
  const rows = new Map<string, PortfolioSkill>();
  const rowFor = (raw: string, theme: string, level: EvidenceLevel) => {
    const name = SAME_SKILL[raw.toLowerCase()] ?? raw;
    const key = name.toLowerCase();
    const row = rows.get(key) ?? { key, name, theme, level, proofs: [], reviewKeys: [], confirmed: false, hidden: false, unsure: false, selfReported: false };
    if (RANK[level] > RANK[row.level]) row.level = level;
    if (row.theme === OTHER_THEME) row.theme = theme;
    rows.set(key, row);
    return row;
  };

  for (const s of ledger) {
    const row = rowFor(s.name, s.theme, evidenceFor(s, reviews[s.id]));
    row.proofs.push({ type: "class", code: s.course, quote: s.quote, source: s.source });
    row.reviewKeys.push(s.id);
    if (s.confidence === "Low") row.unsure = true;
    row.work = reviews[s.id]?.work ?? s.work ?? row.work;
  }
  for (const e of events) {
    const row = rowFor(e.name, e.theme, e.level);
    for (const ev of e.events) row.proofs.push({ type: "event", id: ev.id, title: ev.title });
    row.reviewKeys.push(eventSkillKey(e.id));
    row.unsure = false;
  }
  for (const d of doing) {
    const row = rowFor(d.skill, OTHER_THEME, "Practiced");
    if (!row.proofs.some((p) => p.type === "doing" && p.id === d.via.id)) row.proofs.push({ type: "doing", id: d.via.id, title: d.via.title.split(" · ").at(-1)! });
  }

  for (const o of own) {
    // Her word never raises the evidence level of proof Sprout found; a new row starts at Practiced.
    const existing = rows.get((SAME_SKILL[o.skill.toLowerCase()] ?? o.skill).toLowerCase());
    const row = rowFor(o.skill, o.theme, existing?.level ?? "Practiced");
    if (!row.proofs.some((p) => p.type === "own" && p.id === o.via.id)) row.proofs.push({ type: "own", id: o.via.id, title: o.via.title });
    if (!row.reviewKeys.includes(o.key)) row.reviewKeys.push(o.key);
    row.unsure = false;
    if (o.link && !row.work) row.work = o.link;
  }

  // Self-reported proof counts as confirmed: ticking it when she added it was her "yes". She can still unconfirm it.
  const isConfirmed = (k: string) => (isOwnKey(k) ? reviews[k]?.confirmed !== false : !!reviews[k]?.confirmed);
  return [...rows.values()]
    .filter((r) => r.proofs.length > 0)
    .map((r) => {
      const seen = r.reviewKeys.map((k) => reviews[k]);
      const wording = seen.find((x) => x?.wording)?.wording;
      const work = seen.find((x) => x?.work)?.work ?? r.work;
      const confirmed = r.reviewKeys.length > 0 ? r.reviewKeys.every(isConfirmed) || r.reviewKeys.some((k) => isOwnKey(k) && isConfirmed(k)) : true;
      return { ...r, name: wording ?? r.name, work, confirmed, hidden: r.reviewKeys.length > 0 && seen.some((x) => x?.hidden), unsure: r.unsure && !r.reviewKeys.some(isConfirmed), selfReported: r.proofs.every((p) => p.type === "own") };
    });
}
