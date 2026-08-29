"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon, PlusIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Text } from "@/components/ui/text";
import { confirmAgentAction, streamAgentTurn } from "@/lib/agent/client";
import type {
  AgentEvent,
  ApprovalRequest,
  Artifact,
  ChatMessageInput,
  ThinkingStep,
  ToolCall,
  ToolResult,
} from "@/lib/agent/types";
import { ApprovalCard } from "./approval-card";
import { DiffTable } from "./diff-table";
import { PromptBar } from "./prompt-bar";
import { RecordsTable } from "./records-table";
import { SidebarNav } from "./sidebar-nav";
import { StreamingText, UserBubble } from "./streaming-text";
import { ThinkingState } from "./thinking-state";
import { ToolChips } from "./tool-chips";
import { VideoEditor } from "./video-editor";

type AssistantBody = {
  thinkingLabel?: string;
  thinkingSteps?: ThinkingStep[];
  thinking: boolean;
  text: string;
  streaming: boolean;
  error?: string;
  tools: { call: ToolCall; result?: ToolResult }[];
  approval?: ApprovalRequest;
  approvalState?: "accepted" | "rejected";
  artifacts: Artifact[];
};

type UserMsg = { id: string; role: "user"; text: string };
type AssistantMsg = { id: string; role: "assistant"; body: AssistantBody };
type ThreadMessage = UserMsg | AssistantMsg;

type Conversation = {
  id: string;
  title: string | null;
  messages: ThreadMessage[];
};

const SUGGESTIONS = [
  { label: "Create video", prompt: "create video" },
  { label: "Show me a table of open items", prompt: "Show me a table of open items" },
  { label: "Propose edits I should review", prompt: "Propose edits I should review" },
  { label: "Run the tools for this request", prompt: "Search and draft a handler for this request" },
  { label: "Ask me to approve a change", prompt: "I need you to confirm before applying this change" },
];

const PANE_KINDS = new Set<Artifact["kind"]>(["records", "video"]);

function emptyAssistant(): AssistantBody {
  return {
    thinking: true,
    thinkingLabel: "Thinking",
    text: "",
    streaming: true,
    tools: [],
    artifacts: [],
  };
}

function applyEvent(body: AssistantBody, event: AgentEvent): AssistantBody {
  switch (event.type) {
    case "thinking":
      return {
        ...body,
        thinking: true,
        thinkingLabel: event.data.label,
        thinkingSteps: event.data.steps,
      };
    case "token":
      return {
        ...body,
        thinking: false,
        streaming: true,
        text: body.text + event.data.text,
      };
    case "tool_call":
      return {
        ...body,
        thinking: false,
        tools: [...body.tools, { call: event.data }],
      };
    case "tool_result":
      return {
        ...body,
        tools: body.tools.map((tool) =>
          tool.call.id === event.data.id ? { ...tool, result: event.data } : tool
        ),
      };
    case "confirmation_required":
      return { ...body, thinking: false, approval: event.data };
    case "artifact":
      return { ...body, artifacts: [...body.artifacts, event.data] };
    case "error":
      return { ...body, thinking: false, streaming: false, error: event.data.message };
    case "done":
      return { ...body, thinking: false, streaming: false };
    default:
      return body;
  }
}

function AssistantTurn({
  message,
  onResolve,
}: {
  message: AssistantMsg;
  onResolve: (messageId: string, accepted: boolean, answers: Record<string, string | string[]>) => void;
}) {
  const { body } = message;
  const records = body.artifacts.find((item): item is Extract<Artifact, { kind: "records" }> => item.kind === "records");
  const video = body.artifacts.find((item): item is Extract<Artifact, { kind: "video" }> => item.kind === "video");
  const diffs = body.artifacts.filter((item): item is Extract<Artifact, { kind: "diff" }> => item.kind === "diff");

  return (
    <article className="flex min-w-0 flex-col gap-4">
      {(body.thinking || (body.thinkingSteps && body.thinkingSteps.length > 0)) && (
        <ThinkingState
          label={body.thinkingLabel ?? "Thinking"}
          steps={body.thinkingSteps}
          working={body.thinking}
        />
      )}
      {body.tools.length > 0 ? <ToolChips tools={body.tools} /> : null}
      <StreamingText text={body.text} streaming={body.streaming} error={body.error} />
      {diffs.map((artifact) => (
        <DiffTable key={artifact.title} artifact={artifact} />
      ))}
      {body.approval ? (
        <ApprovalCard
          approval={body.approval}
          resolved={body.approvalState}
          onSubmit={(accepted, answers) => onResolve(message.id, accepted, answers)}
        />
      ) : null}
      {records && !body.streaming ? (
        <div className="lg:hidden">
          <RecordsTable artifact={records} />
        </div>
      ) : null}
      {video && !body.streaming ? (
        <div className="h-[420px] overflow-hidden rounded-[14px] bg-neutral-0 shadow-sm lg:hidden">
          <VideoEditor artifact={video} />
        </div>
      ) : null}
    </article>
  );
}

