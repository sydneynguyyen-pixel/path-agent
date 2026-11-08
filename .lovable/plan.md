# Academic Path Agent — interactive prototype

Fully synthetic, scripted prototype of the Maya Torres journey (Bayview CC, quarter system -> Northgate State, semester system). No backend, no real AI yet; all data and agent steps are hardcoded.

## Visual direction
Calm, academic, reassuring: warm paper background, deep ink-teal primary, soft sage for "done", amber (not red) for "at risk", serif headings (Fraunces) with a clean sans body (Figtree). Source chips and confidence badges are a consistent visual language everywhere.

## Pages
- `/` Degree view — requirement rows (done, in progress, at risk, remaining, transfer credit), each with source chip + confidence badge; "Simulated data" banner.
- `/semester` — week-by-week strip merging 3 syllabi, pile-up weeks highlighted.
- `/portal` — clearly labeled "Simulated registration portal". Click "Add" on STAT 2 -> "Section full" -> agent side panel slides in and runs the journey:
  1. Requirement marked "at risk" (degree view reflects it)
  2. Recovery panel: 4 ranked alternatives with plain reasons, rule, source, confidence
     - clearly counts / clearly does not / counts only with grade C or better / catalog vs articulation conflict (both readings shown, "Needs counselor confirmation")
  3. Deadline check against her other syllabi per option
  4. Pick option -> approval card: editable email draft, evidence list, named "Approve and send as Maya Torres" button, decision log entry (who/what/when). Sending is simulated; nothing registered.
- `/activity` — Reader, Planner, Backup finder, Drafter: status, what each read, what each produced.
- `/sources` — simulated connected sources (Canvas, student system, degree audit, articulation data).
- `/permissions` — scope limited to registration page, "Watching" indicator, Pause button (pausing stops the agent panel).
- Evidence drawer (global): click any claim to see the source passage and document name.
- Quarter-to-semester conversion shown as cited rules from each school's policy.

## Additions
- Done state: after approval, degree view moves the requirement from "at risk" to "pending counselor confirmation" with the chosen course shown; semester view adds the chosen course's deadlines. Banner: "Nothing was registered. Your counselor confirms next."
- Activity view: handoff sequence Reader -> Planner -> Backup finder -> Drafter with timestamps; click an agent to see its inputs and outputs.
- `/decisions` Decision log page: every approval (who, what, when, evidence link opening the drawer).
- Confidence badges use label + icon (High/Medium/Low), not color alone; amber for "at risk", never red anywhere.
- Send is simulated: toast and card note "Demo only: no email was sent."
- Degree view shows the quarter-to-semester conversion as cited rules from both Bayview and Northgate policies.

## Guardrails in UI
- Every "counts" claim has a source + confidence; below threshold auto-routes to counselor as unconfirmed.
- Footer note: no legal, financial-aid or immigration advice.

## Technical details
- Shared journey state in a small React context (at-risk flag, chosen option, draft, decision log, paused) so all pages stay in sync.
- Mock data in one module (`src/data/scenario.ts`): requirements, courses, sources/passages, syllabi, agents.
- Shared nav in `__root.tsx`; per-route head() metadata; shadcn Sheet for drawer/side panel.
- Small unit test for the confidence-threshold rule (below threshold => needs counselor).
