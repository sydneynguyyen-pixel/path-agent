/**
 * The follow-up Sprout's Drafter writes after she meets someone at an event.
 * Built only from what's real: their first name, the event, her own note (word for word),
 * a skill both cards list, and the one ask she picked. Nothing else is added or guessed.
 */

export type FollowUpAsk = "coffee" | "keep-in-touch" | "notes";
export const FOLLOW_UP_ASKS: { id: FollowUpAsk; label: string }[] = [
  { id: "keep-in-touch", label: "Stay in touch" },
  { id: "coffee", label: "Coffee" },
  { id: "notes", label: "Swap notes" },
];

export type FollowUpInput = {
  /** Their name as their card shows it ("Lena K."). Only the first name is used. */
  to: string;
  /** The event's short name ("UX Night"). */
  event: string;
  /** What she wrote under "What we talked about". Used word for word. */
  note?: string | undefined;
  /** Skills on her card and on theirs. A skill on both is mentioned; otherwise none is. */
  herSkills: string[];
  theirSkills: string[];
  ask: FollowUpAsk;
  /** Her name. Only the first name signs it. */
  from: string;
};

export type FollowUpDraft = { subject: string; body: string; shared: string | null };

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
const sentence = (s: string) => (/[.!?…]$/.test(s) ? s : `${s}.`);
/**
 * Her note is written to herself ("her bus-stop sketches"); in a message to that person it reads
 * as "your". Only possessives are swapped, so nothing else in her words changes.
 */
export const toThem = (note: string) => note.replace(/\b(her|his|their)\b/gi, (m) => (m[0] === m[0]!.toUpperCase() ? "Your" : "your"));
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** The first skill on her card that's also on theirs (ignoring case), or null. */
export function sharedSkill(hers: string[], theirs: string[]): string | null {
  const t = new Set(theirs.map((s) => s.trim().toLowerCase()));
  return hers.find((s) => t.has(s.trim().toLowerCase())) ?? null;
}

const ASK_LINE: Record<FollowUpAsk, (event: string) => string> = {
  "keep-in-touch": () => "Let's stay in touch.",
  coffee: () => "Would you want to get coffee on campus sometime?",
  notes: (event) => `Want to swap notes from ${event}?`,
};

/** Same input, same draft. Her note goes in as she wrote it, with "her/his" read as "your". */
export function followUpDraft(i: FollowUpInput): FollowUpDraft {
  const name = firstName(i.to);
  const note = i.note?.trim();
  const shared = sharedSkill(i.herSkills, i.theirSkills);
  const lines = [
    `Hi ${name},`,
    "",
    [
      `It was good to meet you at ${i.event}.`,
      note ? `I enjoyed talking about ${sentence(lower(toThem(note)))}` : null,
      shared ? `We both have ${shared} on our cards.` : null,
      ASK_LINE[i.ask](i.event),
    ].filter(Boolean).join(" "),
    "",
    firstName(i.from),
  ];
  return { subject: `Good to meet you at ${i.event}`, body: lines.join("\n"), shared };
}
