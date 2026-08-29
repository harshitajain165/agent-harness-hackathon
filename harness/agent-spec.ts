import type { TrueForgeApi } from "@truefoundry/trueforge-sdk";

export const AGENT_NAME = process.env.TRUEFORGE_AGENT_NAME ?? "nolan";
export const MCP_SERVER_NAME = "nolan-tools";
export const BRIGHTDATA_SERVER_NAME = "bright-data";

/**
 * The agent definition, version-controlled and re-registered by `harness/create-agent.ts`.
 * Phase 1: proves the harness round-trip (real session/turn lifecycle, one approval gate)
 * with stub tools. Phase 2: record_demo (video, with narration/zoom) is a real, agent-authored
 * recording against any http(s) URL, grounded by inspect_page. create_image_post (single image
 * or carousel) is a real branded card rendered from our own template, not a page screenshot —
 * the agent supplies the headline text itself. Real recipes/Bright Data are later phases.
 */
export const agentSpec: TrueForgeApi.AgentSpec = {
  // The catalog's `name` field uses hyphens (gpt-5-5), not the `model_id`'s dots (gpt-5.5) —
  // verify the exact FQN in Settings → Models / GET /api/v1/models if this ever 422s.
  model: { name: process.env.TRUEFORGE_MODEL ?? "openai/gpt-5-5" },
  instructions:
    "You are Nolan, an AI product-marketing agent.\n\n" +
    "RESEARCH FIRST. When the person names competitors, research them before writing any " +
    "script or copy. Use search_engine to find each one's recent launch videos and posts, " +
    "then delegate one subagent per competitor to fetch and summarise them — those are slow, " +
    "independent calls, so run them in parallel. Have each subagent return only a short " +
    "structured summary: duration, views, engagement, and how the video opens. Use " +
    "analyze_video on each transcript rather than eyeballing it, so the numbers you quote " +
    "are measured, not impressions. If a competitor has no findable video presence, say so " +
    "plainly rather than analysing unrelated content you happened to find.\n\n" +
    "THEN BUILD THE MEDIA. " +
    "First call inspect_page on the target URL to see its real interactive elements " +
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
    "format: \"single\" and exactly one slide — a short, punchy headline (word/phrase in " +
    "`highlight` gets the accent color, e.g. the specific feature name), and a caption. This " +
    "renders a real branded announcement card, not a screenshot of the page — you already have " +
    "the real feature content from your own research, so just write the headline yourself.\n" +
    "- Carousel: when asked for a carousel, call create_image_post with format: \"carousel\" and " +
    "3-6 slides, each one a distinct angle on the feature (e.g. what it is, then a specific " +
    "detail, then the payoff) with its own headline and caption — don't just repeat the same " +
    "headline with different captions.\n\n" +
    "Once you have the media, draft the post copy yourself, then call publish_post with the " +
    "drafted copy once you have something ready to ship. publish_post requires human " +
    "approval — always wait for it. " +
    "\n\nLet the research shape the work, and say which finding shaped which choice — the " +
    "length you chose, how you opened, what you left out.",
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
    {
      name: BRIGHTDATA_SERVER_NAME,
      // Bright Data exposes 33 tools on the groups we enable (69 in total). Loading
      // every schema upfront would cost more context than the rest of the agent, so
      // name the six we actually use and leave discovery deferred.
      enableTools: [
        "search_engine",
        "scrape_as_markdown",
        "scrape_as_html",
        "web_data_linkedin_posts",
        "web_data_x_posts",
        "web_data_youtube_videos",
      ],
      preload: false,
    },
  ],
  config: {
    sandbox: { enabled: false },
    // Defaults to 100. One competitor analysis is several search + fetch calls
    // each, so a multi-competitor turn can approach that; the ceiling is a
    // runaway-loop stop, not a quality lever, so raise it well clear.
    iterationLimit: 200,
    // On: competitor research is several independent, slow fetches (~75s each for a
    // YouTube video), so the agent fans out one subagent per competitor and they run
    // concurrently. thread.created/thread.done are mapped onto thinking steps in
    // lib/agent/trueforge/map-event.ts, and only the root thread's prose reaches the
    // reply — subagent text would otherwise interleave into a single stream.
    dynamicSubAgents: { enabled: true },
  },
};
