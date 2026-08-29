import type { TrueForgeApi } from "@truefoundry/trueforge-sdk";

export const AGENT_NAME = process.env.TRUEFORGE_AGENT_NAME ?? "nolan";
export const MCP_SERVER_NAME = "nolan-tools";

/**
 * The agent definition, version-controlled and re-registered by `harness/create-agent.ts`.
 * Phase 1: proves the harness round-trip (real session/turn lifecycle, one approval gate)
 * with stub tools. Phase 2: record_demo is a real, agent-authored recording against any
 * http(s) URL, grounded by inspect_page. Real TTS/recipes/Bright Data are later phases.
 */
export const agentSpec: TrueForgeApi.AgentSpec = {
  // The catalog's `name` field uses hyphens (gpt-5-5), not the `model_id`'s dots (gpt-5.5) —
  // verify the exact FQN in Settings → Models / GET /api/v1/models if this ever 422s.
  model: { name: process.env.TRUEFORGE_MODEL ?? "openai/gpt-5-5" },
  instructions:
    "You are Nolan, an AI product-marketing agent. When asked to make a demo or launch post " +
    "of a feature: first call inspect_page on the target URL to see its real interactive " +
    "elements and their selectors — never guess a selector. Then call record_demo with the " +
    "same URL, the feature name, and a short list of steps built from those selectors " +
    "(click/type/press/wait/scroll) that demonstrates the feature. If the person doesn't name " +
    "a URL, use " +
    (process.env.DEMO_APP_URL ?? "http://localhost:3100") +
    " as the default target. If a step fails because a selector doesn't exist, call " +
    "inspect_page again — the page may have changed — and retry with a corrected step. " +
    "Make the recording feel produced, not just captured: put a short, natural narration " +
    "line on the 2-4 steps that most need explaining (don't narrate every single step — pauses " +
    "are fine), and set zoom: true on whichever click/scroll step shows the actual feature " +
    "landing, so the viewer's eye is pulled to it. Once you have the video, draft the post " +
    "copy yourself, then call publish_post with the drafted copy once you have something " +
    "ready to ship. publish_post requires human approval — always wait for it.",
  mcpServers: [
    {
      name: MCP_SERVER_NAME,
      enableTools: ["@all"],
      // Only 2 tools on our own server (vs. e.g. Bright Data's 69) — preload their full
      // schemas upfront instead of the default deferred discovery (list_tools/get_tool_info),
      // so the agent calls record_demo/publish_post directly rather than through that
      // extra discovery round-trip.
      preload: true,
      // requireApprovalForTools defaults to ["@write", "@destructive"], which already
      // covers publish_post (annotated destructiveHint: true) — nothing extra needed.
    },
  ],
  config: {
    sandbox: { enabled: false },
    // Off for Phase 1: no thread.created/thread.done to handle yet — that's parallel
    // subagent lanes, a later phase that also needs a UI change we're not making now.
    dynamicSubAgents: { enabled: false },
  },
};
