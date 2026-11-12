import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { EvidenceLevel } from "@/data/scenario";
import type { PortfolioSkill } from "@/lib/portfolio";
import { calm } from "@/lib/motion";
import { confirmedBySegment, grewSegments, type SegmentFocus } from "@/lib/motionGrow";
import { cn } from "@/lib/utils";
import { Roll } from "@/components/app/Roll";
import "@/styles/motion-grow.css";

const LEVELS: EvidenceLevel[] = ["Taught", "Practiced", "Demonstrated"];
/** One hue, light to dark: how far a skill has gone. Counts are always printed, so color is never the only cue. */
const SHADE: Record<EvidenceLevel, { bg: string; ink: string }> = {
  Taught: { bg: "#A9DCEB", ink: "#111111" },
  Practiced: { bg: "#4FA3C7", ink: "#111111" },
  Demonstrated: { bg: "#1F5F86", ink: "#FFFFFF" },
};
const ABOUT: Record<EvidenceLevel, string> = {
  Taught: "covered in a class",
  Practiced: "used at an event or in an assignment",
  Demonstrated: "shown in work you attached",
};

/** Skills per theme, split by how far each has gone. */
export function strengthByTheme(skills: PortfolioSkill[]) {
  const themes = [...new Set(skills.map((s) => s.theme))];
  return themes
    .map((theme) => {
      const inTheme = skills.filter((s) => s.theme === theme);
      const counts = Object.fromEntries(
        LEVELS.map((l) => [l, inTheme.filter((s) => s.level === l).length]),
      ) as Record<EvidenceLevel, number>;
      return { theme, total: inTheme.length, counts };
    })
    .sort((a, b) => b.total - a.total);
}

/** Segments where a skill was just confirmed, so each grows once. */
function useGrewSegments(skills: PortfolioSkill[]) {
  const counts = confirmedBySegment(skills);
  const key = JSON.stringify(counts);
  const before = useRef(counts);
  const [grew, setGrew] = useState<string[]>([]);
  useEffect(() => {
    const now = JSON.parse(key) as Record<string, number>;
    const up = grewSegments(before.current, now);
    before.current = now;
    if (up.length && !calm()) setGrew(up);
  }, [key]);
  return { grew, settle: (k: string) => setGrew((g) => g.filter((x) => x !== k)) };
}

/**
 * Pass `focus`/`onFocusChange` (see useSegmentFocus) to link the chart to the skill rows:
 * hovering or focusing a segment lights its skills, and a lit row lights its segment.
 */
