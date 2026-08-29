import { timingSafeEqual } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { createImagePost, type Slide } from "@/lib/tools/create-image-post";
import { inspectPage } from "@/lib/tools/inspect-page";
import { recordDemo, type RecordStep } from "@/lib/tools/record-demo";

export const runtime = "nodejs";

/**
 * Our own MCP tool server, registered with TrueForge as a "remote" connector
 * (see `harness/create-agent.ts`) at this route's URL.
 * - `inspect_page` (read-only, no approval): grounds the agent in a target page's real
 *   interactive elements before it authors a record_demo/create_image_post step list.
 *   Accepts optional nav steps to run first, for content behind a collapsed accordion.
 * - `record_demo` (plain, no approval): real Playwright recording of an agent-authored
 *   step list against any http(s) URL, with optional OpenAI TTS narration and time-gated
 *   zoom composited in via ffmpeg — see lib/tools/record-demo.ts.
 * - `create_image_post` (plain, no approval): real screenshot(s) of a feature — single image
 *   or carousel — with an optional highlight box, no video/audio — see lib/tools/create-image-post.ts.
 * - `publish_post` (`destructiveHint: true`, so TrueForge's default
 *   `require_approval_for_tools` pauses the turn for it): still a stub — writes to an
 *   in-memory outbox. Real distribution (actually posting somewhere) is a later phase.
 */

const httpUrl = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//i.test(value), { message: "Must be an http(s) URL" });

const narration = z
  .string()
  .optional()
  .describe("Optional voiceover line to narrate during/after this step (synthesized via OpenAI TTS)");
const zoom = z
  .boolean()
  .optional()
  .describe("Zoom the video into this step's element for its duration");

const stepSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("click"), selector: z.string(), narration, zoom }),
  z.object({ action: z.literal("type"), selector: z.string(), text: z.string(), narration }),
  z.object({ action: z.literal("press"), selector: z.string().optional(), key: z.string(), narration }),
  z.object({ action: z.literal("wait"), ms: z.number().min(0).max(5_000), narration }),
  z.object({ action: z.literal("scroll"), selector: z.string().optional(), narration, zoom }),
]);

// Same click/type/press/wait/scroll vocabulary, no narration/zoom — meaningless for a still image.
const navStepSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("click"), selector: z.string() }),
  z.object({ action: z.literal("type"), selector: z.string(), text: z.string() }),
  z.object({ action: z.literal("press"), selector: z.string().optional(), key: z.string() }),
  z.object({ action: z.literal("wait"), ms: z.number().min(0).max(5_000) }),
  z.object({ action: z.literal("scroll"), selector: z.string().optional() }),
]);

const slideSchema = z.object({
  steps: z
    .array(navStepSchema)
    .max(10)
    .describe("Nav-only actions to reach this slide's state (e.g. scroll to a section, expand something)"),
  caption: z.string().describe("This slide's caption text (shown alongside the image, not burned into it)"),
  highlight: z
    .string()
    .optional()
    .describe("Optional selector to draw a highlight box around in the screenshot, calling out that element"),
});

// Fake in-memory outbox, so publish_post has somewhere to "publish" to.
const outbox: { post: string; publishedAt: string }[] = [];

function buildServer() {
  const server = new McpServer({ name: "nolan-tools", version: "0.1.0" });

  server.registerTool(
    "inspect_page",
    {
      description:
        "Load a page and list its real interactive elements (buttons, links, inputs) with a " +
        "usable selector for each. Call this before record_demo/create_image_post to ground " +
        "step selectors in what's actually on the page, instead of guessing. If the section " +
        "you need is inside a collapsed sidebar/accordion — its children genuinely won't be " +
        "listed until expanded — pass `steps` to click it open first, then call again.",
      inputSchema: {
        url: httpUrl.describe("The page to inspect"),
        steps: z
          .array(navStepSchema)
          .max(5)
          .optional()
          .describe("Optional nav actions to run before listing elements, e.g. clicking to expand a section"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ url, steps }) => {
      try {
        const { title, elements } = await inspectPage(url, steps);
        return { content: [{ type: "text", text: JSON.stringify({ title, elements }) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Inspection failed";
        return { content: [{ type: "text", text: `inspect_page failed: ${message}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "record_demo",
    {
      description:
        "Record a screen capture of a product demonstrating a feature, by driving a real " +
        "browser through an author-supplied list of steps against any http(s) URL. Call " +
        "inspect_page first to find real selectors — steps with a selector that doesn't " +
        "exist on the page will fail. Any step can carry a `narration` line (synthesized as " +
        "voiceover and mixed into the final video at that step's real timing) and click/scroll " +
        "steps can set `zoom: true` to zoom the video into that element for the step's duration.",
      inputSchema: {
        url: httpUrl.describe("The page to record"),
        feature: z.string().describe("The feature being demonstrated (used for labeling only)"),
        steps: z.array(stepSchema).max(20).describe("Ordered actions to perform, e.g. from inspect_page's selectors"),
      },
    },
    async ({ url, feature, steps }) => {
      try {
        const recording = await recordDemo(url, steps as RecordStep[]);
        // JSON in the text content, not a separate content part — TrueForge's own
        // ToolResponseEvent flattens whatever we return to a single `content: string`
        // by the time it reaches our BFF, so this is the only channel available for
        // structured data. map-event.ts parses this specifically for record_demo.
        return { content: [{ type: "text", text: JSON.stringify({ feature, ...recording }) }] };
      } catch (error) {
        // e.g. a step's selector doesn't exist on the page, the URL is unreachable, or
        // Chromium isn't installed — surface it as a real tool error instead of a raw
        // 500 crashing the turn, and give the agent enough to retry with a fixed step.
        const message = error instanceof Error ? error.message : "Recording failed";
        return { content: [{ type: "text", text: `record_demo failed: ${message}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "create_image_post",
    {
      description:
        "Create a static image post (one screenshot) or a carousel (several screenshots, " +
        "swiped through in order) of a feature on any http(s) URL. Call inspect_page first to " +
        "find real selectors for any nav steps or highlights — a selector that doesn't exist " +
        "on the page will fail. Each slide's caption is separate accompanying text, not burned " +
        "into the image, matching how real social posts work.",
      inputSchema: {
        url: httpUrl.describe("The page to screenshot"),
        feature: z.string().describe("The feature being shown (used for labeling only)"),
        format: z.enum(["single", "carousel"]).describe("single = exactly one slide, carousel = several"),
        slides: z.array(slideSchema).min(1).max(10).describe("One entry per image, in order"),
      },
    },
    async ({ url, feature, format, slides }) => {
      try {
        const post = await createImagePost(url, slides as Slide[]);
        // Same reasoning as record_demo: JSON-in-text is the only channel available for
        // structured data once TrueForge flattens the tool response to a single string.
        return { content: [{ type: "text", text: JSON.stringify({ feature, format, ...post }) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Image post generation failed";
        return { content: [{ type: "text", text: `create_image_post failed: ${message}` }], isError: true };
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
