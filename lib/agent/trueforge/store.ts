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
// Dedupes concurrent first-turns for the same conversation — without this, two overlapping
// calls could each see no existing session, each create one, and only the last write wins,
// splitting the conversation across two TrueForge sessions.
const pendingSessionCreates = new Map<string, Promise<string>>();

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

/**
 * Returns the conversation's session id, creating one via `create()` if none exists yet.
 * Concurrent callers for the same conversationId share the same in-flight creation instead
 * of racing to create separate sessions.
 */
export async function getOrCreateSession(
  conversationId: string,
  create: () => Promise<string>
): Promise<string> {
  const existing = getConversation(conversationId);
  if (existing) return existing.sessionId;

  let creating = pendingSessionCreates.get(conversationId);
  if (!creating) {
    creating = create();
    pendingSessionCreates.set(conversationId, creating);
    creating.finally(() => pendingSessionCreates.delete(conversationId));
  }

  const sessionId = await creating;
  setSession(conversationId, sessionId);
  return sessionId;
}

export function rememberToolCall(conversationId: string, toolCallId: string, name: string, args: string) {
  getConversation(conversationId)?.toolCalls.set(toolCallId, { name, args });
}

export function rememberPendingApproval(conversationId: string, toolCallId: string, threadId: string) {
  getConversation(conversationId)?.pendingApprovals.set(toolCallId, threadId);
}

export function getPendingApproval(conversationId: string, toolCallId: string): string | undefined {
  return getConversation(conversationId)?.pendingApprovals.get(toolCallId);
}

export function clearPendingApproval(conversationId: string, toolCallId: string) {
  getConversation(conversationId)?.pendingApprovals.delete(toolCallId);
}
