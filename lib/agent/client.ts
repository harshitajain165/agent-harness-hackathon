import { consumeSseStream } from "./sse";
import type { AgentEvent, ChatMessageInput, ConfirmRequest } from "./types";

function harnessHeaders(): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.NEXT_PUBLIC_HARNESS_SECRET;
  if (secret) headers["x-harness-secret"] = secret;
  return headers;
}

async function readAgentStream(
  res: Response,
  onEvent: (event: AgentEvent) => void,
  fallback: string
) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as { error?: string }).error ?? `${fallback} (${res.status})`);
  }
  if (!res.body) throw new Error(`No response body from ${fallback.toLowerCase()}`);
  await consumeSseStream(res.body, onEvent);
}

export async function streamAgentTurn(input: {
  conversationId?: string;
  messages: ChatMessageInput[];
  signal?: AbortSignal;
  onEvent: (event: AgentEvent) => void;
}): Promise<void> {
  const res = await fetch("/api/agent/chat", {
    method: "POST",
    headers: harnessHeaders(),
    body: JSON.stringify({
      conversationId: input.conversationId,
      messages: input.messages,
    }),
    signal: input.signal,
  });

  await readAgentStream(res, input.onEvent, "Agent request failed");
}

export async function confirmAgentAction(input: {
  request: ConfirmRequest;
  signal?: AbortSignal;
  onEvent: (event: AgentEvent) => void;
}): Promise<void> {
  const res = await fetch("/api/agent/confirm", {
    method: "POST",
    headers: harnessHeaders(),
    body: JSON.stringify(input.request),
    signal: input.signal,
  });

  await readAgentStream(res, input.onEvent, "Confirm failed");
}
