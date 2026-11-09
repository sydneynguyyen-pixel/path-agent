export type PostingSkill = { name: string; quote: string };
export type PostingResult = { kind: "empty" } | { kind: "link" } | { kind: "short" } | { kind: "ok"; found: PostingSkill[] };

/** Known skills and the phrases that signal them. Anything outside this list is left out, never guessed. */
export const postingVocabulary: { name: string; terms: RegExp }[] = [
  { name: "Usability testing", terms: /usability (test|stud)/i },
  { name: "Survey design", terms: /survey (design|creat|develop|build)|design(ing)? surveys?/i },
  { name: "Survey interpretation", terms: /survey (data|result|response|analy)/i },
  { name: "Data analysis in R", terms: /\bR\b(?= ?(programming|studio|,|and|or|\)|\.))|rstudio/ },
  { name: "SQL", terms: /\bsql\b/i },
  { name: "Data visualization", terms: /data visuali[sz]ation|tableau|dashboards?/i },
  { name: "Descriptive statistics", terms: /statistic/i },
  { name: "Interviewing", terms: /interview/i },
  { name: "Qualitative observation", terms: /qualitative|ethnograph|observation/i },
  { name: "Research writing", terms: /research (writing|report|brief)|report writing|written (reports?|communication)/i },
  { name: "Policy evaluation", terms: /policy (evaluation|analysis)/i },
  { name: "Evaluation design", terms: /program evaluation|evaluation design|logic model/i },
  { name: "Collections management", terms: /collections? (management|database)|cataloguing|cataloging/i },
  { name: "Source analysis", terms: /primary sources?|source analysis|archival/i },
];

function sentences(text: string) { return text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean); }

export function readPosting(input: string): PostingResult {
  const text = input.trim();
  if (!text) return { kind: "empty" };
  if (/^https?:\/\/\S+$/i.test(text)) return { kind: "link" };
  if (text.length < 80) return { kind: "short" };
  const parts = sentences(text);
  const found: PostingSkill[] = [];
  for (const v of postingVocabulary) {
    const hit = parts.find((s) => v.terms.test(s));
    if (hit) found.push({ name: v.name, quote: hit.length > 160 ? hit.slice(0, 157) + "..." : hit });
  }
  return { kind: "ok", found };
}
