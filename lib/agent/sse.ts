import type { AgentEvent } from "./types";

export function encodeSse(event: AgentEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data ?? {})}\n\n`;
}

function normalizeNewlines(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function parseSseChunk(
  chunk: string,
  onEvent: (event: AgentEvent) => void
): string {
  const parts = normalizeNewlines(chunk).split("\n\n");
  const remainder = parts.pop() ?? "";

  for (const part of parts) {
    if (!part.trim()) continue;
    let type = "";
    let data = "";
    for (const line of part.split("\n")) {
      if (line.startsWith("event: ")) type = line.slice(7).trim();
      if (line.startsWith("data: ")) data = line.slice(6);
    }
    if (!type) continue;
    try {
      onEvent({ type, data: data ? JSON.parse(data) : {} } as AgentEvent);
    } catch {
      onEvent({ type, data } as AgentEvent);
    }
  }

  return remainder;
}

export async function consumeSseStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: AgentEvent) => void
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer = parseSseChunk(buffer + decoder.decode(value, { stream: true }), onEvent);
  }

  buffer += decoder.decode();
  if (buffer.trim()) parseSseChunk(buffer + "\n\n", onEvent);
}
