import { useEffect, useId, useState } from "react";
import { Check, FileText, Lock, Search } from "lucide-react";
import jennaPhoto from "@/assets/jenna.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_SIGNUP_CODE, setupDirectory, student, UPLOAD_ORDER, uploadSamples, type DirectoryEntry, type UploadKey } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { searchDirectory } from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import { SchoolLogo } from "./SchoolLogo";
import { connectedSources, schoolSignIns, type SchoolSignIn } from "./sourcesData";
import { UploadFlow } from "./UploadFlow";

type SchoolId = SchoolSignIn["id"];
const isSchool = (id: string): id is SchoolId => id === "bayview" || id === "northgate";

export function AccountStep() {
  return (
    <div>
      <h1 className="text-2xl font-medium">Create your account</h1>
      <p className="mt-2 text-muted-foreground">Use your school email. We'll send a code instead of asking for a password.</p>
      <div className="mt-6 space-y-4">
        <div><Label htmlFor="setup-name">Full name</Label><Input id="setup-name" className="mt-1.5" value={student.name} readOnly /></div>
        <div><Label htmlFor="setup-email">School email</Label><Input id="setup-email" className="mt-1.5" value={student.email} readOnly /></div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Prototype: filled in with a fictional student. Nothing is saved or sent.</p>
    </div>
  );
}

export function VerifyStep({ code, onCode }: { code: string; onCode: (code: string) => void }) {
  return (
    <div>
      <h1 className="text-2xl font-medium">Check your email</h1>
      <p className="mt-2 text-muted-foreground">Enter the 6-digit code we sent to {student.email}.</p>
      <div className="mt-6">
        <Label htmlFor="setup-code">Code</Label>
        <Input id="setup-code" className="mt-1.5 tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => onCode(e.target.value)} />
      </div>
      <button className="mt-3 text-xs text-muted-foreground underline" onClick={() => onCode(DEMO_SIGNUP_CODE)}>This prototype doesn't send email. Use {DEMO_SIGNUP_CODE}</button>
    </div>
  );
}

function EntryMark({ entry }: { entry: DirectoryEntry }) {
  return isSchool(entry.id) ? <SchoolLogo school={entry.id} className="size-9" /> : null;
}