export function SkillsChart({ skills, focus, onFocusChange }: { skills: PortfolioSkill[]; focus?: SegmentFocus; onFocusChange?: (f: SegmentFocus) => void }) {
  const rows = strengthByTheme(skills);
  const max = Math.max(1, ...rows.map((r) => r.total));
  const [own, setOwn] = useState<SegmentFocus>(null);
  const hover = focus !== undefined ? focus : own;
  const setHover = (f: SegmentFocus) => { setOwn(f); onFocusChange?.(f); };
  const { grew, settle } = useGrewSegments(skills);
  const totals = Object.fromEntries(
    LEVELS.map((l) => [l, skills.filter((s) => s.level === l).length]),
  ) as Record<EvidenceLevel, number>;

  return (
    <section aria-labelledby="skills-chart-title" className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="skills-chart-title" className="font-semibold">
            How far each skill has gone
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {skills.length} skills by area. Darker means more proof.
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Legend">
          {LEVELS.map((l) => (
            <li key={l} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-[3px]"
                style={{ background: SHADE[l].bg }}
              />
              {l} <span className="text-muted-foreground">{totals[l]}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 space-y-3.5">
        {rows.map((r) => (
          <div
            key={r.theme}
            className="grid grid-cols-[minmax(0,210px)_minmax(0,1fr)] items-center gap-3"
          >
            <div className="text-sm leading-tight" aria-hidden="true">
              {r.theme} <span className="text-muted-foreground">· {r.total}</span>
            </div>
            <div className="grow-bar flex h-7" style={{ width: `${(r.total / max) * 100}%` }}>
              {/* Every level stays mounted, so a segment eases open from zero instead of popping in. */}
              {LEVELS.map((l, i) => {
                const n = r.counts[l];
                const after = n > 0 && LEVELS.slice(0, i).some((x) => r.counts[x] > 0);
                const on = hover?.theme === r.theme && hover.level === l;
                const seg = `${r.theme}|${l}`;
                return (
                  <button
                    type="button"
                    key={l}
                    tabIndex={n > 0 ? 0 : -1}
                    aria-hidden={n > 0 ? undefined : true}
                    aria-label={`${r.theme}: ${n} ${l.toLowerCase()}. Shows them in your skills below.`}
                    onMouseEnter={() => setHover({ theme: r.theme, level: l })}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover({ theme: r.theme, level: l })}
                    onBlur={() => setHover(null)}
                    onAnimationEnd={() => settle(seg)}
                    className={cn(
                      "grow-seg relative grid cursor-default place-items-center overflow-visible rounded-[4px] text-xs font-semibold",
                      n > 0 ? "min-w-6" : "min-w-0",
                      hover && !on && "opacity-60",
                      grew.includes(seg) && "grow-seg-pulse",
                    )}
                    style={{
                      flexGrow: n,
                      flexBasis: 0,
                      marginLeft: after ? 2 : 0,
                      background: SHADE[l].bg,
                      color: SHADE[l].ink,
                    }}
                  >
                    {n > 0 && n}
                    {on && n > 0 && (
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 block w-max max-w-56 -translate-x-1/2 rounded-xl bg-card px-3 py-2 text-left text-xs font-normal text-foreground shadow-soft"
                      >
                        <span className="block font-medium">{r.theme}</span>
                        <span className="block">
                          {n} {l.toLowerCase()}: {ABOUT[l]}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <table className="sr-only">
        <caption>Skills by area and how far each has gone</caption>
        <thead>
          <tr>
            <th scope="col">Area</th>
            {LEVELS.map((l) => (
              <th key={l} scope="col">
                {l}
              </th>
            ))}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.theme}>
              <th scope="row">{r.theme}</th>
              {LEVELS.map((l) => (
                <td key={l}>{r.counts[l]}</td>
              ))}
              <td>{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** The career she picked: skills it asks for that she already shows, and the ones still to build. */
export function GoalFit({
  goalId,
  title,
  have,
  missing,
  skills,
}: {
  goalId: string;
  title: string;
  have: string[];
  missing: string[];
  skills: PortfolioSkill[];
}) {
  const names = new Set(skills.map((s) => s.name.toLowerCase()));
  const shown = have.filter((h) => names.has(h.toLowerCase()));
  return (
    <section aria-labelledby="goal-fit-title" className="surface flex flex-col p-5">
      <h2 id="goal-fit-title" className="font-semibold">
        Toward {title}
      </h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Skills this role asks for</p>
      <ul className="mt-4 space-y-2 text-sm">
        {shown.map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span className="grid size-5 place-items-center rounded-full aqua-chip">
              <Check className="size-3" aria-hidden="true" />
            </span>
            {s}
            <span className="sr-only"> (you have this)</span>
          </li>
        ))}
        {missing.map((s) => (
          <li key={s} className="flex items-center gap-2 text-muted-foreground">
            <span
              aria-hidden="true"
              className="size-5 rounded-full border-[1.5px] border-dashed border-foreground/30"
            />
            {s}
            <span className="sr-only"> (to build)</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        <b className="font-semibold text-foreground">{shown.length}</b> you show ·{" "}
        <b className="font-semibold text-foreground">{missing.length}</b> to build
      </p>
      <Link
        to="/career"
        search={{ plan: goalId }}
        className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium underline-offset-4 hover:underline"
      >
        See your plan toward it <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </section>
  );
}

/** Headline numbers: what's confirmed and where the proof comes from. */
export function ProofTiles({ skills }: { skills: PortfolioSkill[] }) {
  const confirmed = skills.filter((s) => s.confirmed).length;
  const classes = skills.filter((s) => s.proofs.some((p) => p.type === "class")).length;
  const events = skills.filter((s) => s.proofs.some((p) => p.type === "event" || p.type === "doing")).length;
  const shown = skills.filter((s) => s.level === "Demonstrated").length;
  const tiles = [
    { n: confirmed, of: skills.length, label: "confirmed by you" },
    { n: shown, label: "demonstrated with work" },
    { n: classes, label: "backed by a class" },
    { n: events, label: "backed by an event or project" },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Your skills at a glance">
      {tiles.map((t) => (
        <li key={t.label} className="surface p-4">
          <div className="text-3xl font-semibold tracking-tight">
            <Roll value={t.n} />
            {t.of !== undefined && (
              <span className="text-base font-normal text-muted-foreground"> of {t.of}</span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{t.label}</div>
        </li>
      ))}
    </ul>
  );
}
