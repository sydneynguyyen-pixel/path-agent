import { createFileRoute } from "@tanstack/react-router";
import type { AgentId } from "@/lib/journey";
import { runRecovery } from "@/lib/agent/gateway";

const HELPERS: AgentId[] = ["reader", "planner", "backup", "drafter"];

/** The one live agent loop. The browser sends only which helpers are on and gets back a stream of steps. */
export const Route = createFileRoute("/api/agent-recover")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { agentOn?: Partial<Record<AgentId, unknown>> };
        const agentOn = Object.fromEntries(HELPERS.map((h) => [h, body.agentOn?.[h] !== false])) as Record<AgentId, boolean>;
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            await runRecovery(
              { apiKey: process.env["LOVABLE_API_KEY"], url: process.env["AI_GATEWAY_URL"], model: process.env["AGENT_MODEL"], scriptedDelayMs: 450 },
              agentOn,
              (e) => controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`)),
            );
            controller.close();
          },
        });
        return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
      },
    },
  },
});
