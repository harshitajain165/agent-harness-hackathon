import { runAgentTurn, toSseStream } from "@/lib/agent/runtime";
import type { ChatRequest } from "@/lib/agent/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequest;
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: "messages are required" }, { status: 400 });
  }

  const stream = toSseStream((emit) => runAgentTurn(body, emit));
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
