import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { recordDemo } from "@/lib/tools/record-demo";

export const runtime = "nodejs";

/**
 * Our own MCP tool server, registered with TrueForge as a "remote" connector
 * (see `harness/create-agent.ts`) at this route's URL.
 * - `record_demo` (plain, no approval): real Playwright recording (see lib/tools/record-demo.ts).
 * - `publish_post` (`destructiveHint: true`, so TrueForge's default
 *   `require_approval_for_tools` pauses the turn for it): still a stub — writes to an
 *   in-memory outbox. Real TTS/ffmpeg stitching is a later phase.
 */

// Fake in-memory outbox, so publish_post has somewhere to "publish" to.
const outbox: { post: string; publishedAt: string }[] = [];

function buildServer() {
  const server = new McpServer({ name: "nolan-tools", version: "0.1.0" });

  server.registerTool(
    "record_demo",
    {
      description: "Record a screen capture of the product demonstrating a feature.",
      inputSchema: { feature: z.string().describe("The feature being demonstrated") },
    },
    async ({ feature }) => {
      const recording = await recordDemo(feature);
      // JSON in the text content, not a separate content part — TrueForge's own
      // ToolResponseEvent flattens whatever we return to a single `content: string`
      // by the time it reaches our BFF, so this is the only channel available for
      // structured data. map-event.ts parses this specifically for record_demo.
      return { content: [{ type: "text", text: JSON.stringify({ feature, ...recording }) }] };
    }
  );

  server.registerTool(
    "publish_post",
    {
      description: "Publish a launch post. Requires human approval before it runs.",
      inputSchema: { post: z.string().describe("The drafted post copy to publish") },
      annotations: { destructiveHint: true },
    },
    async ({ post }) => {
      outbox.push({ post, publishedAt: new Date().toISOString() });
      return {
        content: [{ type: "text", text: `Published to the local outbox (${outbox.length} total).` }],
      };
    }
  );

  return server;
}

// Stateless mode (sessionIdGenerator: undefined) — a transport instance handles exactly
// one request, so build a fresh server+transport per call. We don't need MCP session
// tracking for Phase 1 (no per-client state in our tools beyond the shared outbox above).
async function handle(request: Request) {
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await buildServer().connect(transport);
  return transport.handleRequest(request);
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function DELETE(request: Request) {
  return handle(request);
}
