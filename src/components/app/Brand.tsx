import { useId, type ReactNode } from "react";
import trellisMark from "@/assets/trellis-mark.svg";
import sproutFace from "@/assets/trellis-sprout.svg";
import { cn } from "@/lib/utils";
import reader from "@/assets/reader-watercolor.png";
import planner from "@/assets/planner-watercolor.png";
import backup from "@/assets/backup-watercolor.png";
import drafter from "@/assets/drafter-watercolor.png";

const mascots = { reader, planner, backup, drafter } as const;

export type Subject = "math" | "statistics" | "science" | "history" | "art" | "psychology" | "english" | "neutral";
export function subjectFor(course: string): Subject {
  const prefix = course.replace(/^BCC\s+/, "").trim().split(/\s+/)[0]?.toUpperCase();
  const groups: [Subject, string[]][] = [["math", ["MATH"]], ["statistics", ["STAT"]], ["science", ["BIO", "CHEM", "PHYS"]], ["history", ["HIST", "ANTH", "POLS", "SOC"]], ["art", ["ART", "DSGN", "MUS"]], ["psychology", ["PSYC", "NURS", "KINE"]], ["english", ["ENGL", "COMM"]]];
  const match = groups.find(([, codes]) => codes.includes(prefix ?? ""));
  if (match) return match[0];
  const title = course.toLowerCase();
  if (/statistics|\bdata\b/.test(title)) return "statistics";
  if (/biology|chemistry|physics/.test(title)) return "science";
  if (/history|anthropology|sociology/.test(title)) return "history";
  if (/psychology|health/.test(title)) return "psychology";
  if (/writing|english/.test(title)) return "english";
  return "neutral";
}
export function seasonFor(term: string) { return /fall/i.test(term) ? "fall" : /winter/i.test(term) ? "winter" : /spring/i.test(term) ? "spring" : /summer/i.test(term) ? "summer" : "neutral"; }
export function MeshTile({ family, children, className }: { family: string; children: ReactNode; className?: string }) {
  return <span className={cn("mesh-tile", `mesh-${family}`, className)}>{children}</span>;
}
function Sticker({ family, children, className }: { family: string; children: ReactNode; className?: string }) {
  const id = useId().replace(/:/g, "");
  return <svg viewBox="0 0 48 48" className={cn("sticker-icon", `sticker-${family}`, className)} fill={`url(#${id})`} stroke="var(--sticker-outline)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><defs><linearGradient id={id} x2="0" y2="1"><stop stopColor={`var(--icon-${family}-top)`} /><stop offset="1" stopColor={`var(--icon-${family}-bottom)`} /></linearGradient></defs>{children}</svg>;
}
export function SubjectIcon({ course, className, bare = false }: { course: string; className?: string; bare?: boolean }) {
  const family = subjectFor(course);
  const paths: Record<Subject, ReactNode> = {
    math: <><circle cx="24" cy="24" r="18" /><path d="M15 17h18M19 17v15m10-15v15" fill="none" stroke="var(--sticker-light)" strokeWidth="3" /></>,
    statistics: <><rect x="7" y="25" width="8" height="16" rx="2" /><rect x="20" y="10" width="8" height="31" rx="2" /><rect x="33" y="18" width="8" height="23" rx="2" /></>,
    science: <><path d="M19 5h10m-8 0v15L9 39q-2 4 3 4h24q5 0 3-4L27 20V5" /><path d="M15 30h18" fill="none" /></>,
    history: <><path d="M5 17 24 6l19 11ZM7 39h34v5H7Z" /><path d="M11 20h5v17h-5zm11 0h5v17h-5zm11 0h5v17h-5z" /></>,
    art: <><path d="M25 5C8 4 1 20 8 33c4 9 15 13 19 7 3-4-5-7-1-10s12 6 16-2C47 17 38 5 25 5Z" /><circle cx="15" cy="16" r="2" fill="var(--sticker-light)" /><circle cx="25" cy="12" r="2" fill="var(--sticker-light)" /><circle cx="34" cy="18" r="2" fill="var(--sticker-light)" /></>,
    psychology: <><path d="M21 7c-6-4-11 3-10 8-7 2-7 12-2 15-1 7 6 12 12 9Zm6 0c6-4 11 3 10 8 7 2 7 12 2 15 1 7-6 12-12 9Z" /><path d="M15 17v6m18-6v6" fill="none" /></>,
    english: <><path d="m9 38 4-11L32 6q2-2 4 0l6 5q2 2 0 4L22 37 9 42Z" /><path d="m28 10 10 9M13 27l9 10M9 42l4-8" fill="none" /></>,
    neutral: <><path d="M5 10q10-3 19 3 9-6 19-3v28q-10-3-19 3-9-6-19-3Z" /><path d="M24 13v28" fill="none" /></>,
  };
  const icon = <Sticker family={family}>{paths[family]}</Sticker>;
  return bare ? <span className={className}>{icon}</span> : <MeshTile family={family} className={cn("subject-tile", className)}>{icon}</MeshTile>;
}
export function TermIcon({ term, className }: { term: string; className?: string }) {
  const family = seasonFor(term);
  const shapes: Record<string, ReactNode> = {
    fall: <path d="m24 3 5 11 9-5-2 12 9 3-10 7 3 10-12-4-2 9-3-9-12 4 3-10-9-7 9-3-2-12 9 5Z" />,
    winter: <><circle cx="24" cy="24" r="19" /><path d="M24 9v30M11 16l26 16M11 32l26-16" stroke="var(--sticker-light)" fill="none" /></>,
    spring: <><path d="M24 43V23M24 27C10 29 5 17 6 6c13 0 21 8 18 21Zm1 4c1-12 10-17 18-16-1 11-7 18-18 16Z" /></>,
    summer: <><circle cx="24" cy="24" r="12" /><path d="M24 2v5m0 34v5M2 24h5m34 0h5M8 8l4 4m24 24 4 4M8 40l4-4m24-24 4-4" fill="none" /></>,
    neutral: <path d="M8 8h32v32H8Z" />,
  };
  return <Sticker family={family} className={cn("term-icon", className)}>{shapes[family]}</Sticker>;
}
export function AgentAvatar({ agent, className, bare = false }: { agent: keyof typeof mascots; className?: string; bare?: boolean }) {
  return <span className={cn("agent-avatar bg-card", bare && "agent-bare", className)}><img src={mascots[agent]} alt="" className="agent-mascot" /></span>;
}
/** Trellis app mark (08A Leaf corner from the logo drafts in Figma). */
export function BrandLogo({ className }: { className?: string }) {
  return <img src={trellisMark} alt="" aria-hidden="true" width={64} height={64} className={cn("brand-logo", className)} />;
}

/** The "trellis" wordmark, set in Geist like the Figma lockup. */
export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("brand-wordmark", className)}>trellis</span>;
}

/** Sprout's face: the sprout buddy (01 in the logo drafts). Used wherever the agent itself speaks. */
export function AgentFace({ className }: { className?: string }) {
  return <img src={sproutFace} alt="" aria-hidden="true" width={112} height={112} className={cn("brand-logo", className)} />;
}

/** Anything Sprout says outside the chat looks like a chat message: her face, then a white bubble with the chat's blue rim. */
export function SproutSays({ label, children, className }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("sprout-says", className)}>
      <AgentFace className="!size-8 shrink-0" />
      <div className="sprout-bubble">
        {label && <div className="text-xs text-muted-foreground">{label}</div>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
