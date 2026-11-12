import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { Check, Pencil, RotateCw, Sparkles } from "lucide-react";
import mayaPhoto from "@/assets/maya.jpg";
import { SchoolLogo } from "@/components/app/SchoolLogo";
import { Switch } from "@/components/ui/switch";
import { goTogetherEvent, student, type EventPeer } from "@/data/scenario";
import { photoUrl } from "@/lib/photos";
import { calm } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Everything on the card is synthetic, like the rest of the demo.

export type Tier = "school" | "school-staff" | "everyone";
const TIERS: { id: Tier; name: string; sub: string; note: string }[] = [
  { id: "school", name: "Bayview students", sub: "Going to the same event", note: "Only Bayview students going to the same event see your card." },
  { id: "school-staff", name: "Bayview students and staff", sub: "Counselors, faculty, club advisors", note: "Staff can see your card. Only students can ask to go together." },
  { id: "everyone", name: "Everyone at the event", sub: "Other schools and professionals too", note: "Everyone at the event sees your card. Only students can ask to go together, and staff and professionals never see your contact info." },
];

const COVERS = [
  { id: "bay", name: "Bay", css: "linear-gradient(160deg,#bfe6f2 0%,#8fd3d0 45%,#c9e9b8 100%)" },
  { id: "dusk", name: "Dusk", css: "linear-gradient(160deg,#ffd3c4 0%,#f3a6c8 50%,#b7a8f0 100%)" },
  { id: "meadow", name: "Meadow", css: "linear-gradient(160deg,#fff1b8 0%,#c9e9a0 50%,#8fcf9c 100%)" },
  { id: "night", name: "Night", css: "linear-gradient(160deg,#283a5c 0%,#4b5f9e 50%,#9a86d8 100%)" },
];
const ACCENTS = [
  { id: "aqua", name: "Aqua", c: "#3fc6c0", ink: "#063b3a" },
  { id: "lime", name: "Lime", c: "#a6ec5a", ink: "#22400a" },
  { id: "violet", name: "Violet", c: "#9d8cf2", ink: "#231a5c" },
  { id: "coral", name: "Coral", c: "#ff9b85", ink: "#5a1d10" },
];
const FINISHES = ["glass", "holo", "matte"] as const;
type Finish = (typeof FINISHES)[number];

const FIGMA = <svg viewBox="0 0 12 18" aria-hidden="true"><rect width="6" height="6" rx="3" fill="#f24e1e" /><rect x="6" width="6" height="6" rx="3" fill="#ff7262" /><rect y="6" width="6" height="6" rx="3" fill="#a259ff" /><circle cx="9" cy="9" r="3" fill="#1abcfe" /><rect y="12" width="6" height="6" rx="3" fill="#0acf83" /></svg>;
/** Software she uses or is learning. The card shows the ones she picks; Career lists all of them. */
export const TOOLS = [
  { id: "figma", name: "Figma", from: "Figma for Non-Designers workshop", logo: FIGMA, bg: "#1e1e1e" },
  { id: "gforms", name: "Google Forms", from: "Added by you", logo: "F", bg: "#7248b9" },
  { id: "notion", name: "Notion", from: "Added by you", logo: "N", bg: "#111" },
  { id: "excel", name: "Excel", from: "Learning in STAT 2 · Summer 2027", logo: "X", bg: "#1d7a45", later: true },
  { id: "r", name: "R", from: "Learning in STAT 2 · Summer 2027", logo: "R", bg: "#276dc3", later: true },
];

const I = {
  email: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>,
  phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>,
  insta: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>,
  linkedin: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4V21H3V9.5Zm7 0h3.8v1.6h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.1c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4V9.5Z" /></svg>,
  web: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>,
};
type ContactId = keyof typeof I;
const CONTACTS: { id: ContactId; label: string; value: string }[] = [
  { id: "email", label: "School email", value: student.email },
  { id: "phone", label: "Phone", value: "(555) 010-4471" },
  { id: "insta", label: "Instagram", value: "@maya.makes" },
  { id: "linkedin", label: "LinkedIn", value: "linkedin.com/in/maya-t" },
  { id: "web", label: "Website", value: "mayat.example" },
];

