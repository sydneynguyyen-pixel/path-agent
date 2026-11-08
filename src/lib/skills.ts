import { careerRoles, ledgerSkills, type Skill, type EvidenceLevel } from "@/data/scenario";

export type SkillReview = { confirmed?: boolean; hidden?: boolean; wording?: string; work?: string };
export function evidenceFor(skill: Skill, review?: SkillReview): EvidenceLevel { return review?.work || skill.work ? "Demonstrated" : skill.level; }
export function resumeBullet(skill: Skill, review?: SkillReview) {
  const name = review?.wording || skill.name;
  const level = evidenceFor(skill, review);
  const action = level === "Demonstrated" ? `Analyzed coursework using ${name.toLowerCase()}, supported by attached work` : level === "Practiced" ? `Practiced ${name.toLowerCase()} through course assignments` : `Coursework in ${name.toLowerCase()}`;
  return `${action} (from ${skill.course}, ${level.toLowerCase()}).`;
}
export function exportableSkills(skills: Skill[], reviews: Record<string, SkillReview>) { return skills.filter(s => reviews[s.id]?.confirmed && !reviews[s.id]?.hidden); }
export function canExport(checked: boolean, count: number) { return checked && count > 0; }
export function orderRoles(interests: string[], interested: string[]) { return [...careerRoles].sort((a,b) => Number(interested.includes(b.id))-Number(interested.includes(a.id)) || b.interests.filter(i=>interests.includes(i)).length-a.interests.filter(i=>interests.includes(i)).length); }
export function courseCode(value: string) { return value.replace(/^BCC\s+/, "").match(/^[A-Z]+\s+[0-9]+[A-Z]?/)?.[0] ?? value; }
export function courseSkills(code: string) { return ledgerSkills.filter(s => s.course === courseCode(code)); }