export function AgentHarness() {
  const [chats, setChats] = useState<Conversation[]>([
    { id: "home", title: null, messages: [] },
  ]);
  const [activeId, setActiveId] = useState("home");
  const [collapsed, setCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [closedPane, setClosedPane] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [composerH, setComposerH] = useState(88);

  const chat = chats.find((item) => item.id === activeId) ?? chats[0];
  const active = chat.messages.length > 0;

  const paneArtifact = [...chat.messages]
    .reverse()
    .flatMap((message) => (message.role === "assistant" ? message.body.artifacts : []))
    .find((artifact) => PANE_KINDS.has(artifact.kind));
  const showPane = Boolean(paneArtifact) && closedPane !== chat.id;

  const patchChat = (id: string, updater: (current: Conversation) => Conversation) => {
    setChats((current) => current.map((item) => (item.id === id ? updater(item) : item)));
  };

  const applyToAssistant = (
    conversationId: string,
    messageId: string,
    event: AgentEvent
  ) => {
    patchChat(conversationId, (current) => ({
      ...current,
      messages: current.messages.map((message) =>
        message.role === "assistant" && message.id === messageId
          ? { ...message, body: applyEvent(message.body, event) }
          : message
      ),
    }));
  };

  const send = async (text: string) => {
    const conversationId = chat.id;
    const userMsg: UserMsg = { id: crypto.randomUUID(), role: "user", text };
    const assistantMsg: AssistantMsg = {
      id: crypto.randomUUID(),
      role: "assistant",
      body: emptyAssistant(),
    };

    patchChat(conversationId, (current) => ({
      ...current,
      title: current.title ?? (text.length > 32 ? `${text.slice(0, 32).trimEnd()}…` : text),
      messages: [...current.messages, userMsg, assistantMsg],
    }));
    setClosedPane(null);
    setBusy(true);

    const history: ChatMessageInput[] = [];
    for (const message of chat.messages) {
      if (message.role === "user") {
        history.push({ role: "user", content: message.text });
      } else if (message.body.text) {
        history.push({ role: "assistant", content: message.body.text });
      }
    }
    history.push({ role: "user", content: text });

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamAgentTurn({
        conversationId,
        messages: history,
        signal: controller.signal,
        onEvent: (event) => applyToAssistant(conversationId, assistantMsg.id, event),
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      applyToAssistant(conversationId, assistantMsg.id, {
        type: "error",
        data: { message: error instanceof Error ? error.message : "Agent failed" },
      });
    } finally {
      setBusy(false);
    }
  };

  const resolveApproval = async (
    messageId: string,
    accepted: boolean,
    answers: Record<string, string | string[]>
  ) => {
    const conversationId = chat.id;
    patchChat(conversationId, (current) => ({
      ...current,
      messages: current.messages.map((message) =>
        message.role === "assistant" && message.id === messageId
          ? { ...message, body: { ...message.body, approvalState: accepted ? "accepted" : "rejected" } }
          : message
      ),
    }));

    const follow: AssistantMsg = {
      id: crypto.randomUUID(),
      role: "assistant",
      body: emptyAssistant(),
    };
    patchChat(conversationId, (current) => ({
      ...current,
      messages: [...current.messages, follow],
    }));
    setBusy(true);

    try {
      await confirmAgentAction({
        request: {
          conversationId,
          confirmationId:
            chat.messages.find((message) => message.id === messageId && message.role === "assistant")
              ?.role === "assistant"
              ? (chat.messages.find((message) => message.id === messageId) as AssistantMsg).body
                  .approval?.id ?? messageId
              : messageId,
          accepted,
          answers,
        },
        onEvent: (event) => applyToAssistant(conversationId, follow.id, event),
      });
    } catch (error) {
      applyToAssistant(conversationId, follow.id, {
        type: "error",
        data: { message: error instanceof Error ? error.message : "Confirm failed" },
      });
    } finally {
      setBusy(false);
    }
  };

  const newChat = () => {
    const next = { id: crypto.randomUUID(), title: null, messages: [] };
    setChats((current) => [...current, next]);
    setActiveId(next.id);
  };

  const closeChat = (id: string) => {
    const remaining = chats.filter((item) => item.id !== id);
    if (remaining.length === 0) {
      const next = { id: crypto.randomUUID(), title: null, messages: [] };
      setChats([next]);
      setActiveId(next.id);
      return;
    }
    setChats(remaining);
    if (id === activeId) setActiveId(remaining[remaining.length - 1].id);
  };

  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    const measure = () => setComposerH(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [active, activeId]);

  return (
    <main className="flex h-[100dvh] bg-neutral-100 text-fg">
      <SidebarNav
        chats={chats}
        activeId={activeId}
        onNewChat={newChat}
        onPick={setActiveId}
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
      />

      <div className="flex min-w-0 flex-1 gap-2.5 p-2.5">
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[14px] bg-neutral-0 shadow-sm">
          <div className="flex h-11 shrink-0 items-center gap-1 overflow-x-auto border-b border-border-default px-2">
            {chats.map((item) => (
              <div
                key={item.id}
                className={`group/tab flex h-8 w-36 shrink-0 items-center gap-0.5 rounded-[8px] pl-2.5 pr-0.5 text-sm ${
                  item.id === activeId
                    ? "bg-neutral-100 text-fg"
                    : "text-fg-secondary hover:bg-neutral-50 hover:text-fg"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className="min-w-0 flex-1 truncate text-left"
                >
                  {item.title ?? "New chat"}
                </button>
                <IconButton
                  aria-label="Close tab"
                  variant="transparent"
                  size="sm"
                  onClick={() => closeChat(item.id)}
                >
                  <CloseIcon className="size-3.5" />
                </IconButton>
              </div>
            ))}
            <IconButton aria-label="New chat" variant="transparent" size="sm" onClick={newChat}>
              <PlusIcon className="size-4" />
            </IconButton>
          </div>

          {active ? (
            <div className="relative flex min-h-0 flex-1 flex-col">
              <ScrollArea className="min-h-0 flex-1" scrollFade>
                <div
                  className="mx-auto flex w-full max-w-[720px] flex-col gap-8 px-4 pt-8 sm:px-8"
                  style={{ paddingBottom: composerH + 16 }}
                >
                  {chat.messages.map((message) =>
                    message.role === "user" ? (
                      <UserBubble key={message.id} text={message.text} />
                    ) : (
                      <AssistantTurn
                        key={message.id}
                        message={message}
                        onResolve={resolveApproval}
                      />
                    )
                  )}
                </div>
              </ScrollArea>
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0"
                style={{
                  height: composerH + 24,
                  background: "linear-gradient(to top, var(--neutral-0) 64%, transparent)",
                }}
              />
              <div ref={composerRef} className="absolute inset-x-0 bottom-0 px-4 pb-5 sm:px-8">
                <div className="mx-auto max-w-[720px]">
                  <PromptBar placeholder="Reply" disabled={busy} onSend={send} />
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex min-h-0 w-full max-w-[720px] flex-1 flex-col justify-center px-4 py-10 sm:px-8">
              <h1 className="font-heading text-2xl font-medium tracking-[-0.02em] text-fg">
                <span className="block text-fg-tertiary">Hello</span>
                <span className="block">What can I help you with?</span>
              </h1>
              <div className="mt-7">
                <PromptBar autoFocus placeholder="Ask anything" disabled={busy} onSend={send} />
              </div>
              <div className="mt-6 flex flex-col">
                {SUGGESTIONS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => send(item.prompt)}
                    className="-mx-2 rounded-[10px] px-2 py-2.5 text-left text-sm text-fg transition-colors duration-150 hover:bg-neutral-100"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {showPane && paneArtifact ? (
          <aside
            className={`hidden shrink-0 flex-col overflow-hidden rounded-[14px] bg-neutral-0 shadow-sm lg:flex ${
              paneArtifact.kind === "video" ? "w-[min(520px,42vw)]" : "w-[360px]"
            }`}
          >
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-border-default px-3">
              <Text size="sm" weight="medium">
                {paneArtifact.title}
              </Text>
              <IconButton
                aria-label="Close pane"
                variant="transparent"
                size="sm"
                onClick={() => setClosedPane(chat.id)}
              >
                <CloseIcon className="size-3.5" />
              </IconButton>
            </div>
            <div className={paneArtifact.kind === "video" ? "min-h-0 flex-1" : "min-h-0 flex-1 overflow-y-auto p-3"}>
              {paneArtifact.kind === "records" ? <RecordsTable artifact={paneArtifact} /> : null}
              {paneArtifact.kind === "video" ? <VideoEditor artifact={paneArtifact} /> : null}
            </div>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
