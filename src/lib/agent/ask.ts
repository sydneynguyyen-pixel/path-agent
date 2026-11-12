import { APPLY_DEADLINE, careerRoles, DROP_DEADLINE, fallWork, gapSkills, ledgerSkills, opportunities, options, progress, REQUIREMENT_LABEL, requirements, student, terms } from "@/data/scenario";
import type { WidgetKind } from "@/lib/desktop";
import { GatewayError, gatewayModel, type GatewayEnv } from "./gateway";

/**
 * Sprout's chat. One model call, no tools that act: it answers only from facts about the
 * student's own plan, cites the facts it used, and picks which Home card to show with the answer.
 * If the model isn't available the app keeps its scripted preview, and says so.
 */
export type Fact = { id: string; text: string };
export const TOPICS: WidgetKind[] = ["week", "deadline", "path", "next", "skills", "saved", "match"];
export type AskAnswer = { mode: "live"; answer: string; topic: WidgetKind | null; factIds: string[]; model: string | null };
export type AskFallback = { mode: "scripted"; reason: string };

const days = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 864e5);

/** Everything Sprout may say, as short facts with ids. Built from the same synthetic data the screens use. */
export function factsFor(today: string): Fact[] {
  const due = fallWork.filter((w) => { const d = days(today, w.date); return d >= 0 && d <= 7; });
  const current = terms.find((t) => t.status === "in_progress");
  const registering = terms.find((t) => t.status === "registering");
  return [
    { id: "student", text: `${student.name} is transferring from ${student.from} to ${student.to}. Counselor: ${student.counselor}.` },
    { id: "progress", text: `${progress.earned} of ${progress.needed} units earned, ${progress.inProgress} in progress, ${progress.planned} planned. On track to graduate ${progress.gradTerm}.` },
    { id: "apply", text: `The Northgate transfer application is due ${APPLY_DEADLINE}, ${days(today, APPLY_DEADLINE)} days from today (${today}).` },
    { id: "drop", text: `The last day to drop a class at Bayview is ${DROP_DEADLINE}.` },
    { id: "due-week", text: due.length ? `Due in the next 7 days: ${due.map((w) => `${w.course} ${w.label} on ${w.date} (${w.worth})`).join("; ")}.` : "Nothing is due in the next 7 days." },
    ...(current ? [{ id: "term", text: `Current term ${current.name}: ${current.courses.map((c) => `${c.code} ${c.title}`).join(", ")}.` }] : []),
    ...(registering ? [{ id: "next-term", text: `Registering for ${registering.name}${registering.registration ? ` (${registering.registration})` : ""}: ${registering.courses.map((c) => `${c.code} ${c.title}`).join(", ")}.` }] : []),
    { id: "requirements", text: `Transfer requirements: ${requirements.map((r) => `${r.code} ${r.name} (${r.status})`).join("; ")}.` },
    { id: "stat", text: `${REQUIREMENT_LABEL} options if STAT 2 is full: ${options.map((o) => `${o.course.replace("BCC ", "")} §${o.section} ${o.verdict.replace(/_/g, " ")}, ${o.seatsOpen} seats`).join("; ")}.` },
    { id: "skills", text: `Skills with proof: ${ledgerSkills.map((s) => s.name).join(", ")}. Skills to build: ${gapSkills.map((s) => s.name).join(", ")}.` },
    { id: "careers", text: `Careers she is exploring: ${careerRoles.map((r) => `${r.title} (${r.match})`).join(", ")}.` },
    { id: "outside", text: `Clubs, events and internships: ${opportunities.filter((o) => o.kind !== "class").slice(0, 8).map((o) => `${o.title} by ${o.host}, ${o.when}, builds ${o.fills.join(" and ")}`).join("; ")}.` },
  ];
}

export const ASK_PROMPT = `You are Sprout, the helper inside Trellis, a planning app for a community college student who is transferring.
Answer the student's question using only the FACTS below. Never invent dates, numbers, classes or people.
If the facts don't answer it, say so in one sentence and suggest where in the app to look (Degree, Terms, Registration, Career or Explore).
You cannot register, drop, send messages or change anything. If asked to, say she does that herself and offer what you can do.
Write to her as "you", warm and plain, at most 3 short sentences, no lists, no markdown.
Reply with JSON only: {"answer": string, "topic": one of ${JSON.stringify(TOPICS)} or null, "factIds": [ids of the facts you used]}.
"topic" is the Home card that best shows the answer: week = what's due, deadline = the application, path = units and graduation, next = an event or club, skills = skills to build, saved = saved items, match = who she's going with.`;

/** Reads the model's reply. Anything malformed is treated as no answer rather than shown raw. */
export function parseAnswer(raw: string | null, facts: Fact[]): Omit<AskAnswer, "mode" | "model"> | null {
  if (!raw) return null;
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  try {
    const v = JSON.parse(json) as { answer?: unknown; topic?: unknown; factIds?: unknown };
    const answer = typeof v.answer === "string" ? v.answer.replace(/\s+/g, " ").trim().slice(0, 600) : "";
    if (!answer) return null;
    const topic = TOPICS.includes(v.topic as WidgetKind) ? (v.topic as WidgetKind) : null;
    const ids = new Set(facts.map((f) => f.id));
    const factIds = Array.isArray(v.factIds) ? [...new Set(v.factIds.filter((x): x is string => typeof x === "string" && ids.has(x)))] : [];
    return { answer, topic, factIds };
  } catch {
    return null;
  }
}

const reason = (e: unknown) => {
  const status = e instanceof GatewayError ? e.status : 0;
  if (status === 402) return "The AI workspace is out of credits.";
  if (status === 429) return "The AI service is rate limited right now.";
  return "The AI service didn't respond.";
};

/** One answer, live if possible. `notes` are things she told the helpers, so answers respect them. */
export async function askSprout(env: GatewayEnv, question: string, opts: { today: string; notes?: string[] }): Promise<AskAnswer | AskFallback> {
  if (!env.apiKey) return { mode: "scripted", reason: "No AI key is connected here." };
  const facts = factsFor(opts.today);
  const noteLine = opts.notes?.length ? `\nShe told the helpers: ${opts.notes.map((n) => `"${n}"`).join(", ")}.` : "";
  try {
    const reply = await gatewayModel({ ...env, apiKey: env.apiKey })(
      [
        { role: "system", content: `${ASK_PROMPT}${noteLine}\n\nFACTS:\n${facts.map((f) => `[${f.id}] ${f.text}`).join("\n")}` },
        { role: "user", content: question },
      ],
      [],
    );
    const parsed = parseAnswer(reply.content, facts);
    if (!parsed) return { mode: "scripted", reason: "The AI answer couldn't be read." };
    return { mode: "live", ...parsed, model: reply.model ?? null };
  } catch (e) {
    return { mode: "scripted", reason: reason(e) };
  }
}

/** Reads an ask request. The question is trimmed and capped; anything else unexpected is dropped. */
export function parseAskInput(body: unknown): { question: string; today: string; notes: string[] } | null {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const question = typeof b["question"] === "string" ? b["question"].trim().slice(0, 500) : "";
  if (!question) return null;
  const today = typeof b["today"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b["today"]) ? b["today"] : "2026-11-08";
  const notes = Array.isArray(b["notes"]) ? b["notes"].filter((n): n is string => typeof n === "string" && n.trim().length > 0).slice(0, 6).map((n) => n.trim().slice(0, 120)) : [];
  return { question, today, notes };
}
