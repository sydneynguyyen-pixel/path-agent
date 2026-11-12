# Trellis

Trellis helps community college students who plan to transfer stay on track, from the first class to the university they're headed for. Its agent, **Sprout**, reads the student's school records, keeps an eye on the plan and steps in when something goes wrong. The student makes every decision.

The demo follows Maya Torres. She's a psychology student at Bayview Community College transferring to Northgate State, and every person, school and record in it is made up.

## What it does

- **Fixes registration when a class is full.** When STAT 2 fills up, Sprout finds backup classes that still count toward her degree and holds a seat. If an option is unsure, it drafts an email to her counselor. Maya registers herself; Sprout never does it for her.
- **Shows where she stands.** The Degree page shows the requirements she has finished and those still left, as an audit or as a tree. The Map lays her whole path out on a timeline, through to graduation.
- **Connects career goals to her classes.** She picks up to three careers. Career shows the skills she already has proof of, the skills to build next, and the classes, clubs and events that teach them. It can also tailor a resume to a job post.
- **Suggests things to go to beyond class.** Explore lists events, clubs and internships, with a note on why each one fits. She can see who else is going and ask to go together.
- **Answers questions in chat.** Sprout's chat bar sits at the bottom of every page. It answers using facts from her plan and names the ones it used. There's also a daily brief on Home.
- **Shows its work.** Agents → Activity lists every run: why it started, each step, the sources it read and what it chose *not* to do. Agent controls sets what each helper can read and do.
- **Has a Home she arranges.** Home is a desktop of widgets she can add, resize and move, over a watercolor background she can change.

Students stay in charge throughout: Sprout prepares and suggests; it never registers, sends or changes a record on its own.

## How the agent works

Sprout is a small group of helpers (Reader, Planner, Backup finder and others) working on one shared run.

- **Runs** stream events from `/api/agent-recover`. The browser applies each event with `applyRunEvent` in `src/lib/run.ts`.
- **Chat** answers come from `/api/agent-ask`. The answer is built from facts about her plan and must cite them.
- **Re-checks** happen when something changes, such as a seat filling or Maya adding a note like "no mornings". Sprout then redoes only the steps that depended on what changed.
- **Model calls** go through Lovable's AI gateway (`src/lib/agent/gateway.ts`). The key stays on the server.

The whole demo also works without an AI key. Runs and chat fall back to scripted answers and say so ("Ran without AI").

| Server variable | What it's for |
| --- | --- |
| `LOVABLE_API_KEY` | Turns on live answers. Lovable manages it as a secret; never commit it. |
| `AI_GATEWAY_URL` | Optional. Overrides the gateway address. |
| `AGENT_MODEL` | Optional. Picks the model. |

## Run it locally

You need Node.js 20+ and either Bun or npm.

```sh
bun install    # or: npm install
bun run dev    # or: npm run dev
```

Then open http://localhost:5173. The first visit starts onboarding at `/welcome`. Use **Reset demo** (top right) to put everything back the way it started, and **Try another path** to play the edge cases.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the dev server |
| `npm test` | Runs the tests (Vitest) |
| `npm run build` | Builds for production |
| `npm run lint` | Runs ESLint |

## Where things live

| Path | What's there |
| --- | --- |
| `src/routes/` | Pages (TanStack Start file routes) and the `api/` agent endpoints |
| `src/components/app/` | App components: `Shell`, `AgentChat`, `Desktop`, `RunChat`, and others |
| `src/lib/` | Logic, mostly pure tested helpers: `journey.tsx` (shared demo state), `run.ts`, `chat.ts`, `goals.ts`, `going.ts`, `desktop.ts`, `confidence.ts`, … |
| `src/lib/agent/` | Agent loop, tools, gateway, input checks and re-checks |
| `src/data/` | Synthetic demo data (`scenario.ts`, `people.ts`, `listings.ts`, `edge-runs.ts`) |
| `src/test/` | Tests |

The whole demo runs on one shared state in `src/lib/journey.tsx`, so every page agrees. Reset demo restores all of it in one call.

## Stack

TanStack Start, React 19, Tailwind CSS v4, Radix UI and Vitest. Built with [Lovable](https://lovable.dev/projects/090bf327-b1f1-4dd3-a7cf-2d3dacb27b2e).

## Working on this repo

The project is connected to Lovable, so commits pushed to `main` sync back to the editor.

- Don't force-push or rewrite pushed history.
- Make database and secret changes in Lovable, not by hand.
- Don't edit generated files such as `src/routeTree.gen.ts`.

`AGENTS.md` has the full rules and design decisions.
