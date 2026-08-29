import { encodeSse } from "./sse";
import type {
  AgentEvent,
  ApprovalRequest,
  Artifact,
  ChatRequest,
  ConfirmRequest,
  DiffFile,
  ThinkingStep,
  ToolCall,
} from "./types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function streamText(
  text: string,
  emit: (event: AgentEvent) => void,
  delay = 18
) {
  const words = text.split(/(\s+)/);
  for (const word of words) {
    if (!word) continue;
    emit({ type: "token", data: { text: word } });
    await sleep(delay);
  }
}

function lastUserText(req: ChatRequest): string {
  return [...req.messages].reverse().find((m) => m.role === "user")?.content.trim() ?? "";
}

function intentOf(text: string) {
  const q = text.toLowerCase();
  if (/\b(video|footage|studio)\b/.test(q)) return "video";
  if (/\b(approv|confirm|sign off|archive|delete|off-?board)\b/.test(q)) return "approval";
  if (/\b(diff|edit|change|propose|rewrite|tighten)\b/.test(q)) return "diff";
  if (/\b(table|records?|list|show|grid|vendors?|suppliers?)\b/.test(q)) return "records";
  if (/\b(tool|run|call|search|look up|find|draft function|code)\b/.test(q)) return "tools";
  return "chat";
}

function thinkingFor(intent: ReturnType<typeof intentOf>, text: string): ThinkingStep[] {
  const clip = text.length > 72 ? `${text.slice(0, 72).trimEnd()}…` : text;
  const shared: ThinkingStep[] = [
    { id: "read", label: "Reading the request", detail: clip, status: "done" },
    { id: "plan", label: "Planning the next steps", status: "done" },
  ];
  if (intent === "video") {
    return [...shared, { id: "cut", label: "Assembling a timeline", status: "done" }];
  }
  if (intent === "records") {
    return [...shared, { id: "query", label: "Querying records", status: "done" }];
  }
  if (intent === "diff") {
    return [...shared, { id: "draft", label: "Drafting a reviewable change", status: "done" }];
  }
  if (intent === "approval") {
    return [...shared, { id: "gate", label: "Preparing a confirmation", status: "done" }];
  }
  if (intent === "tools") {
    return [...shared, { id: "tools", label: "Selecting tools", status: "done" }];
  }
  return [...shared, { id: "write", label: "Writing a reply", status: "done" }];
}

const SAMPLE_VIDEO: Artifact = {
  kind: "video",
  title: "Product walkthrough",
  durationMs: 48_000,
  clips: [
    { id: "intro", label: "Intro", startMs: 0, endMs: 8_000 },
    { id: "demo", label: "Demo", startMs: 8_000, endMs: 32_000 },
    { id: "outro", label: "Outro", startMs: 32_000, endMs: 48_000 },
  ],
};

const SAMPLE_RECORDS: Artifact = {
  kind: "records",
  title: "Open items",
  columns: ["Name", "Owner", "Status", "Updated"],
  rows: [
    { Name: "Inbound welcome flow", Owner: "Maya", Status: "Live", Updated: "Today" },
    { Name: "Billing recovery prompt", Owner: "Chris", Status: "Draft", Updated: "Yesterday" },
    { Name: "After-hours transfer", Owner: "Priya", Status: "Review", Updated: "Mon" },
    { Name: "Spanish fallback", Owner: "Alex", Status: "Live", Updated: "Fri" },
  ],
};

const SAMPLE_DIFF: DiffFile[] = [
  {
    path: "agent/prompt.md",
    added: 6,
    removed: 2,
    lines: [
      { text: "You are a helpful voice agent.", tone: "ctx" },
      { text: "Keep replies under 20 seconds.", tone: "del" },
      { text: "Keep replies under 12 seconds.", tone: "add" },
      { text: "Confirm the next action before hanging up.", tone: "add" },
    ],
  },
  {
    path: "agent/tools.json",
    added: 4,
    removed: 0,
    lines: [
      { text: '{ "name": "lookup_order" }', tone: "ctx" },
      { text: '{ "name": "reschedule_visit" }', tone: "add" },
    ],
  },
];

async function emitThinking(
  emit: (event: AgentEvent) => void,
  steps: ThinkingStep[]
) {
  emit({ type: "thinking", data: { label: "Thinking", steps: [] } });
  const visible: ThinkingStep[] = [];
  for (const step of steps) {
    visible.push({ ...step, status: "running" });
    emit({ type: "thinking", data: { label: "Thinking", steps: [...visible] } });
    await sleep(420);
    visible[visible.length - 1] = { ...step, status: "done" };
    emit({ type: "thinking", data: { label: "Thought", steps: [...visible] } });
  }
}

async function emitTool(
  emit: (event: AgentEvent) => void,
  call: ToolCall,
  result: { detail: string; diff?: DiffFile[] }
) {
  emit({ type: "tool_call", data: call });
  await sleep(520);
  emit({
    type: "tool_result",
    data: {
      id: call.id,
      name: call.name,
      status: "done",
      detail: result.detail,
      diff: result.diff,
    },
  });
}

