import { useState, type ReactNode } from "react";
import { Check, Pencil, Paperclip, EyeOff, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AgentAvatar, SubjectIcon } from "./Brand";
import { GrowCheck } from "./GrowCheck";
import { useJourney } from "@/lib/journey";
import { evidenceFor, courseCode } from "@/lib/skills";
import { registrationSkills, type Skill, type EvidenceLevel } from "@/data/scenario";
import { cn } from "@/lib/utils";

export function ReaderCredit() { return <div className="flex items-center gap-2 text-xs text-muted-foreground"><AgentAvatar agent="reader" className="size-8" />From your syllabi</div>; }
export function EvidenceIndicator({ level }: { level: EvidenceLevel }) {
  const levels: EvidenceLevel[] = ["Taught", "Practiced", "Demonstrated"];
  return <div className="flex flex-wrap items-center gap-2 text-xs" aria-label={`Evidence: ${level}`}><span className="flex gap-1">{levels.map((l,i) => <span key={l} title={l} className={cn("h-1.5 w-5 rounded-full", i <= levels.indexOf(level) ? "glass-on" : "bg-muted")} />)}</span><span>{level}</span>{level === "Demonstrated" && <span className="text-muted-foreground">· proof from attached work</span>}</div>;
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
    <div className="flex items-start gap-3"><SubjectIcon course={skill.confidence === "Low" ? "Unknown" : skill.course} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{review?.wording || skill.name}</h3><GrowCheck on={!!review?.confirmed} label="Confirmed" className="size-3.5 text-mark-yes" /></div><p className="mt-1 text-xs text-muted-foreground">{skill.course} · {skill.course} syllabus · {skill.source}</p><div className="mt-2"><EvidenceIndicator level={level} /></div>
    <details className="mt-2 text-xs"><summary className="cursor-pointer text-muted-foreground">See the syllabus line</summary><blockquote className="mt-2 rounded-xl bg-secondary p-3 leading-relaxed">“{skill.quote}”<cite className="mt-1 block not-italic text-muted-foreground">{skill.course} syllabus · {skill.source} · synthetic</cite></blockquote></details>
    {(review?.work || skill.work) && <p className="mt-2 break-words text-xs text-muted-foreground"><Paperclip className="mr-1 inline size-3" />{review?.work || skill.work}</p>}
    {actions && <div className="mt-3 flex items-center gap-1"><Button size="sm" variant="outline" disabled={review?.confirmed} onClick={() => { j.reviewSkill(skill.id, { confirmed: true }); toast("Saved to your skills"); }}><Check className="size-3" />{review?.confirmed ? "Confirmed" : "Confirm"}</Button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`More actions for ${skill.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="start"><DropdownMenuItem onSelect={() => setDialog("wording")}><Pencil />Edit wording</DropdownMenuItem><DropdownMenuItem onSelect={() => setDialog("work")}><Paperclip />Attach work</DropdownMenuItem><DropdownMenuItem onSelect={() => j.reviewSkill(skill.id, { hidden: true })}><EyeOff />Hide</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>}
    </div></div>
    <Dialog open={!!dialog} onOpenChange={o => !o && setDialog(null)}><DialogContent className="max-w-[calc(100vw-2rem)] bg-card sm:max-w-lg"><DialogHeader><DialogTitle>{dialog === "wording" ? "Edit skill wording" : "Attach your work"}</DialogTitle><DialogDescription>{dialog === "wording" ? "Keep it true to your coursework." : "Choose a file or paste a link."}</DialogDescription></DialogHeader>{dialog === "wording" ? <Input aria-label="Skill wording" value={wording} onChange={e => setWording(e.target.value)} /> : <><Input aria-label="Work link" placeholder="https://…" value={work} onChange={e => setWork(e.target.value)} /><Input aria-label="Work file" type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} /></>}<Button disabled={dialog === "wording" ? !wording.trim() : !file && !/^https?:\/\//.test(work)} onClick={() => { j.reviewSkill(skill.id, dialog === "wording" ? { wording: wording.trim() } : { work: file?.name || work, confirmed: true }); setDialog(null); toast("Saved to your skills"); }}>Save</Button></DialogContent></Dialog>
  </div>;
}
/** A course name that opens its details panel, on any page. */
export function CourseLink({ course, children }: { course: string; children?: ReactNode }) { const j = useJourney(); const code = courseCode(course); return <button type="button" onClick={() => j.openClass(code)} title={`About ${code}`} className="text-left underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground">{children ?? course}</button>; }
export function AddsSkills({ course }: { course: string }) { const names = registrationSkills[courseCode(course)]; if (!names) return null; return <p className="text-xs text-muted-foreground">Adds: <span className="text-foreground">{names.join(" · ")}</span></p>; }
