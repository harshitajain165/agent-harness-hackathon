import { timingSafeEqual } from "node:crypto";
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
      try {
        const recording = await recordDemo(feature);
        // JSON in the text content, not a separate content part — TrueForge's own
        // ToolResponseEvent flattens whatever we return to a single `content: string`
        // by the time it reaches our BFF, so this is the only channel available for
        // structured data. map-event.ts parses this specifically for record_demo.
        return { content: [{ type: "text", text: JSON.stringify({ feature, ...recording }) }] };
      } catch (error) {
        // e.g. the target app (DEMO_APP_URL) isn't running, or Chromium isn't installed —
        // surface it as a real tool error instead of a raw 500 crashing the turn.
        const message = error instanceof Error ? error.message : "Recording failed";
        return { content: [{ type: "text", text: `record_demo failed: ${message}` }], isError: true };
      }
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

function secretsEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Unauthenticated by default (matches this route's frictionless local-dev posture), but
// record_demo launches a real browser and writes real files — set MCP_SECRET to require
// the same header create-agent.ts registers on the MCP server manifest (see harness/create-agent.ts).
function authorizeMcp(request: Request): Response | null {
  const secret = process.env.MCP_SECRET;
  if (!secret) return null;
  const header = request.headers.get("x-mcp-secret") ?? "";
  if (!secretsEqual(header, secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

// Stateless mode (sessionIdGenerator: undefined) — a transport instance handles exactly
// one request, so build a fresh server+transport per call. We don't need MCP session
// tracking for Phase 1 (no per-client state in our tools beyond the shared outbox above).
async function handle(request: Request) {
  const denied = authorizeMcp(request);
  if (denied) return denied;
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
