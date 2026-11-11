import { CheckCircle2, CircleDot, AlertTriangle, Circle, ArrowRightLeft, FileText, ShieldQuestion, Hourglass } from "lucide-react";
import { confidenceLevel } from "@/lib/confidence";
import { sources, type ReqStatus } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Plain-language label for a source, so students never see internal names like "Row 118". */
export function plainSource(id: string) {
  const s = (sources as Record<string, { doc: string }>)[id];
  const d = s?.doc ?? "";
  if (d.includes("Articulation")) return "From Northgate's transfer rules";
  if (d.includes("Transfer Credit Policy")) return "From Northgate's transfer policy";
  if (d.includes("Degree Audit")) return "From your degree audit";
  if (d.includes("Policy Manual")) return "From Bayview's policy manual";
  if (d.includes("General Catalog")) return "From Northgate's course catalog";
  if (d.includes("Syllabus")) return `From your ${d.split(" Syllabus")[0]} syllabus`;
  if (d.includes("Portal")) return "From the registration page";
  if (d.includes("Counselor")) return "From your counselor";
  return "From your documents";
}

export function SourceChip({ id }: { id: string }) {
  const { openEvidence } = useJourney();
  const s = (sources as Record<string, (typeof sources)[keyof typeof sources]>)[id]!;
  return (
    <button
      title={`${s.doc} — ${s.section}`}
      onClick={() => openEvidence(id)}
      className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
    >
      <FileText className="size-3" aria-hidden />
      {plainSource(id)}
    </button>
  );
}

const statusMap: Record<ReqStatus, { label: string; icon: typeof Circle; cls: string }> = {
  done: { label: "Done", icon: CheckCircle2, cls: "bg-success-soft text-success" },
  transfer: { label: "Transfer credit", icon: ArrowRightLeft, cls: "bg-info-soft text-info" },
  in_progress: { label: "In progress", icon: CircleDot, cls: "bg-accent text-accent-foreground" },
  at_risk: { label: "At risk", icon: AlertTriangle, cls: "bg-warning-soft text-warning" },
  remaining: { label: "Remaining", icon: Circle, cls: "bg-muted text-muted-foreground" },
  pending: { label: "Pending counselor", icon: Hourglass, cls: "bg-info-soft text-info" },
};

/** Only speaks up when a counselor should look. No scores. */
export function CheckBadge({ score, conflict, plain = false }: { score: number; conflict?: boolean; plain?: boolean }) {
  if (!conflict && confidenceLevel(score) !== "low") return null;
  if (plain) return <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><ShieldQuestion className="size-3.5" aria-hidden />Check with your counselor</span>;
  return <span className="confidence-low inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning"><ShieldQuestion className="size-3.5" aria-hidden />Check with your counselor</span>;
}

export function StatusBadge({ status }: { status: ReqStatus }) {
  const m = statusMap[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", m.cls)}>
      <m.icon className="size-3.5" aria-hidden />
      {m.label}
    </span>
  );
}

export function SimLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-warning/50 bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning">
      {children}
    </span>
  );
}

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:flex-nowrap sm:[&>*:nth-child(2)]:shrink-0">
      <div>
        <h1 className="text-3xl font-medium text-foreground md:text-[2rem]">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-muted-foreground">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
