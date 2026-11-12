import { createFileRoute } from "@tanstack/react-router";
import { runRecovery } from "@/lib/agent/gateway";
import { parseRunInput } from "@/lib/agent/input";

/**
 * The one live agent loop. The browser sends which helpers are on and, optionally, what has
 * changed (seats, a counselor's "no") and why this run started. It gets back a stream of events.
 */
export const Route = createFileRoute("/api/agent-recover")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { agentOn, world, trigger, runId, changes } = parseRunInput(await request.json().catch(() => ({})));
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            await runRecovery(
              { apiKey: process.env["LOVABLE_API_KEY"], url: process.env["AI_GATEWAY_URL"], model: process.env["AGENT_MODEL"], scriptedDelayMs: 450 },
              agentOn,
              (e) => controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`)),
              { world, trigger, ...(runId ? { runId } : {}), ...(changes ? { changes } : {}) },
            );
            controller.close();
          },
        });
        return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
      },
    },
  },
});
