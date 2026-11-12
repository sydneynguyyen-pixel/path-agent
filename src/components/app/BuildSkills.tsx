import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { careerRoles, opportunities, type CareerRole } from "@/data/scenario";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useJourney } from "@/lib/journey";
import { buildSkillsFor, skillSuggestions } from "@/lib/goals";
import { distinct } from "@/lib/opportunities";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CareerMark } from "@/components/app/CareerMark";

const BUILDABLE = distinct(opportunities.flatMap((o) => o.fills));

/** On Plan: her goal as one sentence, with the skills she's building for it. Edits are a draft until she presses Save; the button reads "Saved" when nothing is pending. Explore's "Builds …" shelves and Home's goal widget follow the saved list. */
export function BuildSkills({ role, onRole }: { role: CareerRole; onRole: (id: string) => void }) {
  const j = useJourney();
  const navigate = useNavigate();
  const saved = buildSkillsFor(role, j.buildSkills);
  const [draft, setDraft] = useState(saved);
  const dirty = draft.length !== saved.length || draft.some((n, i) => n !== saved[i]);
  const save = () => {
    j.setBuildSkills(role.id, draft);
    toast("Saved", { description: "Explore and Home now follow these skills.", action: { label: "See on Explore", onClick: () => void navigate({ to: "/explore" }) } });
  };
  return (
    <div className="space-y-4">
      <section aria-label="Skills you're building" className="flex flex-wrap items-center gap-x-2 gap-y-2.5 text-base">
        <span className="text-muted-foreground">I want to be a</span>
        <Select value={role.id} onValueChange={onRole}>
          <SelectTrigger aria-label="Career to plan toward" className="h-9 w-auto gap-2 rounded-full border-0 bg-card/80 pr-3 pl-1.5 text-base font-medium shadow-soft"><SelectValue /></SelectTrigger>
          <SelectContent>{careerRoles.map((r) => <SelectItem key={r.id} value={r.id}><span className="flex items-center gap-2"><CareerMark id={r.id} size="sm" />{r.title}</span></SelectItem>)}</SelectContent>
        </Select>
        <span className="text-muted-foreground">and build my</span>
        {draft.map((n) => (
          <span key={n} className="inline-flex h-9 items-center rounded-full bg-card/80 pl-3.5 text-sm font-medium shadow-soft">
            {n}
            <button type="button" onClick={() => setDraft(draft.filter((b) => b !== n))} aria-label={`Stop building ${n}`} className="mr-1 ml-1 grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground"><X className="size-3.5" aria-hidden="true" /></button>
          </span>
        ))}
        <AddBuildSkill role={role} picked={draft} onAdd={(n) => setDraft([...draft, n])} />
        <span className="text-muted-foreground">skills.</span>
      </section>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={!dirty} onClick={save}>{dirty ? "Save" : <><Check className="size-3.5" aria-hidden="true" />Saved</>}</Button>
        {dirty && <Button size="sm" variant="ghost" onClick={() => setDraft(saved)}>Discard</Button>}
      </div>
    </div>
  );
}

/** Sprout suggests skills for the goal; she can pick one or write her own. */
function AddBuildSkill({ role, picked, onAdd }: { role: CareerRole; picked: string[]; onAdd: (skill: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const all = skillSuggestions(role, picked, BUILDABLE);
  const q = text.trim().toLowerCase();
  const list = (q ? all.filter((n) => n.toLowerCase().includes(q)) : all).slice(0, 8);
  const exact = all.some((n) => n.toLowerCase() === q) || picked.some((n) => n.toLowerCase() === q);
  const add = (n: string) => { onAdd(n); setText(""); setOpen(false); };
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setText(""); }}>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-foreground/20 px-3.5 text-sm font-medium text-muted-foreground hover:border-foreground/40 hover:text-foreground"><Plus className="size-3.5" aria-hidden="true" />{picked.length === 0 ? "Add a skill" : "Add"}</button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 rounded-2xl p-2">
        <form onSubmit={(e) => { e.preventDefault(); if (q && !picked.some((n) => n.toLowerCase() === q)) add(list.find((n) => n.toLowerCase() === q) ?? text.trim()); }}>
          <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a skill or pick one" aria-label="Skill to build" className="h-10 rounded-xl" />
        </form>
        <p className="px-2 pt-3 pb-1 text-xs text-muted-foreground">{q ? "Matches" : `Suggested for ${role.title}`}</p>
        <ul className="max-h-72 overflow-y-auto">
          {list.map((n) => <li key={n}><button type="button" onClick={() => add(n)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-secondary"><Sparkles className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />{n}</button></li>)}
          {q && !exact && <li><button type="button" onClick={() => add(text.trim())} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-secondary"><Plus className="size-3.5 shrink-0" aria-hidden="true" />Add "{text.trim()}"</button></li>}
          {!q && list.length === 0 && <li className="px-2 py-2 text-sm text-muted-foreground">Type any skill to add it.</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