const SHOW = [
  { id: "event", label: "Event I'm going to" },
  { id: "skills", label: "Top skills" },
  { id: "fact", label: "Fun fact" },
  { id: "tools", label: "Tools" },
  { id: "standing", label: "My standing" },
  { id: "together", label: "Open to going together" },
  { id: "fullname", label: "Full last name" },
] as const;
type ShowId = (typeof SHOW)[number]["id"];

const SKILL_TINTS = ["#e4f3ff", "#efeaff", "#fff1e3", "#e6f7ec", "#fdeef3", "#fff7d6"];

/** The Path card and its "Make it yours" panel. Seen only at events you turn it on for.
 *  Not editing, the card shows on its own with `about` beside it; "Edit your card" opens the panel in place, so edits show on the same card. */
export function PathCardStudio({ skills, editing = true, onEdit, about }: { skills: { key: string; name: string; from: string }[]; editing?: boolean; onEdit?: (on: boolean) => void; about?: ReactNode }) {
  const [tier, setTier] = useState<Tier>("school");
  const [cover, setCover] = useState(COVERS[0]!);
  const [accent, setAccent] = useState(ACCENTS[0]!);
  const [finish, setFinish] = useState<Finish>("glass");
  const [top, setTop] = useState(() => skills.slice(0, 3).map((s) => s.key));
  const [schools, setSchools] = useState<"bayview" | "northgate" | "both">("both");
  const [tools, setTools] = useState(["figma", "gforms", "notion"]);
  const [ask, setAsk] = useState("Why some apps just feel easy to use and others don't.");
  const [fact, setFact] = useState("I have library cards from 9 different cities.");
  const [contacts, setContacts] = useState<Record<ContactId, { on: boolean; value: string }>>(() => Object.fromEntries(CONTACTS.map((c) => [c.id, { on: c.id === "email" || c.id === "linkedin", value: c.value }])) as Record<ContactId, { on: boolean; value: string }>);
  const [show, setShow] = useState<Record<ShowId, boolean>>({ event: true, skills: true, fact: true, tools: true, standing: true, together: true, fullname: false });
  const [flipped, setFlipped] = useState(false);
  const [panel, setPanel] = useState<PanelId>("look");

  const toggle = <T,>(list: T[], v: T, on: boolean) => (on ? [...list, v] : list.filter((x) => x !== v));
  const pickedSkills = top.map((k) => skills.find((s) => s.key === k)).filter((s): s is NonNullable<typeof s> => !!s);
  const style = { "--pc-cover": cover.css, "--pc-accent": accent.c, "--pc-ink": accent.ink } as CSSProperties;

  return (
    <div className="pc-stage" data-viewing={editing ? undefined : ""}>
      <div className="pc-stage-card" style={style}>
        <CardFace flipped={flipped} onFlip={() => setFlipped((f) => !f)} finish={finish}>
          <section className="pc-face pc-front">
            <div className="pc-holo" /><div className="pc-glare" />
            <div className="pc-cover">
              <div className="pc-top">
                <span className="pc-brand"><span className="pc-logo"><svg viewBox="0 0 24 24" fill="none" stroke="#0f1722" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 18c3 0 4-12 7-12s4 8 7 8" /><circle cx="19" cy="14" r="1.6" fill="#0f1722" stroke="none" /></svg></span>Path card</span>
                <span className="pc-brand pc-verified" title="Skills on this card are verified by Sprout"><Check className="size-3" aria-hidden="true" />Verified</span>
              </div>
              <img className="pc-avatar" src={mayaPhoto} alt="" />
            </div>
            <div className="pc-body">
              <h3 className="pc-name">{show.fullname ? student.name : "Maya T."}</h3>
              <div className="pc-major">{show.standing && <span className="pc-standing">Sophomore</span>}Psychology</div>
              <div className="pc-schools">
                {schools !== "northgate" && <span><SchoolLogo school="bayview" className="size-6" />Bayview CC</span>}
                {schools !== "bayview" && <span><SchoolLogo school="northgate" className="size-6" />Northgate State</span>}
              </div>
              <div className="pc-pills">
                {show.event && <span className="pc-pill"><span className="pc-dot" />Going to UX Night · Tue 5:30</span>}
                {show.tools && tools.length > 0 && <span className="pc-pill pc-tools"><span className="pc-tstack">{TOOLS.filter((t) => tools.includes(t.id)).slice(0, 4).map((t) => <span key={t.id} className="pc-tl" style={{ background: t.bg }}>{t.logo}</span>)}</span>{tools.length} tools</span>}
              </div>
              {CONTACTS.some((c) => contacts[c.id].on && contacts[c.id].value.trim()) && (
                <div className="pc-links" aria-label="Ways a match can reach you">
                  {CONTACTS.filter((c) => contacts[c.id].on && contacts[c.id].value.trim()).map((c) => <span key={c.id} className="pc-lk" title={c.label}>{I[c.id]}</span>)}
                </div>
              )}
            </div>
            {show.fact && fact.trim() && <div className="pc-fact"><span className="pc-ico" style={{ background: "#fff3c9" }}><Sparkles className="size-3.5" aria-hidden="true" /></span><div><span>Fun fact</span><b>{fact}</b></div></div>}
            {show.together && <div className="pc-tab">Open to going together</div>}
          </section>
          <section className="pc-face pc-back">
            <div className="pc-holo" /><div className="pc-glare" />
            <div className="pc-back-inner">
              <span className="pc-brand pc-brand-plain"><img src={mayaPhoto} alt="" className="size-[22px] rounded-[7px] object-cover" />{show.fullname ? student.name : "Maya T."}</span>
              {ask.trim() && <><h4>Ask me about</h4><p className="pc-ask">{ask}</p></>}
              {show.event && <><h4>Going to</h4><div className="pc-event"><span className="pc-date">NOV<b>10</b></span><div><b>UX Night</b><span>Eastshore Design Collective</span></div></div></>}
              {show.skills && pickedSkills.length > 0 && <><h4>Top skills</h4><ul className="pc-skills">{pickedSkills.map((s, i) => <li key={s.key}><span className="pc-ico" style={{ background: SKILL_TINTS[i % SKILL_TINTS.length] }}><Check className="size-3.5" aria-hidden="true" /></span>{s.name}</li>)}</ul></>}
            </div>
          </section>
        </CardFace>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => setFlipped((f) => !f)} className="pc-flip"><RotateCw className="size-4" aria-hidden="true" />Flip card</button>
          {onEdit && <button type="button" onClick={() => onEdit(!editing)} className="pc-flip">{editing ? <><Check className="size-4" aria-hidden="true" />Done editing</> : <><Pencil className="size-4" aria-hidden="true" />Edit your card</>}</button>}
        </div>
      </div>

      {!editing ? about : <aside className="pc-panel" aria-label="Make it yours">
        <div className="pc-panel-head">
          <h2 className="text-base font-semibold">Make it yours</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your card only shows at events you turn it on for.</p>
          <div className="pc-tabs segmented" role="tablist" aria-label="Card settings">
            {PANELS.map((t) => <button key={t.id} type="button" role="tab" aria-selected={panel === t.id} onClick={() => setPanel(t.id)} className="pc-tab-btn">{t.label}</button>)}
          </div>
        </div>
        <div className="pc-panel-body" role="tabpanel">
        {panel === "look" && <>
        <Field title="Who can see it">
          <div className="grid gap-2">
            {TIERS.map((t) => <button key={t.id} type="button" aria-pressed={tier === t.id} onClick={() => setTier(t.id)} className="pc-option"><b>{t.name}</b><small>{t.sub}</small></button>)}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{TIERS.find((t) => t.id === tier)!.note}</p>
        </Field>
        <Field title="Cover"><div className="flex gap-2">{COVERS.map((c) => <button key={c.id} type="button" aria-label={c.name} aria-pressed={cover.id === c.id} onClick={() => setCover(c)} className="pc-sw" style={{ background: c.css }} />)}</div></Field>
        <Field title="Accent"><div className="flex gap-2">{ACCENTS.map((a) => <button key={a.id} type="button" aria-label={a.name} aria-pressed={accent.id === a.id} onClick={() => setAccent(a)} className="pc-sw" style={{ background: a.c }} />)}</div></Field>
        <Field title="Finish"><Seg value={finish} options={FINISHES.map((f) => ({ id: f, label: f[0]!.toUpperCase() + f.slice(1) }))} onPick={setFinish} /></Field>
        <Field title="Schools"><Seg value={schools} options={[{ id: "bayview", label: "Bayview" }, { id: "northgate", label: "Northgate" }, { id: "both", label: "Both" }]} onPick={setSchools} /></Field>
        <Field title="Show on my card">
          {SHOW.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center justify-between border-t py-2.5 text-sm first:border-t-0">{s.label}<Switch checked={show[s.id]} onCheckedChange={(on) => setShow((m) => ({ ...m, [s.id]: on }))} /></label>
          ))}
        </Field>
        </>}
        {panel === "skills" && <>
        <Field title="Top skills" aside={`${top.length} of 3`}>
          <p className="mb-2 text-xs text-muted-foreground">Only skills Sprout has verified. Where each came from stays private to you.</p>
          {skills.map((s) => {
            const on = top.includes(s.key);
            return <Pick key={s.key} title={s.name} sub={s.from} checked={on} disabled={!on && top.length >= 3} onChange={(v) => setTop((l) => toggle(l, s.key, v))} />;
          })}
        </Field>
        <Field title="Tools I use">
          <p className="mb-2 text-xs text-muted-foreground">Sprout adds tools from your classes and workshops. You can add your own too.</p>
          {TOOLS.map((t) => <Pick key={t.id} icon={<span className="pc-tl pc-tl-lg" style={{ background: t.bg }}>{t.logo}</span>} title={t.name} sub={t.from} checked={tools.includes(t.id)} disabled={!!t.later} onChange={(v) => setTools((l) => toggle(l, t.id, v))} />)}
        </Field>
        </>}
        {panel === "about" && <>
        <Field title="Ask me about"><input value={ask} maxLength={70} onChange={(e) => setAsk(e.target.value)} aria-label="Ask me about" className="pc-input" /></Field>
        <Field title="Fun fact"><input value={fact} maxLength={70} onChange={(e) => setFact(e.target.value)} aria-label="Fun fact" className="pc-input" /></Field>
        </>}
        {panel === "contact" && (
        <Field title="How a match can reach me">
          <p className="mb-2 text-xs text-muted-foreground">Shared only with students, after you both say "Let's go together." Your school email is the default.</p>
          {CONTACTS.map((c) => (
            <div key={c.id} className="flex items-center gap-2 border-t py-1.5 first:border-t-0">
              <span className="grid w-6 place-items-center [&>svg]:size-4">{I[c.id]}</span>
              <input value={contacts[c.id].value} onChange={(e) => setContacts((m) => ({ ...m, [c.id]: { ...m[c.id], value: e.target.value } }))} aria-label={c.label} className="pc-input min-w-0 flex-1" />
              <Switch checked={contacts[c.id].on} onCheckedChange={(on) => setContacts((m) => ({ ...m, [c.id]: { ...m[c.id], on } }))} aria-label={`Share ${c.label}`} />
            </div>
          ))}
        </Field>
        )}
        </div>
      </aside>}
    </div>
  );
}

