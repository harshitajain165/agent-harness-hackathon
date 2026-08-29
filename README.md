# Agent harness

Chat UI for your agent. Tokens and components are defined in `app/globals.css` and `@/components/ui`.

## Run

Requires **Node ≥ 22** (`@truefoundry/trueforge-sdk` declares this in its own `engines` field —
the TrueForge mode below won't run correctly on older Node, even though the plain UI/mock mode
would). `pnpm install` also runs `playwright install chromium` via `postinstall`, needed for
`record_demo`'s real recording — safe to skip if you only use the mock/proxy backends, but it
runs by default. `record_demo` also shells out to a system **ffmpeg** (with `ffprobe`) to
composite narration/zoom — `brew install ffmpeg` (macOS) or your platform's equivalent; not
installed by `pnpm install`.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Agent API

The harness streams from `POST /api/agent/chat` and confirms writes with `POST /api/agent/confirm`.
`lib/agent/runtime.ts` picks a backend in this order:

1. **TrueForge** — if `TRUEFORGE_BASE_URL` is set, turns run through a real [TrueForge](https://github.com/truefoundry/trueforge) harness. See below.
2. **Generic proxy** — if `AGENT_API_URL` is set, requests proxy to that SSE endpoint.
3. **Local mock** — otherwise, a canned local runtime streams the same events so you can exercise the UI without a backend.

Events the UI renders: `thinking`, `token`, `tool_call`, `tool_result`, `confirmation_required`, `artifact`, `error`, `done`. Artifact kinds: `records`, `diff`, `video`.

### Running against TrueForge

```bash
pnpm harness        # npx @truefoundry/trueforge@0.1.4, on :8790
pnpm setup:agent    # registers our MCP tool server + the "nolan" agent (idempotent, re-runnable)
pnpm dev            # this app, on :3000
```

Set in `.env.local`:

```
TRUEFORGE_BASE_URL=http://localhost:8790
TRUEFORGE_AGENT_NAME=nolan
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Our own MCP tool server lives at `app/api/mcp/route.ts` (registered by `pnpm setup:agent` as a
`remote` connector). `publish_post` (`destructiveHint: true`) is still a stub — writes to an
in-memory outbox, pauses for approval via TrueForge's default `require_approval_for_tools`, which
the UI's `confirmation_required` / `/api/agent/confirm` round-trip already handles. Agent spec:
`harness/agent-spec.ts`.

`record_demo` (`lib/tools/record-demo.ts`) is a **real** recording, and it isn't limited to one
pre-wired app: it takes any `http(s)` URL plus an **agent-authored** list of steps
(click/type/press/wait/scroll), executes them with headless Playwright `recordVideo`, and writes
a final `.mp4` to `public/artifacts/`, which streams into the UI's video pane for real. No OS
screen-recording permission — no visible cursor either (that's the real-capture path from
`PROJECT_PLAN.md` §4, a later upgrade).

Any step can carry two extras, composited in by `lib/tools/compose-video.ts` (ffmpeg) after the
raw Playwright recording finishes:

- **`narration`** — a line of text, synthesized via OpenAI TTS (`lib/tools/tts.ts`,
  `gpt-4o-mini-tts` falling back to `tts-1`, disk-cached by a hash of the text) *before*
  recording starts. Its exact duration is known up front, so that step's real-time settle
  is stretched to at least that long — the mixed-in narration can never overlap into the
  next step's visual action. Requires `OPENAI_API_KEY` (separate from whatever model key is
  configured inside TrueForge's own Settings — this app's process can't see that one).
- **`zoom: true`** (click/scroll steps) — captures the target element's real bounding box just
  before the action runs, and the video crops/scales into that region for the step's duration.
  A hard cut in zoom level, not a smooth Ken-Burns ease — a documented simplification.

Both are optional and independent — narration-only, zoom-only, both, or neither (in which case
the video is still re-encoded to mp4, just without any filters applied) all work.

Since the agent has no vision, it can't guess real selectors on a page it's never seen — that's
what `inspect_page(url, steps?)` is for: it loads the page and returns its actual interactive
elements with a usable selector for each (`harness/agent-spec.ts`'s instructions tell the agent
to always call this first). It also accepts optional nav `steps` to run before listing — e.g.
clicking to expand a collapsed sidebar accordion — since on real sites (docs sites especially) a
section's children genuinely aren't in the page until expanded. `DEMO_APP_URL` (defaults to
`http://localhost:3100`) is just the **suggested default target** when nobody names a URL — the
agent can record/screenshot any reachable app or site it's told to.

`create_image_post` (`lib/tools/create-image-post.ts`) generates a static image post (`format:
"single"`, one slide) or a carousel (`format: "carousel"`, several slides swiped through in
order) of a feature on any http(s) URL — real Playwright screenshots, same nav-step vocabulary
as `record_demo` minus narration/zoom (meaningless for a still image). A slide can set
`highlight: <selector>` to draw a box around the specific element that matters (`ffmpeg drawbox`
— this build has no `drawtext`/font support, so captions are kept as plain accompanying text
next to the image rather than burned into it, which is also just how real social posts work).

`app/api/mcp/route.ts` is unauthenticated by default (frictionless for local dev), but it launches
a real browser and writes real files on every `record_demo`/`create_image_post` call. Set
`MCP_SECRET` to require a matching `x-mcp-secret` header — `pnpm setup:agent` picks it up
automatically and registers it on the MCP server manifest so TrueForge sends it on every call.

### Generic proxy / local mock

Set these in `.env.local` to point at a generic backend instead (SSE: `event:` + `data:`):

```
AGENT_API_URL=
AGENT_API_KEY=
AGENT_ID=
HARNESS_SECRET=
NEXT_PUBLIC_HARNESS_SECRET=
```

If `AGENT_API_KEY` is set, `HARNESS_SECRET` is required on the server and the matching `NEXT_PUBLIC_HARNESS_SECRET` is sent with each harness request.

Without any of the above, the local runtime still streams the same events so you can exercise the UI.
