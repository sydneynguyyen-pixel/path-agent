import { useState, type CSSProperties, type ReactNode } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { ClassChip } from "@/components/app/ItemMark";
import { SubjectIcon, subjectFor } from "@/components/app/Brand";
import { CourseLink } from "@/components/app/SkillsBits";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { classMeetings } from "@/data/scenario";
import { calendarWeeks, clock, currentWeek, hourSpan, isPileup, minutes, monthGrid, pileupLine, shortDate, weekOf, weekToOpen, type DueItem } from "@/lib/weeks";
import { cn } from "@/lib/utils";

const HOUR = 52;
const dayLabel = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });

/** One assignment: a class-colored chip that opens what it's worth. */
function DueChip({ item }: { item: DueItem }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`${item.course} ${item.label}, due ${dayLabel(item.date, { weekday: "long", month: "short", day: "numeric" })}`} className="block w-full rounded-[10px] text-left transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2">
          <ClassChip course={item.course} className="w-full"><span className="line-clamp-2">{item.label}</span></ClassChip>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <SubjectIcon course={item.course} />
          <div className="min-w-0">
            <div className="font-semibold leading-tight">{item.label}</div>
            <div className="text-xs text-muted-foreground"><CourseLink course={item.course} /> · due {dayLabel(item.date, { weekday: "short", month: "short", day: "numeric" })}</div>
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm"><span className="font-semibold">{item.worth ?? "Weight not in the syllabus"}</span></div>
        {item.detail && <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>}
      </PopoverContent>
    </Popover>
  );
}

