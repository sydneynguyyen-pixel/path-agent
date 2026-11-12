import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  eventPlatforms,
  freeTime,
  opportunities,
  postings,
  type EventPlatform,
} from "@/data/scenario";
import { symposiumEvent } from "@/data/event";
import { people } from "@/data/people";
import { PersonPhoto } from "@/components/app/PersonPhoto";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { allEvents, inNextWeek, monthGrid, overlaps, siteOf, type EventItem } from "@/lib/events";
import { doableInFreeTime } from "@/lib/opportunities";
import { photoUrl } from "@/lib/photos";
import { cn } from "@/lib/utils";
import { useFound, DateBlock, PlatformMark } from "@/components/app/EventBits";
import { useSaveToPlan } from "@/components/app/PlanActions";
import { PostingLink } from "@/components/app/PostingLink";
import { AgentAvatar } from "@/components/app/Brand";
import { Flyer } from "@/components/app/Flyer";
import { Button } from "@/components/ui/button";
import { crossFade, jumpTarget, jumpTo, useIsoLayoutEffect } from "@/lib/motion-plan";
import "@/styles/motion-plan.css";

const VIEWS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "week", label: "This week" },
  { id: "plan", label: "On my plan" },
  { id: "free", label: "In my free time" },
] as const;
type View = (typeof VIEWS)[number]["id"];
const SITES: EventPlatform[] = ["luma", "handshake", "eventbrite"];

const dayLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
const weekday = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

