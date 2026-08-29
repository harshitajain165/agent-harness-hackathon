/**
 * In-memory only — restarting the Next.js server loses all sessions and pending
 * approvals. Fine for Phase 1 (local dev, single process); revisit if this needs
 * to survive restarts or run across multiple instances.
 */

type ConversationState = {
  sessionId: string;
  /** toolCallId -> threadId, populated when a tool.approval_required event arrives. */
  pendingApprovals: Map<string, string>;
  /**
   * toolCallId -> {name, arguments}, accumulated from model.message.delta chunks (TrueForge
   * streams tool-call name/args incrementally, OpenAI-style — the final model.message does not
   * repeat them). Survives across the chat -> confirm route boundary, since an approval's
   * eventual tool.response arrives in a separate turn/stream but needs the same cached name.
   */
  toolCalls: Map<string, { name: string; args: string }>;
};

const conversations = new Map<string, ConversationState>();

export function getConversation(conversationId: string): ConversationState | undefined {
  return conversations.get(conversationId);
}

export function setSession(conversationId: string, sessionId: string): ConversationState {
  const existing = conversations.get(conversationId);
  if (existing) {
    existing.sessionId = sessionId;
    return existing;
  }
  const state: ConversationState = {
    sessionId,
    pendingApprovals: new Map(),
    toolCalls: new Map(),
  };
  conversations.set(conversationId, state);
  return state;
}

export function rememberToolCall(conversationId: string, toolCallId: string, name: string, args: string) {
  getConversation(conversationId)?.toolCalls.set(toolCallId, { name, args });
}

export function rememberPendingApproval(conversationId: string, toolCallId: string, threadId: string) {
  getConversation(conversationId)?.pendingApprovals.set(toolCallId, threadId);
}

export function takePendingApproval(conversationId: string, toolCallId: string): string | undefined {
  const state = getConversation(conversationId);
  const threadId = state?.pendingApprovals.get(toolCallId);
  state?.pendingApprovals.delete(toolCallId);
  return threadId;
}
