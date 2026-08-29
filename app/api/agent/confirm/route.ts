import { confirmAgentTurn, toSseStream } from "@/lib/agent/runtime";
import type { ConfirmRequest } from "@/lib/agent/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as ConfirmRequest;
  if (!body.conversationId || !body.confirmationId) {
    return Response.json({ error: "conversationId and confirmationId are required" }, { status: 400 });
  }

  const stream = toSseStream((emit) => confirmAgentTurn(body, emit));
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