type PanelId = "look" | "skills" | "about" | "contact";
const PANELS: { id: PanelId; label: string }[] = [{ id: "look", label: "Look" }, { id: "skills", label: "Skills" }, { id: "about", label: "About" }, { id: "contact", label: "Contact" }];

/** The 3D card: tilts toward the pointer and flips on click. Still when motion is reduced. */
const PEER_LOOK: Record<string, { cover: number; accent: number }> = { lena: { cover: 1, accent: 2 }, tomas: { cover: 0, accent: 0 }, jordan: { cover: 2, accent: 1 } };
const peerStyle = (id: string) => {
  // Peers without a chosen look get a steady one from their id, so the list doesn't look copy-pasted.
  const h = [...id].reduce((n, ch) => n + ch.charCodeAt(0), 0);
  const look = PEER_LOOK[id] ?? { cover: h % COVERS.length, accent: h % ACCENTS.length };
  const accent = ACCENTS[look.accent]!;
  return { "--pc-cover": COVERS[look.cover]!.css, "--pc-accent": accent.c, "--pc-ink": accent.ink } as CSSProperties;
};
const PathMark = <span className="pc-logo"><svg viewBox="0 0 24 24" fill="none" stroke="#0f1722" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 18c3 0 4-12 7-12s4 8 7 8" /><circle cx="19" cy="14" r="1.6" fill="#0f1722" stroke="none" /></svg></span>;

