import { createFileRoute } from "@tanstack/react-router";
import { askSprout, parseAskInput } from "@/lib/agent/ask";

/** Sprout's chat. Read-only: it answers from her plan and can't act. The key stays on the server. */
export const Route = createFileRoute("/api/agent-ask")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const input = parseAskInput(await request.json().catch(() => null));
        if (!input) return Response.json({ error: "Ask a question." }, { status: 400 });
        const out = await askSprout({ apiKey: process.env["LOVABLE_API_KEY"], url: process.env["AI_GATEWAY_URL"], model: process.env["AGENT_MODEL"] }, input.question, { today: input.today, notes: input.notes });
        return Response.json(out, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
