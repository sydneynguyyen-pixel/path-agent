import type { EvidenceLevel, Skill } from "@/data/scenario";
import { eventSkillKey, type EventSkill } from "@/lib/experiences";
import { evidenceFor, type SkillReview } from "@/lib/skills";

export type SkillSource = "all" | "classes" | "events";
export type SkillProof =
  | { type: "class"; code: string; quote: string; source: string }
  | { type: "event"; id: string; title: string }
  | { type: "doing"; id: string; title: string };

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
export function portfolioSkills(ledger: Skill[], events: EventSkill[], doing: { skill: string; via: { id: string; title: string } }[], reviews: Record<string, SkillReview>): PortfolioSkill[] {
  const rows = new Map<string, PortfolioSkill>();
  const rowFor = (raw: string, theme: string, level: EvidenceLevel) => {
    const name = SAME_SKILL[raw.toLowerCase()] ?? raw;
    const key = name.toLowerCase();
    const row = rows.get(key) ?? { key, name, theme, level, proofs: [], reviewKeys: [], confirmed: false, hidden: false, unsure: false };
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

  return [...rows.values()]
    .filter((r) => r.proofs.length > 0)
    .map((r) => {
      const seen = r.reviewKeys.map((k) => reviews[k]);
      const wording = seen.find((x) => x?.wording)?.wording;
      return { ...r, name: wording ?? r.name, confirmed: r.reviewKeys.length > 0 ? seen.every((x) => x?.confirmed) : true, hidden: r.reviewKeys.length > 0 && seen.some((x) => x?.hidden), unsure: r.unsure && !seen.some((x) => x?.confirmed) };
    });
}
