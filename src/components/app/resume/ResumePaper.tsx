import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { hasName, pageCount, type PageEntry, type ResumeAccent, type ResumePage, type ResumeTemplate } from "@/lib/resume";
import { SCRIPT_TODAY } from "@/lib/journey";

/** Letter size at 96 dpi: 8.5 × 11 in. */
export const PAGE_W = 816;
export const PAGE_H = 1056;

type PaperProps = {
  page: ResumePage;
  template: ResumeTemplate;
  accent: ResumeAccent;
  newSkills?: string[];
  /** The block whose field she's editing, ringed briefly. */
  flash?: string | null;
  /** Clicking a block opens its field in the panel. */
  onJump?: (block: string) => void;
};

const BlockCtx = createContext<{ flash: string | null; onJump: ((block: string) => void) | undefined }>({ flash: null, onJump: undefined });

/** One part of the page. Rings briefly while its field is edited; a click opens its field. */
function Block({ id, label, children, className }: { id: string; label: string; children: ReactNode; className?: string }) {
  const { flash, onJump } = useContext(BlockCtx);
  return (
    <div data-block={id} data-flash={flash === id ? "" : undefined} title={onJump ? `Edit ${label}` : undefined} onClick={onJump ? () => onJump(id) : undefined} className={`rs-block ${className ?? ""}`}>
      {children}
    </div>
  );
}

const H = ({ children }: { children: ReactNode }) => <h3 className="rs-h">{children}</h3>;

/** The page itself: white paper, the chosen template, and blocks that open their field when clicked. */
export function PaperContent({ page, template, accent, newSkills = [], flash, onJump }: PaperProps) {
  const style = { "--rs-accent": accent.c, "--rs-ink": accent.ink } as CSSProperties;
  const header = (
    <Block id="header" label="your header">
      <header className="rs-head">
        <h2 className="rs-name">{page.name}</h2>
        {page.headline.trim() && <p className="rs-headline">{page.headline}</p>}
        <ul className="rs-contact" aria-label="Contact">{page.contact.map((c) => <li key={c}>{c}</li>)}</ul>
      </header>
    </Block>
  );
  const entries = (title: string, list: PageEntry[], compact = false) =>
    list.length > 0 && (
      <section>
        <H>{title}</H>
        <div className={compact ? "rs-list-tight" : "rs-list"}>
          {list.map((e) => (
            <Block key={e.id} id={`entry:${e.id}`} label={e.role}>
              <div className="rs-row">
                <p className="min-w-0"><b className="rs-role">{e.role}</b>{e.org && <span className="rs-org">{compact ? ", " : " · "}{e.org}</span>}</p>
                {e.when && <span className="rs-date">{e.when}</span>}
              </div>
              {e.bullets.some((b) => b.trim()) && <ul className="rs-bullets">{e.bullets.filter((b) => b.trim()).map((b, i) => <li key={i}>{b}</li>)}</ul>}
            </Block>
          ))}
        </div>
      </section>
    );

  return (
    <BlockCtx.Provider value={{ flash: flash ?? null, onJump }}>
    <article aria-label="Document preview" className="rs-paper" data-template={template} style={style}>
      {header}
      {page.kind === "cover" ? (
        <Block id="letter" label="the letter" className="rs-letter">
          <p className="rs-date-line">{new Date(`${SCRIPT_TODAY}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          {page.letter.split(/\n{2,}/).map((para, i) => <p key={i} className="whitespace-pre-wrap">{para}</p>)}
        </Block>
      ) : (
        <>
          {page.summary.trim() && <Block id="summary" label="your summary"><section><H>Summary</H><p className="whitespace-pre-wrap">{page.summary}</p></section></Block>}
          <Block id="education" label="education">
            <section>
              <H>Education</H>
              <div className="rs-list">
                {page.education.map((e) => (
                  <div key={e.id}>
                    <div className="rs-row"><b className="rs-role">{e.school}</b><span className="rs-date">{e.when}</span></div>
                    <p className="rs-org-line">{e.degree}</p>
                    {e.detail && <p className="rs-detail">{e.detail}</p>}
                  </div>
                ))}
              </div>
            </section>
          </Block>
          {entries("Experience", page.experience)}
          {entries("Projects", page.projects)}
          {entries("Training & events", page.training, true)}
          {page.skills.length > 0 && (
            <Block id="skills" label="skills">
              <section>
                <H>Skills</H>
                <ul className="rs-skills">
                  {page.skills.map((g) => (
                    <li key={g.label}>
                      <b>{g.label}:</b>{" "}
                      {g.names.map((n, i) => (
                        <span key={n}>
                          {n}
                          {hasName(newSkills, n) && <span className="rs-new aqua-chip">New</span>}
                          {i < g.names.length - 1 && ", "}
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              </section>
            </Block>
          )}
        </>
      )}
    </article>
    </BlockCtx.Provider>
  );
}

/** The page on the board, scaled to fit its column, with a page count. Content past one page shows where page 2 starts. */
export function FittedPaper(props: PaperProps & { onPages?: (n: number) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(PAGE_H);
  const { onPages } = props;

  useEffect(() => {
    const w = wrap.current, p = paper.current;
    if (!w || !p || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      setScale(Math.min(1, w.clientWidth / PAGE_W) || 1);
      const h = Math.max(PAGE_H, p.offsetHeight);
      setHeight(h);
      onPages?.(pageCount(h, PAGE_H));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(w);
    ro.observe(p);
    measure();
    return () => ro.disconnect();
  }, [onPages]);

  const pages = pageCount(height, PAGE_H);
  return (
    <div ref={wrap} className="rs-fit">
      <div className="rs-fit-box" style={{ height: height * scale, width: PAGE_W * scale }}>
        <div ref={paper} className="rs-fit-inner" style={{ transform: `scale(${scale})` }}>
          <PaperContent {...props} />
          {Array.from({ length: pages - 1 }, (_, i) => <div key={i} aria-hidden="true" className="rs-break" style={{ top: PAGE_H * (i + 1) }}><span>Page {i + 2}</span></div>)}
        </div>
      </div>
    </div>
  );
}