function Picker({ label, placeholder, entries, value, onChange }: { label: string; placeholder: string; entries: DirectoryEntry[]; value: DirectoryEntry | null; onChange: (e: DirectoryEntry | null) => void }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = searchDirectory(entries, query);

  if (value) {
    return (
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-1.5 flex items-center gap-3 rounded-2xl border p-3">
          <EntryMark entry={value} />
          <div className="min-w-0 flex-1"><div className="text-sm font-medium">{value.name}</div><div className="text-xs text-muted-foreground">{value.detail}</div></div>
          <button className="text-xs text-muted-foreground underline" onClick={() => { setQuery(""); onChange(null); }}>Change</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1.5">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={id} className="pl-9" placeholder={placeholder} autoComplete="off" value={query} onFocus={() => setOpen(true)} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} />
      </div>
      {open && (
        // Keeping focus on the input lets a click land before the list closes.
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border bg-card p-1 shadow-frame" onMouseDown={(e) => e.preventDefault()}>
          {results.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>}
          {results.map((e) => (
            <li key={e.id}>
              <button disabled={!e.available} onClick={() => onChange(e)} className={cn("flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm", e.available ? "hover:bg-secondary" : "text-muted-foreground")}>
                <span>{e.name}<span className="block text-xs text-muted-foreground">{e.detail}</span></span>
                {!e.available && <span className="shrink-0 text-xs">Not in this demo</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type SchoolChoices = { college: DirectoryEntry | null; transfer: DirectoryEntry | null; major: DirectoryEntry | null };

export function SchoolsStep({ choices, onChange }: { choices: SchoolChoices; onChange: (c: SchoolChoices) => void }) {
  return (
    <div>
      <h1 className="text-2xl font-medium">Where are you headed?</h1>
      <p className="mt-2 text-muted-foreground">Tell me where you study now and where you want to transfer.</p>
      <div className="mt-6 space-y-4">
        <Picker label="Your community college" placeholder="Search for your college" entries={setupDirectory.college} value={choices.college} onChange={(college) => onChange({ ...choices, college })} />
        {choices.college && <Picker label="Transferring to" placeholder="Search for a university" entries={setupDirectory.transfer} value={choices.transfer} onChange={(transfer) => onChange({ ...choices, transfer })} />}
        {choices.transfer && <Picker label="Your major" placeholder="Search for a major" entries={setupDirectory.major} value={choices.major} onChange={(major) => onChange({ ...choices, major })} />}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Fictional schools for this prototype.</p>
    </div>
  );
}

const READ_MS = 1500;

function SchoolSignInPage({ school, onCancel, onAllow }: { school: SchoolSignIn; onCancel: () => void; onAllow: () => void }) {
  const reads = connectedSources.filter((s) => school.sources.includes(s.id));
  const field = "mt-1 w-full border bg-card px-2 py-1 text-foreground";
  return (
    <div className="tour-swap mt-6">
      <div className="overflow-hidden rounded-xl border">
        <div className="flex items-center gap-1.5 border-b bg-muted px-3 py-1.5 text-[11px] text-muted-foreground"><Lock className="size-3" /> {school.url}</div>
        <div className="school-portal bg-card font-[Arial,Helvetica,sans-serif] text-[13px] text-foreground">
          <div className="flex items-center gap-2 bg-portal-navy px-4 py-2.5 font-bold text-portal-navy-foreground"><SchoolLogo school={school.id} className="size-6 rounded bg-white p-0.5" /> {school.name}</div>
          <div className="h-1 bg-portal-gold" />
          <div className="space-y-3 p-4">
            <h2>Student sign-in</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">Student ID<input className={field} value={school.studentId} readOnly /></label>
              <label className="block">Password<input className={field} type="password" value="demo-only" readOnly tabIndex={-1} /></label>
            </div>
            <div>
              <b>Path Agent is asking to read:</b>
              <ul className="mt-1 list-disc pl-5">{reads.map((s) => <li key={s.id}>{s.what}</li>)}</ul>
            </div>
            <div className="flex justify-end gap-2">
              <button className="border px-3 py-1" onClick={onCancel}>Cancel</button>
              <button className="bg-portal-navy px-3 py-1 text-portal-navy-foreground" onClick={onAllow}>Sign in and allow</button>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">You'll sign in on your school's own site. Path Agent never sees your password.</p>
    </div>
  );
}

/** The same setup without a school sign-in: the student brings the documents instead. */
function ManualSetup({ onConnected }: { onConnected: (id: SchoolId) => void }) {
  const j = useJourney();
  const [open, setOpen] = useState<UploadKey | null>(null);
  if (open) {
    const sample = uploadSamples[open];
    return <div className="tour-swap mt-6"><h2 className="mb-3 font-medium">{sample.title}</h2><UploadFlow upload={sample} onCancel={() => setOpen(null)} onDone={() => { j.addUpload(open); if (sample.required) onConnected(sample.school); setOpen(null); }} /></div>;
  }
  return (
    <div className="tour-swap">
      <div className="mt-6 space-y-2">
        {UPLOAD_ORDER.map((k) => {
          const s = uploadSamples[k];
          return (
            <div key={k} className="flex items-center gap-3 rounded-2xl border p-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary"><FileText className="size-5" /></span>
              <div className="min-w-0 flex-1"><div className="text-sm font-medium">{s.title}</div><div className="text-xs text-muted-foreground">{s.required ? (s.school === "bayview" ? "Bayview" : "Northgate") : "Optional"} · {s.why}</div></div>
              {j.uploads.includes(k) ? <span className="flex items-center gap-1 text-sm font-medium text-mark-yes"><Check className="size-4" /> Added</span>
                : <Button variant="outline" size="sm" onClick={() => setOpen(k)}>{s.action}</Button>}
            </div>
          );
        })}
      </div>
      <button type="button" className="mt-3 text-xs text-muted-foreground underline underline-offset-2" onClick={() => j.setSetupMethod("school")}>Sign in to my schools instead</button>
    </div>
  );
}

export function ConnectStep({ connected, onConnected }: { connected: SchoolId[]; onConnected: (id: SchoolId) => void }) {
  const [signingIn, setSigningIn] = useState<SchoolSignIn | null>(null);
  const [reading, setReading] = useState<SchoolId | null>(null);
  const j = useJourney();
  const manual = j.setupMethod === "manual";

  useEffect(() => {
    if (!reading) return;
    const t = setTimeout(() => { onConnected(reading); setReading(null); }, READ_MS);
    return () => clearTimeout(t);
  }, [reading, onConnected]);

  return (
    <div>
      <h1 className="text-2xl font-medium">Connect your schools</h1>
      <p className="mt-2 text-muted-foreground">{manual ? "Add your records yourself. Your transcript and degree audit are all I need to start." : "Sign in to each school so I can read your records. You can change this anytime in Controls."}</p>
      {manual ? (
        <ManualSetup onConnected={onConnected} />
      ) : signingIn ? (
        <SchoolSignInPage school={signingIn} onCancel={() => setSigningIn(null)} onAllow={() => { setReading(signingIn.id); setSigningIn(null); }} />
      ) : (
        <>
          <div className="mt-6 space-y-2">
            {schoolSignIns.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-2xl border p-3">
                <SchoolLogo school={s.id} className="size-11" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{connectedSources.filter((c) => s.sources.includes(c.id)).map((c) => c.name.split(" (")[0]).join(", ")}</div>
                </div>
                {connected.includes(s.id) ? <span className="flex items-center gap-1 text-sm font-medium text-mark-yes"><Check className="size-4" /> Connected</span>
                  : reading === s.id ? <span className="text-sm text-muted-foreground" role="status">Connecting…</span>
                  : <Button variant="outline" size="sm" disabled={reading !== null} onClick={() => setSigningIn(s)}>Sign in</Button>}
              </div>
            ))}
          </div>
          <button type="button" className="mt-3 text-xs text-muted-foreground underline underline-offset-2" onClick={() => j.setSetupMethod("manual")}>Can't sign in? Upload your records instead</button>
        </>
      )}
    </div>
  );
}

const found = [
  { school: "bayview" as const, name: "Bayview Community College", detail: "Current student · quarter system · Associate in Arts", upload: "transcript" as const, from: "Found in your Bayview student system", uploaded: "Found in the transcript you uploaded" },
  { school: "northgate" as const, name: "Northgate State University", detail: "Admitted for Fall 2027 · semester system · Psychology B.A.", upload: "audit" as const, from: "Found in your Northgate degree audit", uploaded: "Found in the degree audit you uploaded" },
];

export function ConfirmStep() {
  const j = useJourney();
  return (
    <div>
      <h1 className="text-2xl font-medium">Here's what your schools have on file</h1>
      <p className="mt-2 text-muted-foreground">Does this look right?</p>
      <div className="found-you stagger mt-6 space-y-3">
        {found.map((f) => (
          <div key={f.school} className="flex items-center gap-4 rounded-2xl border p-4">
            <SchoolLogo school={f.school} className="size-11" />
            <div className="flex-1"><div className="font-medium">{f.name}</div><div className="text-sm text-muted-foreground">{f.detail}</div><div className="mt-1 text-xs text-muted-foreground">{j.uploads.includes(f.upload) ? f.uploaded : f.from}</div></div>
          </div>
        ))}
        <div className="flex items-center gap-4 rounded-2xl border p-4">
          <img src={jennaPhoto} alt="" width={44} height={44} className="size-11 shrink-0 rounded-full object-cover" />
          <div className="flex-1"><div className="font-medium">{student.counselor}</div><div className="text-sm text-muted-foreground">Your transfer counselor</div><div className="mt-1 text-xs text-muted-foreground">Found in your Northgate degree audit</div></div>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Quarter units convert to semester units using both schools' policies.</p>
    </div>
  );
}