/** Someone else's Path card, read only: only what they chose to share. */
export function PeerPathCard({ peer }: { peer: EventPeer }) {
  const [flipped, setFlipped] = useState(false);
  const photo = photoUrl(peer.photo, 400);
  const ev = goTogetherEvent;
  return (
    <div className="pc-stage-card" style={peerStyle(peer.id)}>
      <CardFace flipped={flipped} onFlip={() => setFlipped((f) => !f)} finish="glass">
        <section className="pc-face pc-front" aria-label={`${peer.name}'s Path card`}>
          <div className="pc-holo" /><div className="pc-glare" />
          <div className="pc-cover">
            <div className="pc-top">
              <span className="pc-brand">{PathMark}Path card</span>
              <span className="pc-brand pc-verified" title="Skills on this card are verified by Sprout"><Check className="size-3" aria-hidden="true" />Verified</span>
            </div>
            <img className="pc-avatar" src={photo} alt="" />
          </div>
          <div className="pc-body">
            <h3 className="pc-name">{peer.name}</h3>
            <div className="pc-major"><span className="pc-standing">{peer.standing}</span>{peer.major}</div>
            <div className="pc-schools"><span><SchoolLogo school="bayview" className="size-6" />Bayview CC</span></div>
            <div className="pc-pills">
              <span className="pc-pill"><span className="pc-dot" />Going to {ev.name} · Tue 5:30</span>
              <span className="pc-pill pc-tools"><span className="pc-tstack">{TOOLS.filter((t) => peer.tools.includes(t.id)).map((t) => <span key={t.id} className="pc-tl" style={{ background: t.bg }}>{t.logo}</span>)}</span>{peer.tools.length} {peer.tools.length === 1 ? "tool" : "tools"}</span>
            </div>
          </div>
          <div className="pc-fact"><span className="pc-ico" style={{ background: "#fff3c9" }}><Sparkles className="size-3.5" aria-hidden="true" /></span><div><span>Fun fact</span><b>{peer.fact}</b></div></div>
          <div className="pc-tab">Open to going together</div>
        </section>
        <section className="pc-face pc-back">
          <div className="pc-holo" /><div className="pc-glare" />
          <div className="pc-back-inner">
            <span className="pc-brand pc-brand-plain"><img src={photo} alt="" className="size-[22px] rounded-[7px] object-cover" />{peer.name}</span>
            <h4>Ask me about</h4><p className="pc-ask">{peer.ask}</p>
            <h4>Going to</h4><div className="pc-event"><span className="pc-date">NOV<b>10</b></span><div><b>{ev.name}</b><span>Eastshore Design Collective</span></div></div>
            <h4>Top skills</h4><ul className="pc-skills">{peer.skills.map((s, i) => <li key={s}><span className="pc-ico" style={{ background: SKILL_TINTS[i % SKILL_TINTS.length] }}><Check className="size-3.5" aria-hidden="true" /></span>{s}</li>)}</ul>
          </div>
        </section>
      </CardFace>
      <button type="button" onClick={() => setFlipped((f) => !f)} className="pc-flip"><RotateCw className="size-4" aria-hidden="true" />Flip card</button>
    </div>
  );
}