async function runLocalAgent(
  req: ChatRequest,
  emit: (event: AgentEvent) => void
) {
  const text = lastUserText(req);
  const intent = intentOf(text);
  await emitThinking(emit, thinkingFor(intent, text));

  if (intent === "video") {
    await emitTool(
      emit,
      { id: "cut-1", name: "assemble_timeline", label: "Assemble timeline", input: text || "create video" },
      { detail: "3 clips" }
    );
    emit({ type: "artifact", data: SAMPLE_VIDEO });
    await streamText("Draft is in the editor on the right. Play it or click a clip to jump.", emit);
    emit({ type: "done" });
    return;
  }

  if (intent === "records") {
    await emitTool(
      emit,
      { id: "list-1", name: "list_records", label: "List records", input: "status:open" },
      { detail: "Returned 4 rows" }
    );
    emit({ type: "artifact", data: SAMPLE_RECORDS });
    await streamText(
      "Here are the open items. Ask me to filter, sort, or propose a change and I’ll update the table.",
      emit
    );
    emit({ type: "done" });
    return;
  }

  if (intent === "diff") {
    await emitTool(
      emit,
      { id: "draft-1", name: "draft_edit", label: "Draft edit", input: "agent/prompt.md" },
      { detail: "Staged 2 files", diff: SAMPLE_DIFF }
    );
    emit({ type: "artifact", data: { kind: "diff", title: "Proposed edits", files: SAMPLE_DIFF } });
    await streamText(
      "I staged a reviewable draft. Nothing is applied yet — approve the lines that look right.",
      emit
    );
    emit({ type: "done" });
    return;
  }

  if (intent === "approval") {
    const approval: ApprovalRequest = {
      id: crypto.randomUUID(),
      title: "Confirm this action",
      message: "I need a few details before I apply this change.",
      questions: [
        {
          id: "scope",
          prompt: "What should I apply?",
          type: "single",
          options: ["This conversation only", "The live agent", "Save as a draft"],
        },
        {
          id: "notify",
          prompt: "Who should be notified?",
          type: "multi",
          options: ["Owner", "On-call", "No one"],
        },
      ],
    };
    emit({ type: "confirmation_required", data: approval });
    await streamText(
      "Before I continue, confirm the scope. Single-choice answers advance on their own; multi-select waits for continue.",
      emit
    );
    emit({ type: "done" });
    return;
  }

  if (intent === "tools") {
    await emitTool(
      emit,
      { id: "search-1", name: "search", label: "Search", input: text },
      { detail: "3 sources" }
    );
    await emitTool(
      emit,
      { id: "write-1", name: "write", label: "Write", input: "lib/handler.ts" },
      {
        detail: "Wrote 48 lines",
        diff: [
          {
            path: "lib/handler.ts",
            added: 48,
            removed: 3,
            lines: [
              { text: "export async function handle(event) {", tone: "ctx" },
              { text: "  return next(event)", tone: "del" },
              { text: "  const result = await run(event)", tone: "add" },
              { text: "  return result", tone: "add" },
            ],
          },
        ],
      }
    );
    await streamText(
      "I ran the tools and staged the work. Hover a file chip to preview the diff — nothing runs until you say so.",
      emit
    );
    emit({ type: "done" });
    return;
  }

  await streamText(
    text
      ? `I can help with that. Ask me to create a video, list records, propose edits, run a tool, or confirm a change — I’ll stream the reply and keep artifacts in this thread.`
      : "What should we work on?",
    emit
  );
  emit({ type: "done" });
}

async function proxyAgent(req: ChatRequest, emit: (event: AgentEvent) => void) {
  const endpoint = process.env.AGENT_API_URL;
  if (!endpoint) throw new Error("AGENT_API_URL is not set");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (process.env.AGENT_API_KEY) {
    headers.Authorization = `Bearer ${process.env.AGENT_API_KEY}`;
  }
  if (process.env.AGENT_ID) {
    headers["X-Agent-Id"] = process.env.AGENT_ID;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...req,
      agentId: process.env.AGENT_ID,
    }),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `Agent API returned ${res.status}`);
  }

  if (!res.body) throw new Error("Agent API returned no body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const { parseSseChunk } = await import("./sse");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer = parseSseChunk(buffer + decoder.decode(value, { stream: true }), emit);
  }
  if (buffer.trim()) parseSseChunk(buffer + "\n\n", emit);
}

export async function runAgentTurn(
  req: ChatRequest,
  emit: (event: AgentEvent) => void
) {
  if (process.env.AGENT_API_URL) {
    await proxyAgent(req, emit);
    return;
  }
  await runLocalAgent(req, emit);
}

export async function confirmAgentTurn(
  req: ConfirmRequest,
  emit: (event: AgentEvent) => void
) {
  if (process.env.AGENT_API_URL) {
    const endpoint = new URL(process.env.AGENT_API_URL);
    endpoint.pathname = endpoint.pathname.replace(/\/?$/, "/confirm");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };
    if (process.env.AGENT_API_KEY) {
      headers.Authorization = `Bearer ${process.env.AGENT_API_KEY}`;
    }
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`Confirm failed (${res.status})`);
    return;
  }

  await emitThinking(emit, [
    { id: "apply", label: req.accepted ? "Applying the change" : "Discarding the change", status: "done" },
  ]);
  await streamText(
    req.accepted
      ? "Done. I applied the change and left a note on the draft."
      : "Okay — I left the draft untouched.",
    emit
  );
  emit({ type: "done" });
}

export function toSseStream(
  run: (emit: (event: AgentEvent) => void) => Promise<void>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const emit = (event: AgentEvent) => {
        controller.enqueue(encoder.encode(encodeSse(event)));
      };
      try {
        await run(emit);
      } catch (error) {
        emit({
          type: "error",
          data: { message: error instanceof Error ? error.message : "Agent failed" },
        });
        emit({ type: "done" });
      } finally {
        controller.close();
      }
    },
  });
}
