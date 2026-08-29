import { trueForgeClient } from "./client";
import { createStreamContext, mapTurnEvent } from "./map-event";
import { getConversation, setSession } from "./store";
import { AGENT_NAME } from "@/harness/agent-spec";
import type { AgentEvent, ChatRequest, ConfirmRequest } from "../types";

function lastUserText(req: ChatRequest): string {
  return [...req.messages].reverse().find((m) => m.role === "user")?.content.trim() ?? "";
}

async function ensureSession(conversationId: string): Promise<string> {
  const existing = getConversation(conversationId);
  if (existing) return existing.sessionId;

  const client = trueForgeClient();
  const { data: session } = await client.sessions.create({ agent: { name: AGENT_NAME } });
  setSession(conversationId, session.id);
  return session.id;
}

export async function runTrueForgeTurn(req: ChatRequest, emit: (event: AgentEvent) => void) {
  if (!req.conversationId) throw new Error("conversationId is required in TrueForge mode");
  const conversationId = req.conversationId;
  const text = lastUserText(req);
  if (!text) throw new Error("No user message to send");

  const client = trueForgeClient();
  const sessionId = await ensureSession(conversationId);

  const stream = await client.sessions.createTurnStream(sessionId, {
    input: [{ type: "user.message", content: text }],
  });

  const ctx = createStreamContext();
  for await (const event of stream) {
    mapTurnEvent(conversationId, event, emit, ctx);
  }
}

export async function confirmTrueForgeTurn(req: ConfirmRequest, emit: (event: AgentEvent) => void) {
  const { conversationId, confirmationId, accepted } = req;
  const state = getConversation(conversationId);
  if (!state) throw new Error(`No TrueForge session for conversation ${conversationId}`);

  const threadId = state.pendingApprovals.get(confirmationId);
  state.pendingApprovals.delete(confirmationId);
  if (!threadId) throw new Error(`No pending approval ${confirmationId} for this conversation`);

  const client = trueForgeClient();
  const stream = await client.sessions.createTurnStream(state.sessionId, {
    input: [
      {
        type: "user.tool_approval",
        threadId,
        toolCallId: confirmationId,
        approval: accepted ? { status: "allow" } : { status: "deny" },
      },
    ],
  });

  const ctx = createStreamContext();
  for await (const event of stream) {
    mapTurnEvent(conversationId, event, emit, ctx);
  }
}