/** A small card for scrolling through who's going. The action underneath depends on who asked whom. */
export function PeerMiniCard({ peer, children, onOpen }: { peer: EventPeer; children: ReactNode; onOpen: () => void }) {
  return (
    <li className="peer-card" style={peerStyle(peer.id)}>
      <button type="button" onClick={onOpen} className="peer-card-open" aria-label={`See ${peer.name}'s full card`}>
        <span className="peer-cover"><img className="peer-avatar" src={photoUrl(peer.photo, 160)} alt="" /></span>
        <span className="block px-3 pt-8">
          <span className="block text-sm font-semibold">{peer.name}</span>
          <span className="block text-xs text-muted-foreground">{peer.standing} · {peer.major}</span>
          <span className="mt-2 block text-[11px] text-muted-foreground">Ask me about</span>
          <span className="block text-xs leading-snug">{peer.ask}</span>
          <span className="mt-2 flex flex-wrap gap-1">{peer.skills.slice(0, 2).map((s) => <span key={s} className="peer-skill"><Check className="size-3" aria-hidden="true" />{s}</span>)}</span>
        </span>
      </button>
      <div className="mt-auto px-3 pb-3 pt-3">{children}</div>
    </li>
  );
}

function CardFace({ flipped, onFlip, finish, children }: { flipped: boolean; onFlip: () => void; finish: Finish; children: ReactNode }) {
  const card = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, on: false });
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (calm() || !card.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setTilt({ x: (0.5 - py) * 16, y: (px - 0.5) * 20, on: true });
    const s = card.current.style;
    s.setProperty("--gx", `${(flipped ? 1 - px : px) * 100}%`);
    s.setProperty("--gy", `${py * 100}%`);
    s.setProperty("--hx", `${px * 100}%`);
    s.setProperty("--hy", `${py * 100}%`);
    s.setProperty("--rim-angle", `${135 + (px - 0.5) * 120}deg`);
    s.setProperty("--foil", `${px * 360}deg`);
  };
  return (
    <div className="pc-wrap" onPointerMove={move} onPointerLeave={() => setTilt({ x: 0, y: 0, on: false })}>
      <div ref={card} role="button" tabIndex={0} aria-label={`Maya's Path card, ${flipped ? "back" : "front"}. Press to flip.`} onClick={onFlip} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFlip(); } }}
        className={cn("pc-card", `pc-finish-${finish}`, tilt.on && "pc-tilting")} style={{ transform: `rotateY(${(flipped ? 180 : 0) + tilt.y}deg) rotateX(${tilt.x}deg)` }}>
        {children}
      </div>
    </div>
  );
}

function Field({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return <div><div className="mb-2 flex justify-between text-xs font-semibold">{title}{aside && <span className="font-medium text-muted-foreground">{aside}</span>}</div>{children}</div>;
}

function Seg<T extends string>({ value, options, onPick }: { value: T; options: { id: T; label: string }[]; onPick: (v: T) => void }) {
  return <div className="pc-seg">{options.map((o) => <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onPick(o.id)}>{o.label}</button>)}</div>;
}

function Pick({ title, sub, icon, checked, disabled, onChange }: { title: string; sub: string; icon?: ReactNode; checked: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className={cn("-mx-2 flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm hover:bg-muted", disabled && "cursor-not-allowed opacity-50")}>
      {icon}
      <span className="min-w-0 flex-1">{title}<small className="block text-xs text-muted-foreground">{sub}</small></span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-foreground" />
    </label>
  );
}