/** A small month beside the week, like any calendar app: dots on days with something due, the open week highlighted. */
function MiniMonth({ month, onMonth, start, weekCount, today, week, onWeek, dueDates }: { month: string; onMonth: (m: string) => void; start: string; weekCount: number; today: string; week: number; onWeek: (w: number) => void; dueDates: Map<string, string[]> }) {
  const rows = monthGrid(month);
  const shift = (n: number) => { const d = new Date(`${month}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n, 1); onMonth(d.toISOString().slice(0, 10)); };
  return (
    <div className="cal-mini">
      <div className="flex items-center justify-between pb-2">
        <span className="text-sm font-semibold">{dayLabel(month, { month: "long", year: "numeric" })}</span>
        <span className="flex">
          <button type="button" className="cal-mini-nav" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft className="size-4" aria-hidden="true" /></button>
          <button type="button" className="cal-mini-nav" aria-label="Next month" onClick={() => shift(1)}><ChevronRight className="size-4" aria-hidden="true" /></button>
        </span>
      </div>
      <div className="cal-mini-grid text-[11px] font-medium text-muted-foreground" aria-hidden="true">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
      {rows.map((r) => {
        const w = weekOf(start, weekCount, r[0]!);
        return (
          <div key={r[0]} className={cn("cal-mini-grid cal-mini-row", w === week && "cal-mini-on")}>
            {r.map((d) => {
              const due = dueDates.get(d);
              const out = d.slice(0, 7) !== month.slice(0, 7);
              return (
                <button key={d} type="button" disabled={!w} onClick={() => w && onWeek(w)} aria-label={`${dayLabel(d, { weekday: "long", month: "short", day: "numeric" })}${due ? `, ${due.length} due` : ""}${w ? `, week ${w}` : ""}`} className={cn("cal-mini-day", out && "opacity-40", d === today && "cal-mini-today")}>
                  {Number(d.slice(8))}
                  {due && <span className="cal-mini-dots" aria-hidden="true">{due.slice(0, 3).map((c, i) => <i key={i} data-family={subjectFor(c)} />)}</span>}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/**
 * A term as a normal week calendar: weekdays across, hours down, class meetings as colored blocks,
 * and what's due on top of each day. A small month beside it jumps between weeks.
 */
export function TermCalendar({ title, start, weekCount, items, today, note, courses, details }: { title: string; start: string; weekCount: number; items: DueItem[]; today: string; note?: string; courses: string[]; details?: Record<string, ReactNode> }) {
  const weeks = calendarWeeks(start, weekCount, items);
  const [week, setWeekState] = useState(() => weekToOpen(start, weekCount, today));
  const [month, setMonth] = useState(() => weeks[week - 1]!.days[0]!.date);
  const [hidden, setHidden] = useState<string[]>([]);
  const setWeek = (w: number) => { const n = Math.min(weekCount, Math.max(1, w)); setWeekState(n); setMonth(weeks[n - 1]!.days[0]!.date); };
  const nowWeek = currentWeek(start, weekCount, today);
  const shown = weeks[week - 1]!;
  const days = shown.days.slice(0, 5);
  const classes = [...new Set([...courses, ...items.map((i) => i.course)])];
  const meetings = classMeetings.filter((m) => courses.includes(m.course) && !hidden.includes(m.course));
  const { from, to } = hourSpan(classMeetings.filter((m) => courses.includes(m.course)));
  const dueDates = new Map<string, string[]>();
  for (const it of items) dueDates.set(it.date, [...(dueDates.get(it.date) ?? []), it.course]);
  const visible = (it: DueItem) => !hidden.includes(it.course);
  const load = (w: number) => weeks[w - 1]?.due ?? 0;
  const ahead = weeks.map((w) => w.week).filter((w) => !nowWeek || w >= nowWeek);
  const busy = isPileup(shown.due) && (!nowWeek || week >= nowWeek);
  const fri = days[4]!.date;
  const range = `${shortDate(days[0]!.date)} – ${fri.slice(5, 7) === days[0]!.date.slice(5, 7) ? Number(fri.slice(8)) : shortDate(fri)}`;
  const toggle = (c: string) => setHidden((h) => (h.includes(c) ? h.filter((x) => x !== c) : [...h, c]));

  return (
    <section aria-labelledby="cal-title" className="surface cal overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-muted"><CalendarDays className="size-4" aria-hidden="true" /></span>
          <div>
            <h2 id="cal-title" className="text-lg font-semibold leading-tight">{range}</h2>
            <p className="text-xs text-muted-foreground">Week {week} of {weekCount} · {title}{note ? ` · ${note}` : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="rounded-full" disabled={week === weekToOpen(start, weekCount, today)} onClick={() => setWeek(weekToOpen(start, weekCount, today))}>This week</Button>
          <Button size="icon" variant="ghost" className="size-8 rounded-full" aria-label="Previous week" disabled={week === 1} onClick={() => setWeek(week - 1)}><ChevronLeft className="size-4" aria-hidden="true" /></Button>
          <Button size="icon" variant="ghost" className="size-8 rounded-full" aria-label="Next week" disabled={week === weekCount} onClick={() => setWeek(week + 1)}><ChevronRight className="size-4" aria-hidden="true" /></Button>
        </div>
      </div>
      {busy && <p className="cal-busy-note">{pileupLine(week, ahead, load)}</p>}

      <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-5 border-b p-4 lg:border-r lg:border-b-0" aria-label="Month and classes">
          <div className="hidden lg:block"><MiniMonth month={month} onMonth={setMonth} start={start} weekCount={weekCount} today={today} week={week} onWeek={setWeek} dueDates={dueDates} /></div>
          <div>
            <div className="pb-2 text-xs font-medium text-muted-foreground">Classes</div>
            <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
              {classes.map((c) => {
                const off = hidden.includes(c);
                return (
                  <li key={c} className={cn("class-chip cal-class", off && "cal-class-off")} data-family={subjectFor(c)}>
                    <SubjectIcon course={c} bare className="class-chip-icon mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <b className="font-semibold"><CourseLink course={c} /></b>
                      {details?.[c]}
                    </div>
                    <button type="button" aria-pressed={!off} aria-label={`${off ? "Show" : "Hide"} ${c} on the calendar`} title={off ? "Show on calendar" : "Hide from calendar"} onClick={() => toggle(c)} className="cal-class-eye">
                      {off ? <EyeOff className="size-3.5" aria-hidden="true" /> : <Eye className="size-3.5" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Week grid: the hours down the side, the weekdays across. */}
        <div className="hidden md:block" role="grid" aria-label={`Week ${week}, ${range}`}>
          <div className="cal-wk cal-wk-head" role="row">
            <span />
            {days.map((d) => (
              <span key={d.date} role="columnheader" aria-current={d.date === today ? "date" : undefined} className="flex items-baseline gap-1.5 px-2">
                <span className="text-xs text-muted-foreground">{dayLabel(d.date, { weekday: "short" })}</span>
                <span className={cn("cal-date", d.date === today && "cal-date-today")}>{Number(d.date.slice(8))}</span>
              </span>
            ))}
          </div>
          <div className="cal-wk cal-wk-due" role="row">
            <span className="cal-gutter pt-2">Due</span>
            {days.map((d) => (
              <div key={d.date} role="gridcell" className={cn("cal-wk-cell space-y-1 p-1.5", d.date === today && "cal-wk-today", d.date < today && "cal-past")}>
                {d.items.filter(visible).map((it) => <DueChip key={it.course + it.label} item={it} />)}
              </div>
            ))}
          </div>
          <div className="cal-wk" role="row" style={{ height: (to - from) * HOUR, "--hour": `${HOUR}px` } as CSSProperties}>
            <div className="relative" aria-hidden="true">
              {Array.from({ length: to - from }, (_, i) => <span key={i} className="cal-hour" style={{ top: i * HOUR }}>{clock(`${from + i}:00`, true)}</span>)}
            </div>
            {days.map((d, i) => (
              <div key={d.date} role="gridcell" className={cn("cal-wk-cell cal-hours relative", d.date === today && "cal-wk-today")}>
                {meetings.filter((m) => m.days.includes(i)).map((m) => (
                  <div key={m.course + m.start} data-family={subjectFor(m.course)} className={cn("cal-block", d.date < today && "cal-past")} style={{ top: (minutes(m.start) - from * 60) / 60 * HOUR, height: (minutes(m.end) - minutes(m.start)) / 60 * HOUR - 3 }}>
                    <div className="flex items-center gap-1.5 font-semibold"><SubjectIcon course={m.course} bare className="cal-block-icon" /><CourseLink course={m.course} /></div>
                    <div className="cal-block-sub">{clock(m.start)}–{clock(m.end, true)}</div>
                    <div className="cal-block-sub truncate">{m.room}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Phones: the same week as a day-by-day agenda. */}
        <ol className="divide-y md:hidden" aria-label={`Week ${week}, ${range}`}>
          {days.map((d, i) => {
            const meets = meetings.filter((m) => m.days.includes(i)).sort((a, b) => minutes(a.start) - minutes(b.start));
            const due = d.items.filter(visible);
            return (
              <li key={d.date} className={cn("px-4 py-3", d.date === today && "cal-wk-today")} aria-current={d.date === today ? "date" : undefined}>
                <div className="text-sm font-semibold">{dayLabel(d.date, { weekday: "long", month: "short", day: "numeric" })}</div>
                {meets.length + due.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">No class</p> : (
                  <ul className="mt-2 space-y-1.5">
                    {due.map((it) => <li key={it.course + it.label} className="flex items-start gap-2"><span className="w-16 shrink-0 pt-1 text-xs font-medium">Due</span><span className="min-w-0 flex-1"><DueChip item={it} /></span></li>)}
                    {meets.map((m) => <li key={m.course + m.start} className="flex items-start gap-2"><span className="w-16 shrink-0 pt-1 text-xs text-muted-foreground">{clock(m.start, true)}</span><ClassChip course={m.course} className="min-w-0 flex-1"><b className="font-semibold">{m.course}</b> · {m.room}</ClassChip></li>)}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
