import type { TrueForgeApi } from "@truefoundry/trueforge-sdk";
import { rememberPendingApproval, rememberToolCall, getConversation } from "./store";
import type { AgentEvent, ThinkingStep } from "../types";

type TurnStreamingEvent = TrueForgeApi.TurnStreamingEvent;

/**
 * Scratch state for a single turn stream (one call to runTrueForgeTurn/confirmTrueForgeTurn,
 * i.e. one assistant message in the UI). Not persisted across streams — `deltaByIndex` only
 * makes sense within one in-flight model message, and `emittedToolCalls` intentionally resets
 * per stream so a resumed-after-approval turn gets its own fresh `tool_call` chip (the UI's
 * `tool_result` reducer only resolves a chip that already exists on the *same* assistant
 * message, and the resume lands on a new one — see components/harness/agent-harness.tsx).
 */
export type StreamContext = {
  /** Keyed `threadId:index` — subagents run concurrently and each restarts its own
   *  tool-call index numbering, so an index alone collides across threads. */
  deltaByIndex: Map<string, { id?: string; name: string; args: string }>;
  emittedToolCalls: Set<string>;
  /** Subagent lanes, keyed by threadId, rendered as thinking steps. */
  subagents: Map<string, ThinkingStep>;
};

export function createStreamContext(): StreamContext {
  return { deltaByIndex: new Map(), emittedToolCalls: new Set(), subagents: new Map() };
}

/** Re-emit every lane whenever one changes; the UI renders the whole list. */
function emitSubagentLanes(ctx: StreamContext, emit: (event: AgentEvent) => void) {
  const steps = [...ctx.subagents.values()];
  if (steps.length === 0) return;
  const running = steps.filter((s) => s.status === "running").length;
  emit({
    type: "thinking",
    data: {
      label: running > 0 ? `Researching · ${running} in parallel` : "Research complete",
      steps,
    },
  });
}

function describeApproval(name: string | undefined, args: string | undefined) {
  const label = name ?? "this action";
  let detail = "";
  if (args) {
    try {
      detail = JSON.stringify(JSON.parse(args), null, 2);
    } catch {
      detail = args;
    }
  }
  return {
    title: `Approve ${label}`,
    message: detail ? `About to call ${label} with:\n${detail}` : `About to call ${label}.`,
  };
}

type RecordingResult = {
  feature: string;
  video: string;
  durationMs: number;
  clips: { id: string; label: string; startMs: number; endMs: number }[];
};

function parseRecordingResult(content: string): RecordingResult | null {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed?.video === "string" && typeof parsed?.durationMs === "number") {
      return parsed as RecordingResult;
    }
  } catch {
    // Not JSON (e.g. a tool error message) — not a recording result, fall through.
  }
  return null;
}

type ImagePostResult = {
  feature: string;
  format: "single" | "carousel";
  images: { src: string; caption: string }[];
};

function parseImagePostResult(content: string): ImagePostResult | null {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed?.images) && typeof parsed?.format === "string") {
      return parsed as ImagePostResult;
    }
  } catch {
    // Not JSON (e.g. a tool error message) — not an image post result, fall through.
  }
  return null;
}

function emitToolCallOnce(
  conversationId: string,
  toolCallId: string,
  ctx: StreamContext,
  emit: (event: AgentEvent) => void
) {
  if (ctx.emittedToolCalls.has(toolCallId)) return;
  ctx.emittedToolCalls.add(toolCallId);
  const cached = getConversation(conversationId)?.toolCalls.get(toolCallId);
  emit({
    type: "tool_call",
    data: {
      id: toolCallId,
      name: cached?.name ?? "tool",
      label: cached?.name ?? "tool",
      input: cached?.args,
    },
  });
}

/**
 * Maps one TrueForge turn-stream event to zero or more of the UI's own AgentEvent
 * vocabulary (`lib/agent/types.ts`). Phase 1 only covers what the stub tools exercise:
 * text streaming, a tool call/result round-trip, and one approval gate. Subagent
 * lanes (thread.*), mcp.*, and sandbox.* are intentionally not mapped yet.
 */
