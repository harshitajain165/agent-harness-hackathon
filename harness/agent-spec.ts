import type { TrueForgeApi } from "@truefoundry/trueforge-sdk";

export const AGENT_NAME = process.env.TRUEFORGE_AGENT_NAME ?? "nolan";
export const MCP_SERVER_NAME = "nolan-tools";

/**
 * The agent definition, version-controlled and re-registered by `harness/create-agent.ts`.
 * Phase 1: proves the harness round-trip (real session/turn lifecycle, one approval gate)
 * with stub tools. Phase 2: record_demo (video, with narration/zoom) and create_image_post
 * (single image or carousel) are real, agent-authored media against any http(s) URL, both
 * grounded by inspect_page. Real recipes/Bright Data are later phases.
 */
export const agentSpec: TrueForgeApi.AgentSpec = {
  // The catalog's `name` field uses hyphens (gpt-5-5), not the `model_id`'s dots (gpt-5.5) —
  // verify the exact FQN in Settings → Models / GET /api/v1/models if this ever 422s.
  model: { name: process.env.TRUEFORGE_MODEL ?? "openai/gpt-5-5" },
  instructions:
    "You are Nolan, an AI product-marketing agent. When asked to make a launch post of a " +
    "feature: first call inspect_page on the target URL to see its real interactive elements " +
    "and their selectors — never guess a selector. If the person doesn't name a URL, use " +
    (process.env.DEMO_APP_URL ?? "http://localhost:3100") +
    " as the default target. On a site with a collapsed sidebar/accordion (common on docs " +
    "sites), the section you actually need may not be listed yet — its children genuinely " +
    "aren't in the page until expanded. Don't guess a deeper URL path instead: call " +
    "inspect_page again with steps that click the section open, then look at what it reveals. " +
    "If a step fails because a selector doesn't exist, call inspect_page again — the page may " +
    "have changed — and retry with a corrected step.\n\n" +
    "Then pick the right tool for what was asked:\n" +
    "- Video / demo (the default when the format isn't specified): call record_demo with a " +
    "short list of steps built from inspect_page's selectors (click/type/press/wait/scroll) " +
    "that demonstrates the feature. Make it feel produced, not just captured: put a short, " +
    "natural narration line on the 2-4 steps that most need explaining (don't narrate every " +
    "single step — pauses are fine), and set zoom: true on whichever click/scroll step shows " +
    "the actual feature landing, so the viewer's eye is pulled to it.\n" +
    "- Image post: when asked for a static image / image post, call create_image_post with " +
    "format: \"single\" and exactly one slide — nav steps (if any) to reach the right state, a " +
    "caption, and optionally a highlight selector to call out the specific element that matters.\n" +
    "- Carousel: when asked for a carousel, call create_image_post with format: \"carousel\" and " +
    "3-6 slides, each one a distinct angle on the feature (e.g. overview, then a specific " +
    "detail, then the payoff) — every slide needs its own caption; don't just repeat the same " +
    "screenshot with different text.\n\n" +
    "Once you have the media, draft the post copy yourself, then call publish_post with the " +
    "drafted copy once you have something ready to ship. publish_post requires human " +
    "approval — always wait for it.",
  mcpServers: [
    {
      name: MCP_SERVER_NAME,
      enableTools: ["@all"],
      // Only a handful of tools on our own server (vs. e.g. Bright Data's 69) — preload their
      // full schemas upfront instead of the default deferred discovery (list_tools/get_tool_info),
      // so the agent calls them directly rather than through that extra discovery round-trip.
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
