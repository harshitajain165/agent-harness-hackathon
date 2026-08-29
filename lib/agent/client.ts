import { parseSseChunk } from "./sse";
import type { AgentEvent, ChatMessageInput, ConfirmRequest } from "./types";

export async function streamAgentTurn(input: {
  conversationId?: string;
  messages: ChatMessageInput[];
  signal?: AbortSignal;
  onEvent: (event: AgentEvent) => void;
}): Promise<void> {
  const res = await fetch("/api/agent/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId: input.conversationId,
      messages: input.messages,
    }),
    signal: input.signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(
      (err as { error?: string }).error ?? `Agent request failed (${res.status})`
    );
  }

  if (!res.body) throw new Error("No response body from agent");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer = parseSseChunk(buffer + decoder.decode(value, { stream: true }), input.onEvent);
  }

  if (buffer.trim()) parseSseChunk(buffer + "\n\n", input.onEvent);
}

export async function confirmAgentAction(input: {
  request: ConfirmRequest;
  signal?: AbortSignal;
  onEvent: (event: AgentEvent) => void;
}): Promise<void> {
  const res = await fetch("/api/agent/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input.request),
    signal: input.signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(
      (err as { error?: string }).error ?? `Confirm failed (${res.status})`
    );
  }

  if (!res.body) throw new Error("No response body from confirm");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer = parseSseChunk(buffer + decoder.decode(value, { stream: true }), input.onEvent);
  }

  if (buffer.trim()) parseSseChunk(buffer + "\n\n", input.onEvent);
}
