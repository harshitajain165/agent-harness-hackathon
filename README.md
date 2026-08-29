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

Set these in `.env.local` to point at your backend (SSE: `event:` + `data:`):

```
AGENT_API_URL=
AGENT_API_KEY=
AGENT_ID=
HARNESS_SECRET=
NEXT_PUBLIC_HARNESS_SECRET=
```

If `AGENT_API_KEY` is set, `HARNESS_SECRET` is required on the server and the matching `NEXT_PUBLIC_HARNESS_SECRET` is sent with each harness request.

Events the UI renders: `thinking`, `token`, `tool_call`, `tool_result`, `confirmation_required`, `artifact`, `error`, `done`. Artifact kinds: `records`, `diff`, `video`.

Without `AGENT_API_URL`, the local runtime still streams those events so you can exercise the UI.
