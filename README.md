# Agent harness

Chat UI for your agent. Tokens and components are defined in `app/globals.css` and `@/components/ui`.

## Run

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

`record_demo` (`lib/tools/record-demo.ts`) is a **real** recording: headless Playwright drives a
fixed interaction (open Settings → switch agent preset → close) against a real local app and
writes an actual `.webm` to `public/artifacts/`, which streams into the UI's video pane for real.
Set `DEMO_APP_URL` and have that app running (defaults to `http://localhost:3100`) — no OS
screen-recording permission or ffmpeg system dependency needed (Playwright's own `recordVideo`,
no cursor). The interaction script is currently hardcoded, not agent-authored — a documented
simplification, see the comment in `lib/tools/record-demo.ts`.

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
