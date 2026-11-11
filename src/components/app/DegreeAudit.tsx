import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { SourceChip } from "@/components/app/bits";
import { DegreeMark } from "@/components/app/DegreeMark";
import { CourseLink } from "@/components/app/SkillsBits";
import { outsideSchool, requirements } from "@/data/scenario";
import { useDegreeAudit } from "@/hooks/use-degree-audit";
import { useJourney } from "@/lib/journey";
import { formatCredits, transferReadiness, type AuditCategory, type AuditRule, type AuditSlot, type DegreeAudit, type TransferItem } from "@/lib/degree";

const share = (n: number, of: number) => `${(n / of) * 100}%`;

export function DegreeAuditView({ audit, row, slot }: { audit: DegreeAudit; row?: string | undefined; slot?: string | undefined }) {
  const { input } = useDegreeAudit();
  const [openId, setOpenId] = useState<string | null>(row ?? null);
  const toggle = (id: string) => setOpenId((c) => (c === id ? null : id));
  const met = audit.rules.filter((r) => r.done >= r.needed).length;
  const ready = useMemo(() => transferReadiness(requirements, input), [input]);
  const readyDone = ready.filter((r) => r.status === "done").length;
  const root = useRef<HTMLDivElement>(null);

  // Arriving from another page: open that row, then bring the line into view once it has unfolded.
  useEffect(() => {
    if (!row) return;
    setOpenId(row);
    const t = setTimeout(() => root.current?.querySelector(slot ? `[data-slot="${slot}"]` : `[data-row="${row}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 320);
    return () => clearTimeout(t);
  }, [row, slot]);

  return (
    <div ref={root} className="dg-audit">
      <div className="dg-sheet">
        <div className="dg-head">
          <div className="dg-degree">{audit.degree} · {audit.school}</div>
          <div className="dg-total"><b>{formatCredits(audit.earned)}</b> of {audit.needed} credits</div>
          <div className="dg-bar" role="img" aria-label={`${formatCredits(audit.earned)} credits earned, ${formatCredits(audit.now)} in progress, ${formatCredits(audit.planned)} planned, of ${audit.needed}`}>
            <i data-st="done" style={{ width: share(audit.earned, audit.needed) }} />
            <i data-st="now" style={{ width: share(audit.now, audit.needed) }} />
            <i data-st="planned" style={{ width: share(audit.planned, audit.needed) }} />
          </div>
          <div className="dg-key">
            <span><i data-st="done" />{formatCredits(audit.earned)} earned</span>
            <span><i data-st="now" />{formatCredits(audit.now)} in progress</span>
            <span><i data-st="planned" />{formatCredits(audit.planned)} planned</span>
            <span className="dg-grad">{audit.short > 0 ? `${formatCredits(audit.short)} credits not planned yet` : `Graduating ${audit.gradTerm}`}</span>
          </div>
        </div>

        <div className="dg-rows">
          {audit.categories.map((c) => <CategoryRow key={c.id} category={c} open={openId === c.id} found={slot} onToggle={() => toggle(c.id)} />)}
          <section className="dg-row" data-open={openId === "rules" || undefined}>
            <button type="button" className="dg-row-head" aria-expanded={openId === "rules"} onClick={() => toggle("rules")}>
              <span className="dg-row-name"><b>University requirements</b><span>Already part of your {audit.needed}</span></span>
              <span className="dg-row-marks" aria-hidden="true">{audit.rules.map((r) => <DegreeMark key={r.id} status={r.done >= r.needed ? "done" : r.done + r.planned >= r.needed ? "planned" : "open"} />)}</span>
              <span className="dg-row-credits"><b>{met}</b> of {audit.rules.length} met</span>
              <ChevronDown className="dg-chev" aria-hidden="true" />
            </button>
            <Collapse open={openId === "rules"}>{audit.rules.map((r) => <RuleLine key={r.id} rule={r} />)}</Collapse>
          </section>
          <section className="dg-row" data-row="transfer" data-open={openId === "transfer" || undefined}>
            <button type="button" className="dg-row-head" aria-expanded={openId === "transfer"} onClick={() => toggle("transfer")}>
              <span className="dg-row-name"><b>Ready to transfer</b><span>What Bayview needs from you first</span></span>
              <span className="dg-row-marks" aria-hidden="true">{ready.map((r) => <DegreeMark key={r.id} status={r.status} />)}</span>
              <span className="dg-row-credits"><b>{readyDone}</b> of {ready.length} done</span>
              <ChevronDown className="dg-chev" aria-hidden="true" />
            </button>
            <Collapse open={openId === "transfer"}>{ready.map((r) => <TransferLine key={r.id} item={r} />)}</Collapse>
          </section>
          <section className="dg-row" data-row="units" data-open={openId === "units" || undefined}>
            <button type="button" className="dg-row-head" aria-expanded={openId === "units"} onClick={() => toggle("units")}>
              <span className="dg-row-name"><b>How your units convert</b><span>Quarters at Bayview, semesters at Northgate</span></span>
              <span className="dg-row-marks" aria-hidden="true" />
              <span className="dg-row-credits" />
              <ChevronDown className="dg-chev" aria-hidden="true" />
            </button>
            <Collapse open={openId === "units"}><UnitLines /></Collapse>
          </section>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({ category: c, open, found, onToggle }: { category: AuditCategory; open: boolean; found?: string | undefined; onToggle: () => void }) {
  return (
    <section className="dg-row" data-row={c.id} data-open={open || undefined} style={{ "--c": c.color } as CSSProperties}>
      <button type="button" className="dg-row-head" aria-expanded={open} onClick={onToggle}>
        <span className="dg-row-name"><b>{c.name}</b><span>{c.about}</span></span>
        <span className="dg-row-marks" aria-hidden="true">{c.slots.map((s) => <DegreeMark key={s.id} status={s.status} />)}</span>
        <span className="dg-row-credits"><b>{formatCredits(c.credits.done)}</b> of {c.needed}</span>
        <ChevronDown className="dg-chev" aria-hidden="true" />
      </button>
      <Collapse open={open}>
        {c.slots.map((s) => <SlotLine key={s.id} slot={s} found={found === s.id} />)}
        {c.extra > 0.05 && <p className="dg-note">Your plan has {formatCredits(c.extra)} more credits than you need.</p>}
      </Collapse>
    </section>
  );
}

function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return <div className="dg-collapse" data-open={open || undefined} inert={!open}><div><div className="dg-slots">{children}</div></div></div>;
}

function SlotLine({ slot: s, found }: { slot: AuditSlot; found: boolean }) {
  const j = useJourney();
  const named = s.code ?? (s.status === "done" ? s.title : undefined);
  return (
    <div className="dg-slot" data-slot={s.id} data-st={s.status} data-found={found || undefined}>
      <DegreeMark status={s.status} />
      <span className="dg-slot-need">{s.need}</span>
      <span className="dg-slot-class">
        {named ? <><b>{s.code ? <CourseLink course={s.code} /> : named}</b>{s.code && s.title ? ` ${s.title}` : ""}{s.grade ? ` · ${s.grade}` : ""}</> : s.detail ?? s.hint}
        {named && s.detail ? <em>{s.detail}</em> : null}
        {s.id === "qr1" && s.status === "open" && <button type="button" className="ml-1.5 font-medium text-foreground underline underline-offset-2" onClick={() => j.setPanelOpen(true)}>See options</button>}
        {s.id !== "qr1" && s.status === "open" && <Link to="/explore" search={{ fills: s.id }} className="ml-1.5 font-medium text-foreground underline underline-offset-2">Find a class</Link>}
      </span>
      <span className="dg-slot-term">{s.termId ? <Link to="/semester" search={{ term: s.termId }} className="underline-offset-2 hover:text-foreground hover:underline">{s.termName}</Link> : "On your record"}</span>
      <span className="dg-slot-credits">{s.credits ? formatCredits(s.credits) : ""}</span>
    </div>
  );
}

function TransferLine({ item: r }: { item: TransferItem }) {
  return (
    <div className="dg-slot" data-st={r.status}>
      <DegreeMark status={r.status} />
      <span className="dg-slot-need">{r.name}</span>
      <span className="dg-slot-class">{r.detail}</span>
      <span className="dg-slot-term" />
      <span className="dg-slot-credits">{formatCredits(r.credits)}</span>
    </div>
  );
}

function UnitLines() {
  const o = outsideSchool;
  return (
    <div className="dg-units">
      <div><span>Bayview CC</span><b>1 quarter unit = 0.667 semester units</b><SourceChip id="bcc-units" /></div>
      <div><span>Northgate State</span><b>5 quarter units → 3.3 semester units (rounded)</b><SourceChip id="nsu-units" /></div>
      <div><span>{o.course.code} at {o.short}</span><b>{o.transfer.lands}</b><em>{o.transfer.units}. {o.transfer.caution}</em></div>
    </div>
  );
}

function RuleLine({ rule: r }: { rule: AuditRule }) {
  const met = r.done >= r.needed;
  return (
    <div className="dg-slot">
      <DegreeMark status={met ? "done" : r.done + r.planned >= r.needed ? "planned" : "open"} />
      <span className="dg-slot-need">{r.name}</span>
      <span className="dg-slot-class">{r.about}</span>
      <span className="dg-slot-term">{formatCredits(r.planned)} planned</span>
      <span className="dg-slot-credits">{formatCredits(r.done)} of {r.needed}</span>
    </div>
  );
}