/** Explore's Calendar view for events: a month calendar, a dated timeline and the picked event's details. */
export function EventsBoard({ query = "" }: { query?: string }) {
  const j = useJourney();
  const found = useFound();
  const items = useMemo(() => allEvents(found, opportunities, SCRIPT_TODAY), [found]);
  const clash = useMemo(() => overlaps(items), [items]);
  const [view, setView] = useState<View>("upcoming");
  const [sites, setSites] = useState<EventPlatform[]>(SITES);
  const [day, setDay] = useState<string | null>(null);
  const onPlan = (e: EventItem) =>
    e.registered || (!!e.opportunity && j.savedOpportunities.includes(e.opportunity.id));

  const shown = items.filter((e) => {
    const site = siteOf(e, postings[e.opportunity?.id ?? e.id]);
    if (site && !sites.includes(site)) return false;
    if (query && !`${e.title} ${e.host} ${e.place}`.toLowerCase().includes(query.toLowerCase()))
      return false;
    if (day && e.date !== day) return false;
    if (view === "week") return inNextWeek(e.date, SCRIPT_TODAY);
    if (view === "plan") return onPlan(e);
    if (view === "free") return !!e.opportunity && doableInFreeTime(e.opportunity, freeTime);
    return true;
  });
  const [picked, setPicked] = useState<string | null>(null);
  const selected =
    shown.find((e) => e.id === picked) ?? shown.find((e) => e.id === symposiumEvent.id) ?? shown[0];
  const days = [...new Set(shown.map((e) => e.date))];
  // A day picked on the month calendar: the timeline scrolls to it and its row pulses once.
  const timeline = useRef<HTMLElement>(null);
  const [jump, setJump] = useState<{ date: string; n: number } | null>(null);
  const jumpRow = jump ? jumpTarget(shown, jump.date, picked) : null;
  useEffect(() => {
    if (!jump || !jumpRow) return;
    const root = timeline.current;
    jumpTo(root?.querySelector<HTMLElement>(`[data-event="${CSS.escape(jumpRow)}"]`) ?? null, root?.querySelector<HTMLElement>(`[data-plan-day="${jump.date}"]`) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump]);

  return (
    <div>
      <div className="grid items-start gap-10 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_360px] 2xl:gap-14">
        <aside aria-label="Calendar and filters" className="space-y-6">
          <MonthCalendar
            items={items}
            clash={clash}
            day={day}
            onDay={(d) => {
              setDay(d);
              const first = items.find((e) => e.date === d);
              if (first) setPicked(first.id);
              setJump((j) => ({ date: d, n: (j?.n ?? 0) + 1 }));
            }}
            selectedDate={selected?.date}
          />
          <div className="flex flex-col gap-0.5" role="group" aria-label="Show">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={view === v.id}
                onClick={() => setView(v.id)}
                className={cn(
                  "rounded-full px-3 py-2 text-left text-sm",
                  view === v.id
                    ? "glass-active font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          <fieldset>
            <legend className="px-3 pb-1 text-xs text-muted-foreground">From</legend>
            {SITES.map((s) => {
              const on = sites.includes(s);
              return (
                <label
                  key={s}
                  className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-sm hover:bg-foreground/5"
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={() => setSites(on ? sites.filter((x) => x !== s) : [...sites, s])}
                  />
                  <PlatformMark platform={s} className="size-4 rounded border-0" />
                  <span className="flex-1">{eventPlatforms[s].name}</span>
                  <Check
                    className={cn("size-3.5", on ? "opacity-100" : "opacity-0")}
                    aria-hidden="true"
                  />
                </label>
              );
            })}
          </fieldset>
        </aside>

        <section ref={timeline} aria-label="Upcoming events" className="relative min-w-0 pl-6">
          <span
            aria-hidden="true"
            className="absolute bottom-8 left-1 top-5 border-l-[1.5px] border-dashed border-border"
          />
          {day && (
            <button
              type="button"
              onClick={() => setDay(null)}
              className="mb-3 text-xs text-muted-foreground underline underline-offset-4"
            >
              Showing {dayLabel(day)} · show all
            </button>
          )}
          {days.map((d) => (
            <div key={d} data-plan-day={d} className="relative grid grid-cols-[96px_minmax(0,1fr)] gap-3 pb-4">
              <div className="relative pt-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -left-[25px] top-[14px] size-2.5 rounded-full",
                    selected?.date === d ? "bg-[var(--ink-b)] shadow-[0_0_0_3px_var(--rim)]" : "bg-border",
                  )}
                />
                <div className="text-[15px] font-semibold">{dayLabel(d)}</div>
                <div className="text-sm text-muted-foreground">{weekday(d)}</div>
              </div>
              <div className="flex flex-col gap-1.5">
                {shown
                  .filter((e) => e.date === d)
                  .map((e) => (
                    <EventRow
                      key={e.id}
                      e={e}
                      planned={onPlan(e)}
                      clashWith={clash[e.id]}
                      selected={selected?.id === e.id}
                      onPick={() => setPicked(e.id)}
                    />
                  ))}
              </div>
            </div>
          ))}
          {shown.length === 0 && (
            <p className="py-10 text-sm text-muted-foreground">
              Nothing matches. Try another view or turn a site back on.
            </p>
          )}
        </section>

        {selected && <Details e={selected} planned={onPlan(selected)} />}
      </div>
    </div>
  );
}

function Art({ e, className }: { e: EventItem; className?: string }) {
  const o = e.opportunity;
  if (o?.flyer)
    return (
      <Flyer
        flyer={o.flyer}
        photo={photoUrl(o.photo, 320)}
        className={cn("rounded-2xl", className)}
      />
    );
  return (
    <img
      src={photoUrl(e.photo, 320)}
      alt=""
      loading="lazy"
      className={cn("aspect-square shrink-0 rounded-2xl object-cover", className)}
    />
  );
}

function EventRow({
  e,
  planned,
  clashWith,
  selected,
  onPick,
}: {
  e: EventItem;
  planned: boolean;
  clashWith?: EventItem | undefined;
  selected: boolean;
  onPick: () => void;
}) {
  const site = siteOf(e, postings[e.opportunity?.id ?? e.id]);
  return (
    <button
      type="button"
      data-event={e.id}
      onClick={onPick}
      aria-pressed={selected}
      className={cn(
        "-mx-3 flex items-center gap-3.5 rounded-2xl px-3 py-2.5 text-left transition-colors",
        selected
          ? "glass-picked"
          : "hover:bg-foreground/[0.03]",
      )}
    >
      <Art e={e} className="w-14" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground tabular-nums">{e.time}</div>
        <div className="line-clamp-2 font-semibold leading-snug">{e.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            {e.host}
            {site && <PlatformMark platform={site} className="size-3.5 rounded-[3px] border-0" />}
          </span>
          {planned && (
            <span className="aqua-chip rounded-full px-2 py-px text-[11px] font-semibold text-foreground">
              On your plan
            </span>
          )}
          {clashWith && (
            <span
              className="inline-flex items-center gap-1 text-warning"
              title={`Overlaps with ${clashWith.title} at ${clashWith.time}`}
            >
              <AlertTriangle className="size-3" aria-hidden="true" />
              Overlaps {clashWith.time}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function Details({ e, planned }: { e: EventItem; planned: boolean }) {
  const j = useJourney();
  const save = useSaveToPlan();
  const isSymposium = e.id === symposiumEvent.id;
  const meet = isSymposium
    ? symposiumEvent.deck
        .slice(0, 3)
        .map((id) => people.find((p) => p.id === id))
        .filter((p) => !!p)
    : [];
  const item = e.experience ?? e.opportunity;
  // Picking another event cross-fades the panel from the last one shown.
  const panel = useRef<HTMLElement>(null);
  const last = useRef<HTMLElement | null>(null);
  useIsoLayoutEffect(() => crossFade(panel.current, last.current), [e.id]);
  // Keep a copy of what's on screen after every change, so the next fade starts from it.
  useIsoLayoutEffect(() => {
    const copy = (panel.current?.cloneNode(true) as HTMLElement | undefined) ?? null;
    copy?.querySelectorAll(".plan-fade-ghost").forEach((g) => g.remove());
    last.current = copy;
  });
  return (
    <aside
      ref={panel}
      aria-label={`${e.title} details`}
      className="plan-fade-root hidden overflow-hidden rounded-[1.75rem] bg-card shadow-soft scroll-pane xl:block"
    >
      <div className="relative">
        {e.opportunity?.flyer ? (
          <Art e={e} className="w-full rounded-none" />
        ) : (
          <img src={photoUrl(e.photo, 680)} alt="" className="h-40 w-full object-cover" />
        )}
        <DateBlock date={e.date} className="absolute left-4 top-4 shadow-soft" />
      </div>
      <div className="space-y-4 p-5">
        <div>
          {planned && (
            <span className="aqua-chip rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
              On your plan
            </span>
          )}
          <h2 className="mt-2 text-xl font-semibold leading-snug">{e.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {weekday(e.date)}, {dayLabel(e.date)} · {isSymposium ? symposiumEvent.time : e.time} ·{" "}
            {e.place}
          </p>
          <p className="text-sm text-muted-foreground">{e.host}</p>
          {item && <PostingLink item={item} className="mt-1" />}
        </div>
        {(isSymposium || e.why) && (
          <div className="flex items-start gap-3">
            <AgentAvatar agent="planner" className="size-8 shrink-0" />
            <div className="space-y-1.5 text-sm">
              {isSymposium ? (
                symposiumEvent.why.map((w) => (
                  <p key={w.text}>
                    {w.text} <span className="text-xs text-muted-foreground">· {w.source}</span>
                  </p>
                ))
              ) : (
                <p>{e.why}</p>
              )}
            </div>
          </div>
        )}
        {meet.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground">{meet.length} people to meet</div>
            <ul className="mt-1 space-y-2">
              {meet.map((p) => (
                <li key={p.id} className="flex items-center gap-3 text-sm">
                  <PersonPhoto photo={p.photo} org={p.org} size="sm" />
                  <span className="min-w-0"><span className="block font-medium">{p.name}</span><span className="block text-xs text-muted-foreground">{p.role}</span></span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {isSymposium ? (
            <Button asChild>
              <Link to="/event">
                Your plan for {symposiumEvent.day} <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : e.opportunity && !e.registered ? (
            <>
              <Button
                variant={planned ? "outline" : "default"}
                onClick={(ev) => save(e.opportunity!, ev.currentTarget)}
              >
                {planned ? "On your plan" : "Add to my plan"}
              </Button>
              <Button variant="ghost" onClick={() => j.openOpportunity(e.opportunity!.id)}>
                See details
              </Button>
            </>
          ) : e.opportunity ? (
            <Button variant="outline" onClick={() => j.openOpportunity(e.opportunity!.id)}>
              See details
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          You sign up on the event's site. Sprout never registers for you.
        </p>
      </div>
    </aside>
  );
}

function MonthCalendar({
  items,
  clash,
  day,
  onDay,
  selectedDate,
}: {
  items: EventItem[];
  clash: Record<string, EventItem>;
  day: string | null;
  onDay: (d: string) => void;
  selectedDate?: string | undefined;
}) {
  const start = new Date(`${SCRIPT_TODAY}T12:00:00Z`);
  const [offset, setOffset] = useState(0);
  const y = start.getUTCFullYear() + Math.floor((start.getUTCMonth() + offset) / 12);
  const m = (((start.getUTCMonth() + offset) % 12) + 12) % 12;
  const grid = monthGrid(y, m);
  const title = new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between pl-1">
        <span className="text-[15px] font-semibold">{title}</span>
        <span className="flex">
          <button
            type="button"
            aria-label="Previous month"
            disabled={offset <= 0}
            onClick={() => setOffset(offset - 1)}
            className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-foreground/5 disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setOffset(offset + 1)}
            className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-foreground/5"
          >
            <ChevronRight className="size-4" />
          </button>
        </span>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} aria-hidden="true" className="text-[10px] text-muted-foreground">
            {d}
          </span>
        ))}
        {grid.map((d, i) => {
          if (!d) return <span key={`b${i}`} />;
          const on = items.filter((e) => e.date === d);
          const busy = on.some((e) => clash[e.id]);
          const sel = (day ?? selectedDate) === d;
          const n = Number(d.slice(8));
          return (
            <button
              key={d}
              type="button"
              disabled={on.length === 0}
              onClick={() => onDay(d)}
              aria-pressed={sel}
              aria-label={`${dayLabel(d)}${on.length ? `, ${on.length} event${on.length > 1 ? "s" : ""}` : ""}`}
              className={cn(
                "flex h-8 flex-col items-center justify-center gap-px rounded-full text-xs",
                sel
                  ? "glass-active font-semibold"
                  : on.length
                    ? "font-semibold hover:bg-foreground/5"
                    : "text-muted-foreground",
                d === SCRIPT_TODAY && !sel && "ring-1 ring-inset ring-foreground/25",
              )}
            >
              {n}
              <span className="flex h-1 gap-0.5">
                {on.slice(0, 3).map((e) => (
                  <i
                    key={e.id}
                    className={cn(
                      "size-1 rounded-full",
                      sel ? "bg-background" : busy ? "bg-warning" : "bg-[#5BA8C9]",
                    )}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
