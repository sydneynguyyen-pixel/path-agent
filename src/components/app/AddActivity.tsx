import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { useJourney } from "@/lib/journey";
import { ACTIVITY_KINDS, cleanSkill, suggestSkills, WHERE, type ActivityKind, type SingleSkill } from "@/lib/activities";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Mode = "activity" | "skill";
const optional = <span className="font-normal text-muted-foreground">(optional)</span>;
const isLink = (v: string) => /^https?:\/\/\S+$/.test(v.trim());

/**
 * One place to add what Sprout can't find: something she did (a job, caring for family, a club…) with the
 * skills it built, or just one skill by name. All of it shows as added by you, never as verified.
 */
export function AddActivityDialog({ open, onOpenChange, initialMode = "activity" }: { open: boolean; onOpenChange: (open: boolean) => void; initialMode?: Mode }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto bg-card sm:max-w-lg">
        {/* Remounts each time it opens, so the form starts clean. */}
        {open && <AddForm initialMode={initialMode} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function AddForm({ initialMode, onDone }: { initialMode: Mode; onDone: () => void }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "activity" ? "Add something you did" : "Add a skill"}</DialogTitle>
        <DialogDescription>For what Sprout can't see, like a job, caring for family or a club. It shows as added by you, not verified.</DialogDescription>
      </DialogHeader>
      <div className="pc-seg w-fit" role="group" aria-label="What you're adding">
        <button type="button" className="pc-seg-btn" aria-pressed={mode === "activity"} onClick={() => setMode("activity")}>Something you did</button>
        <button type="button" className="pc-seg-btn" aria-pressed={mode === "skill"} onClick={() => setMode("skill")}>Just a skill</button>
      </div>
      {mode === "activity" ? <ActivityForm onDone={onDone} /> : <SkillForm onDone={onDone} />}
    </>
  );
}

