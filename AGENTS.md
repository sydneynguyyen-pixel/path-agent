<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Journey state lives in one React context (src/lib/journey.tsx) so every page reflects the same scripted demo and "Reset demo" can restore it in one call.
- All mock data lives in src/data/scenario.ts and is fully synthetic; scripted agent output will later be replaced by real AI calls.
- Confidence threshold and recovery-path rules live in src/lib/confidence.ts (tested): clearly-counts options go to self-register now with no email; conflict, grade-condition or low-confidence options use hold-seat-now with a non-blocking counselor email. Option ranking (seats first, then fit) lives in rankOptions in scenario.ts.
- Onboarding completion is stored in localStorage ("pa-onboarded") and read after hydration; Shell redirects to /welcome until done, and /welcome renders without the app frame.
- The simulated school portal uses its own portal-* tokens so it looks like the school's system, with the agent shown only as an overlay.
- Design rationale lives outside the app (delivered as a document), not as a route.
- Activity timeline events are derived from journey state in src/lib/activity.ts (tested) and timestamps come from the scripted clock (SCRIPT_START in journey.tsx), so every page agrees and Reset demo restores them; /decisions redirects to /activity?tab=decisions.
- Activity log search, combined helper/status filtering, and timestamp sorting use a browser-safe pure function in src/lib/activity-filters.ts so controls stay testable without altering journey events.
- Brand icons and agent portraits are shared through src/components/app/Brand.tsx, with palettes in src/styles.css; institutional portal styling stays scoped separately so visual updates cannot alter the school experience.