export function mapTurnEvent(
  conversationId: string,
  event: TurnStreamingEvent,
  emit: (event: AgentEvent) => void,
  ctx: StreamContext
) {
  switch (event.type) {
    case "turn.created": {
      emit({ type: "thinking", data: { label: "Thinking" } });
      return;
    }

    case "model.message.delta": {
      // Subagents stream their own reasoning on their own threads. Only the root
      // agent's text is the user-facing reply — emitting subagent prose here would
      // interleave several agents into a single stream of tokens.
      if (event.content && event.threadId === "main") {
        emit({ type: "token", data: { text: event.content } });
      }

      for (const call of event.toolCalls ?? []) {
        // Namespace by thread: with dynamic subagents several streams are live at once
        // and they commonly both start at index 0, which would otherwise overwrite or
        // concatenate one call's name and arguments into another's.
        const key = `${event.threadId}:${call.index}`;
        let entry = ctx.deltaByIndex.get(key);
        // A new id at an already-used index means a new tool call started there (the
        // model can make several sequential tool calls, each restarting index numbering) —
        // start a fresh accumulator rather than appending onto the previous call's text.
        if (call.id && entry?.id !== call.id) {
          entry = { id: call.id, name: "", args: "" };
          ctx.deltaByIndex.set(key, entry);
        }
        if (!entry) {
          entry = { name: "", args: "" };
          ctx.deltaByIndex.set(key, entry);
        }
        if (call.function?.name) entry.name += call.function.name;
        if (call.function?.arguments) entry.args += call.function.arguments;
        if (entry.id) rememberToolCall(conversationId, entry.id, entry.name, entry.args);
      }
      return;
    }

    case "model.message": {
      // Defensive fallback only — observed behavior is that TrueForge streams tool-call
      // name/arguments via model.message.delta and does not repeat them here. If some
      // provider ever does include them on the final message, this keeps the cache correct.
      for (const call of event.toolCalls ?? []) {
        rememberToolCall(conversationId, call.id, call.function.name, call.function.arguments);
      }
      return;
    }

    case "tool.response": {
      emitToolCallOnce(conversationId, event.toolCallId, ctx, emit);
      const cached = getConversation(conversationId)?.toolCalls.get(event.toolCallId);

      // record_demo/create_image_post return structured data (JSON) inside the text content —
      // see their tool files and app/api/mcp/route.ts for why it has to be JSON-in-text rather
      // than a separate content part. Surface them as real artifacts.
      const recording = cached?.name === "record_demo" ? parseRecordingResult(event.content) : null;
      const imagePost = cached?.name === "create_image_post" ? parseImagePostResult(event.content) : null;

      emit({
        type: "tool_result",
        data: {
          id: event.toolCallId,
          name: cached?.name ?? "tool",
          status: "done",
          detail: recording
            ? `Recorded a demo of "${recording.feature}"`
            : imagePost
              ? `Created a ${imagePost.format} image post for "${imagePost.feature}"`
              : event.content,
        },
      });

      if (recording) {
        emit({
          type: "artifact",
          data: {
            kind: "video",
            title: `Demo — ${recording.feature}`,
            durationMs: recording.durationMs,
            clips: recording.clips,
            src: recording.video,
          },
        });
      }

      if (imagePost) {
        emit({
          type: "artifact",
          data: {
            kind: "image_post",
            title: `${imagePost.format === "carousel" ? "Carousel" : "Image post"} — ${imagePost.feature}`,
            format: imagePost.format,
            images: imagePost.images,
          },
        });
      }
      return;
    }

    case "thread.created": {
      ctx.subagents.set(event.threadId, {
        id: event.threadId,
        label: event.title || "Subagent",
        detail: event.agentInfo?.input?.slice(0, 140),
        status: "running",
      });
      emitSubagentLanes(ctx, emit);
      return;
    }

    case "thread.done": {
      const lane = ctx.subagents.get(event.threadId);
      if (lane) {
        lane.status = "done";
        if (event.state?.status === "error") lane.detail = "failed";
        emitSubagentLanes(ctx, emit);
      }
      return;
    }

    case "tool.approval_required": {
      // Phase 1: handle the first pending call. Our two stub tools only ever
      // produce one approval-gated call at a time, so this is not a real limitation yet.
      const pending = event.toolCalls[0];
      if (!pending) return;
      emitToolCallOnce(conversationId, pending.id, ctx, emit);
      rememberPendingApproval(conversationId, pending.id, event.threadId);
      const cached = getConversation(conversationId)?.toolCalls.get(pending.id);
      const { title, message } = describeApproval(cached?.name, cached?.args);
      emit({
        type: "confirmation_required",
        data: { id: pending.id, title, message },
      });
      return;
    }

    case "turn.done": {
      if (event.state.status === "error") {
        emit({ type: "error", data: { message: event.state.message } });
      }
      // Always emit done: the UI's "done" just closes this SSE call. If the turn
      // is actually paused pending approval, the approval card is already showing
      // from the tool.approval_required event above.
      emit({ type: "done", data: { conversationId } });
      return;
    }

    default:
      return;
  }
}