function ActivityForm({ onDone }: { onDone: () => void }) {
  const j = useJourney();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ActivityKind | null>(null);
  const [role, setRole] = useState("");
  const [when, setWhen] = useState("");
  const [often, setOften] = useState("");
  const [did, setDid] = useState("");
  const [link, setLink] = useState("");
  /** Suggestions she turned off, and skills she typed herself. */
  const [off, setOff] = useState<string[]>([]);
  const [extra, setExtra] = useState<string[]>([]);
  const [typed, setTyped] = useState("");

  const suggested = useMemo(() => (kind ? suggestSkills([title, role, did, often].join(" "), kind) : []), [title, role, did, often, kind]);
  const all = [...suggested, ...extra.filter((e) => !suggested.some((s) => s.toLowerCase() === e.toLowerCase()))];
  const picked = all.filter((s) => !off.includes(s));
  const toggle = (s: string) => setOff((o) => (o.includes(s) ? o.filter((x) => x !== s) : [...o, s]));
  const addTyped = () => {
    const s = cleanSkill(typed);
    if (!s) return;
    const known = all.find((x) => x.toLowerCase() === s.toLowerCase());
    if (known) setOff((o) => o.filter((x) => x !== known));
    else setExtra((e) => [...e, s]);
    setTyped("");
  };
  const linkBad = link.trim() !== "" && !isLink(link);
  const ready = title.trim() !== "" && kind !== null && !linkBad;

  const save = () => {
    if (!ready) return;
    const id = j.addActivity({
      title: title.trim(), kind, when: when.trim(), did: did.trim(), skills: picked,
      ...(role.trim() ? { role: role.trim() } : {}), ...(often.trim() ? { often: often.trim() } : {}), ...(link.trim() ? { link: link.trim() } : {}),
    });
    toast(`${title.trim()} added`, {
      description: picked.length ? `${picked.length} ${picked.length === 1 ? "skill" : "skills"} added to Your skills, marked as added by you.` : "It's under Things you added.",
      action: { label: "Undo", onClick: () => j.removeActivity(id) },
    });
    onDone();
  };

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <label className="block text-sm font-medium">What it was<Input className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Barista at Corner Café, Robotics Club…" /></label>
      <fieldset>
        <legend className="text-sm font-medium">Kind</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">{ACTIVITY_KINDS.map((k) => <button key={k.id} type="button" aria-pressed={kind === k.id} onClick={() => setKind(k.id)} className="pick-chip">{k.label}</button>)}</div>
      </fieldset>
      <label className="block text-sm font-medium">Your role {optional}<Input className="mt-1.5" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Shift lead, treasurer, older sister…" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">When<Input className="mt-1.5" value={when} onChange={(e) => setWhen(e.target.value)} placeholder="Since Jan 2026" /></label>
        <label className="block text-sm font-medium">How often {optional}<Input className="mt-1.5" value={often} onChange={(e) => setOften(e.target.value)} placeholder="20 hrs/week" /></label>
      </div>
      <label className="block text-sm font-medium">What you did, in your own words<Textarea className="mt-1.5 min-h-24" value={did} onChange={(e) => setDid(e.target.value)} placeholder="Opened the café on weekends, handled the register and trained two new hires." /></label>
      <fieldset aria-describedby="suggest-note">
        <legend className="text-sm font-medium">Skills it built</legend>
        <p id="suggest-note" className="mt-0.5 text-xs text-muted-foreground">{kind ? "Suggested from what you wrote. Keep the ones that are true." : "Pick a kind and describe it, and I'll suggest some."}</p>
        {all.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {all.map((s) => {
              const on = !off.includes(s);
              return <button key={s} type="button" aria-pressed={on} onClick={() => toggle(s)} className="pick-chip">{s}{on ? <X className="size-3" aria-hidden="true" /> : <Plus className="size-3" aria-hidden="true" />}</button>;
            })}
          </div>
        )}
        <div className="mt-2 flex gap-2">
          <Input aria-label="Add your own skill" value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTyped(); } }} placeholder="Add your own skill" />
          <Button type="button" variant="outline" disabled={!cleanSkill(typed)} onClick={addTyped}>Add</Button>
        </div>
      </fieldset>
      <label className="block text-sm font-medium">Link to proof {optional}<Input className="mt-1.5" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" aria-invalid={linkBad || undefined} />{linkBad && <span className="mt-1 block text-xs font-normal text-muted-foreground">Start the link with https://</span>}</label>
      <Button type="submit" disabled={!ready} className="w-full">{picked.length ? `Add it with ${picked.length} ${picked.length === 1 ? "skill" : "skills"}` : "Add it"}</Button>
    </form>
  );
}

/** The old "Add a skill": one skill by name, for when there's no bigger story around it. */
function SkillForm({ onDone }: { onDone: () => void }) {
  const j = useJourney();
  const [name, setName] = useState("");
  const [where, setWhere] = useState<SingleSkill["where"]>("own");
  const [detail, setDetail] = useState("");
  const [link, setLink] = useState("");
  const linkBad = link.trim() !== "" && !isLink(link);
  const save = () => {
    const skill = cleanSkill(name);
    if (!skill || linkBad) return;
    const id = j.addOwnSkill({ name: skill, where, detail: detail.trim(), ...(link.trim() ? { link: link.trim() } : {}) });
    toast(`${skill} added`, { description: "Marked as added by you.", action: { label: "Undo", onClick: () => j.removeOwnSkill(id) } });
    onDone();
  };
  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <label className="block text-sm font-medium">Skill<Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} placeholder="Figma, Spanish, event planning…" /></label>
      <fieldset><legend className="text-sm font-medium">Where you used it</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2">{WHERE.map((w) => <button key={w.id} type="button" aria-pressed={where === w.id} onClick={() => setWhere(w.id)} className="pick-chip justify-center">{w.label}</button>)}</div>
      </fieldset>
      <label className="block text-sm font-medium">What you did {optional}<Input className="mt-1.5" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Designed flyers for the Psych Club" /></label>
      <label className="block text-sm font-medium">Link to your work {optional}<Input className="mt-1.5" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" aria-invalid={linkBad || undefined} />{linkBad && <span className="mt-1 block text-xs font-normal text-muted-foreground">Start the link with https://</span>}</label>
      <Button type="submit" disabled={!cleanSkill(name) || linkBad} className="w-full">Add skill</Button>
    </form>
  );
}
