import type { AgentEvent } from "./types";

export function encodeSse(event: AgentEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data ?? {})}\n\n`;
}

export function parseSseChunk(
  chunk: string,
  onEvent: (event: AgentEvent) => void
): string {
  const parts = chunk.split("\n\n");
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
