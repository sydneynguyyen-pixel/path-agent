import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Pencil, Paperclip, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AgentAvatar, SubjectIcon } from "./Brand";
import { useJourney } from "@/lib/journey";
import { evidenceFor, courseCode } from "@/lib/skills";
import { registrationSkills, type Skill, type EvidenceLevel } from "@/data/scenario";
import { cn } from "@/lib/utils";

export function ReaderCredit() { return <div className="flex items-center gap-2 text-xs text-muted-foreground"><AgentAvatar agent="reader" className="size-8" />From your syllabi</div>; }
export function EvidenceIndicator({ level }: { level: EvidenceLevel }) {
  const levels: EvidenceLevel[] = ["Taught", "Practiced", "Demonstrated"];
  return <div className="flex flex-wrap items-center gap-2 text-xs" aria-label={`Evidence: ${level}`}><span className="flex gap-1">{levels.map((l,i) => <span key={l} title={l} className={cn("h-1.5 w-5 rounded-full", i <= levels.indexOf(level) ? "bg-primary" : "bg-muted")} />)}</span><span>{level}</span>{level === "Demonstrated" && <span className="text-muted-foreground">· proof from attached work</span>}</div>;
}
export function SkillRow({ skill, actions = true }: { skill: Skill; actions?: boolean }) {
  const j = useJourney();
  const review = j.skillReviews[skill.id];
  const [dialog, setDialog] = useState<"wording" | "work" | null>(null);
  const [wording, setWording] = useState(review?.wording || skill.name);
  const [work, setWork] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const level = evidenceFor(skill, review);
  return <div className="skill-row relative py-4">
    <div className="flex items-start gap-3"><SubjectIcon course={skill.confidence === "Low" ? "Unknown" : skill.course} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{review?.wording || skill.name}</h3>{review?.confirmed && <Check className="size-3.5 text-mark-yes" aria-label="Confirmed" />}<span className={cn("rounded-full px-2 py-0.5 text-[11px]", skill.confidence === "High" ? "bg-success-soft" : skill.confidence === "Medium" ? "bg-warning-soft" : "bg-muted")}>{skill.confidence}</span></div><p className="mt-1 text-xs text-muted-foreground">{skill.method} · {skill.course}</p><div className="mt-2"><EvidenceIndicator level={level} /></div>
    <details className="mt-2 text-xs"><summary className="cursor-pointer text-muted-foreground">See the syllabus line</summary><blockquote className="mt-2 rounded-xl bg-secondary p-3 leading-relaxed">“{skill.quote}”<cite className="mt-1 block not-italic text-muted-foreground">{skill.course} syllabus · {skill.source} · synthetic</cite></blockquote></details>
    {(review?.work || skill.work) && <p className="mt-2 break-words text-xs text-muted-foreground"><Paperclip className="mr-1 inline size-3" />{review?.work || skill.work}</p>}
    {actions && <div className="skill-actions">{!review?.confirmed && <Button size="sm" variant="outline" onClick={() => { j.reviewSkill(skill.id, { confirmed: true }); toast("Saved to your skills"); }}><Check className="size-3" />Confirm</Button>}<Button variant="ghost" size="sm" className="size-8 p-0" aria-label="Edit wording" title="Edit wording" onClick={() => setDialog("wording")}><Pencil className="size-3" /></Button><Button variant="ghost" size="sm" className="size-8 p-0" aria-label="Attach work" title="Attach work" onClick={() => setDialog("work")}><Paperclip className="size-3" /></Button><Button variant="ghost" size="sm" className="size-8 p-0" aria-label="Hide" title="Hide" onClick={() => j.reviewSkill(skill.id, { hidden: true })}><EyeOff className="size-3" /></Button></div>}
    </div></div>
    <Dialog open={!!dialog} onOpenChange={o => !o && setDialog(null)}><DialogContent className="max-w-[calc(100vw-2rem)] bg-card sm:max-w-lg"><DialogHeader><DialogTitle>{dialog === "wording" ? "Edit skill wording" : "Attach your work"}</DialogTitle><DialogDescription>{dialog === "wording" ? "Keep it true to your coursework." : "Choose a file or paste a link."}</DialogDescription></DialogHeader>{dialog === "wording" ? <Input aria-label="Skill wording" value={wording} onChange={e => setWording(e.target.value)} /> : <><Input aria-label="Work link" placeholder="https://…" value={work} onChange={e => setWork(e.target.value)} /><Input aria-label="Work file" type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} /></>}<Button disabled={dialog === "wording" ? !wording.trim() : !file && !/^https?:\/\//.test(work)} onClick={() => { j.reviewSkill(skill.id, dialog === "wording" ? { wording: wording.trim() } : { work: file?.name || work, confirmed: true }); setDialog(null); toast("Saved to your skills"); }}>Save</Button></DialogContent></Dialog>
  </div>;
}
/** A course name that opens what you'll learn in it. */
export function CourseLink({ course, children }: { course: string; children?: ReactNode }) { const code = courseCode(course); return <Link to="/course-skills" search={{ course: code }} title={`What you'll learn in ${code}`} className="underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground">{children ?? course}</Link>; }
export function AddsSkills({ course }: { course: string }) { const names = registrationSkills[courseCode(course)]; if (!names) return null; return <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]"><AgentAvatar agent="reader" className="size-5" /><span className="text-muted-foreground">Adds:</span>{names.map(n => <span key={n} className="rounded-full bg-secondary px-2 py-0.5">{n}</span>)}</div>; }
