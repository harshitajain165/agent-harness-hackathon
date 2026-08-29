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
  ThinkingVariant,
  ToolCall,
  ToolResult,
} from "@/lib/agent/types";
import { ApprovalCard } from "./approval-card";
import { DiffTable } from "./diff-table";
import { PromptBar } from "./prompt-bar";
import { RecordsTable } from "./records-table";
import { SidebarNav, type SidebarTab } from "./sidebar-nav";
import { toast } from "@/components/ui/toast";
import { FollowUpList, StreamingText, UserBubble, VIDEO_FOLLOW_UPS, type FollowUp } from "./streaming-text";
import { liveSearchFromTurn, ThinkingState } from "./thinking-state";
import { ToolChips } from "./tool-chips";
import { VideoCreating } from "./creation-orb";
import { CatalogPage } from "./catalog-page";
import { HomeDashboard } from "./home-dashboard";
import { SuggestionRail } from "./suggestion-rail";
import { ChannelPreviews } from "./channel-previews";
import { VideoEditor } from "./video-editor";

type AssistantBody = {
  thinkingLabel?: string;
  thinkingVariant?: ThinkingVariant;
  thinkingQuery?: string;
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

const PANE_KINDS = new Set<Artifact["kind"]>(["records", "video"]);
const VIDEO_INTENT = /\b(video|footage|studio|film)\b/i;
const VIDEO_FOLLOW_UP_INTENT = /\b(slack|export|publish)\b/i;

function wantsVideoCreate(text: string) {
  return VIDEO_INTENT.test(text) && !VIDEO_FOLLOW_UP_INTENT.test(text);
}

function downloadVideo(src: string, title: string) {
  const ext = src.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1] ?? "mp4";
  const safe = title.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "video";
  const name = `${safe}.${ext}`;

  const save = (href: string, revoke?: string) => {
    const link = document.createElement("a");
    link.href = href;
    link.download = name;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (revoke) window.setTimeout(() => URL.revokeObjectURL(revoke), 1500);
  };

  void fetch(src)
    .then((response) => {
      if (!response.ok) throw new Error("export failed");
      return response.blob();
    })
    .then((blob) => {
      const href = URL.createObjectURL(blob);
      save(href, href);
    })
    .catch(() => {
      save(src);
    });
}

function precedingUserText(messages: ThreadMessage[], assistantIndex: number) {
  for (let index = assistantIndex - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.role === "user") return message.text;
  }
  return "";
}

function emptyAssistant(): AssistantBody {
  return {
    thinking: true,
    thinkingVariant: "search",
    thinkingLabel: "Searching with Bright Data",
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
        thinkingVariant: event.data.variant ?? body.thinkingVariant,
        thinkingQuery: event.data.query ?? body.thinkingQuery,
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
  prompt,
  creating,
  busy,
  onResolve,
  onFollowUp,
  followUpHotkeys,
}: {
  message: AssistantMsg;
  prompt: string;
  creating?: boolean;
  busy?: boolean;
  onResolve: (messageId: string, accepted: boolean, answers: Record<string, string | string[]>) => void;
  onFollowUp: (item: FollowUp, video?: Extract<Artifact, { kind: "video" }>) => void;
  followUpHotkeys?: boolean;
}) {
  const { body } = message;
  const records = body.artifacts.find((item): item is Extract<Artifact, { kind: "records" }> => item.kind === "records");
  const video = body.artifacts.find((item): item is Extract<Artifact, { kind: "video" }> => item.kind === "video");
  const diffs = body.artifacts.filter((item): item is Extract<Artifact, { kind: "diff" }> => item.kind === "diff");
  const liveSearch = liveSearchFromTurn({
    query: body.thinkingQuery ?? prompt,
    steps: body.thinkingSteps,
    tools: body.tools,
  });
  const searchPending = body.tools.some(
    (tool) => /search|scrape|browse|web_search|fetch|crawl/i.test(tool.call.name) && !tool.result
  );
  const inFlight = body.thinking || body.streaming;

  return (
    <article className="flex min-w-0 flex-col gap-4">
      <ThinkingState
        variant={body.thinkingVariant ?? "search"}
        query={liveSearch?.query ?? body.thinkingQuery ?? prompt}
        rows={liveSearch?.rows}
        steps={liveSearch ? undefined : body.thinkingSteps}
        working={Boolean(liveSearch) && (body.thinking || searchPending)}
        play={inFlight}
      />
      {body.tools.length > 0 ? <ToolChips tools={body.tools} /> : null}
      {body.text || body.error ? (
        <StreamingText text={body.text} streaming={body.streaming} error={body.error} />
      ) : null}
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
      {creating ? (
        <div className="h-[280px] overflow-hidden rounded-[14px] bg-neutral-0 shadow-sm lg:hidden">
          <VideoCreating />
        </div>
      ) : null}
      {video && !body.streaming ? (
        <div className="h-[420px] overflow-hidden rounded-[14px] bg-neutral-0 shadow-sm lg:hidden">
          <VideoEditor artifact={video} />
        </div>
      ) : null}
      {video && !body.streaming && !creating ? (
        <FollowUpList
          items={VIDEO_FOLLOW_UPS}
          disabled={busy}
          hotkeys={followUpHotkeys}
          onFollowUp={(item) => onFollowUp(item, video)}
        />
      ) : null}
    </article>
  );
}

export function AgentHarness() {
  const [chats, setChats] = useState<Conversation[]>([
    { id: "home", title: null, messages: [] },
  ]);
  const [activeId, setActiveId] = useState("home");
  const [view, setView] = useState<"dashboard" | "publishes" | "channels" | "chat">("dashboard");
  const [busy, setBusy] = useState(false);
  const [closedPane, setClosedPane] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const [composer, setComposer] = useState("");
  const [focusComposer, setFocusComposer] = useState(false);
  const [composerH, setComposerH] = useState(88);

  const chat = chats.find((item) => item.id === activeId) ?? chats[0];
  const active = chat.messages.length > 0;

  const lastUser = [...chat.messages].reverse().find((message): message is UserMsg => message.role === "user");
  const lastAssistant = [...chat.messages]
    .reverse()
    .find((message): message is AssistantMsg => message.role === "assistant");
  const lastVideo = lastAssistant?.body.artifacts.find(
    (item): item is Extract<Artifact, { kind: "video" }> => item.kind === "video"
  );
  const creatingVideo = Boolean(
    lastAssistant?.body.streaming && !lastVideo && lastUser && wantsVideoCreate(lastUser.text)
  );
  const paneArtifact = creatingVideo
    ? undefined
    : [...chat.messages]
        .reverse()
        .flatMap((message) => (message.role === "assistant" ? message.body.artifacts : []))
        .find((artifact) => PANE_KINDS.has(artifact.kind));
  const showPane = (creatingVideo || Boolean(paneArtifact)) && closedPane !== chat.id;

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
    setComposer("");
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
      if (abortRef.current === controller) setBusy(false);
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
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
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
        signal: controller.signal,
        onEvent: (event) => applyToAssistant(conversationId, follow.id, event),
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      applyToAssistant(conversationId, follow.id, {
        type: "error",
        data: { message: error instanceof Error ? error.message : "Confirm failed" },
      });
    } finally {
      if (abortRef.current === controller) setBusy(false);
    }
  };

  const handleVideoFollowUp = (item: FollowUp, video?: Extract<Artifact, { kind: "video" }>) => {
    if (item.id === "export") {
      if (video?.src) downloadVideo(video.src, video.title);
      toast("Export started");
      return;
    }
    if (item.prompt) void send(item.prompt);
  };

  const prefillPrompt = (text: string) => {
    setView("chat");
    setComposer(text);
    setFocusComposer(true);
  };

  const openChat = (id: string) => {
    setActiveId(id);
    setView("chat");
  };

  const newChat = () => {
    const next = { id: crypto.randomUUID(), title: null, messages: [] };
    setChats((current) => [...current, next]);
    openChat(next.id);
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
    if (id === activeId) {
      setActiveId(remaining[remaining.length - 1].id);
      setView("chat");
    }
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

  useEffect(() => {
    if (!focusComposer) return;
    const input = composerInputRef.current;
    if (!input) return;
    input.focus();
    const match = composer.match(/\[[^\]]+\]/);
    if (match && match.index != null) {
      input.setSelectionRange(match.index, match.index + match[0].length);
    } else {
      input.setSelectionRange(composer.length, composer.length);
    }
    setFocusComposer(false);
  }, [focusComposer, composer, view]);

  return (
    <main className="flex h-[100dvh] bg-neutral-100 text-fg">
      <SidebarNav
        chats={chats}
        activeId={view === "chat" ? activeId : ""}
        activeTab={view === "chat" ? null : (view === "dashboard" ? "home" : view)}
        onTab={(tab: SidebarTab) => setView(tab === "home" ? "dashboard" : tab)}
        onNewChat={newChat}
        onPick={openChat}
      />

      <div className="flex min-w-0 flex-1 gap-2.5 p-2.5">
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[14px] bg-neutral-0 shadow-sm">
          {view === "dashboard" ? <HomeDashboard /> : null}
          {view === "publishes" ? <CatalogPage title="Publishes" kind="publishes" /> : null}
          {view === "channels" ? <CatalogPage title="Channels" kind="channels" /> : null}
          {view === "chat" ? (
          <>
          <div className="flex h-11 shrink-0 items-center gap-1 overflow-x-auto px-2">
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
                  onClick={() => openChat(item.id)}
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
                  {chat.messages.map((message, index) =>
                    message.role === "user" ? (
                      <UserBubble key={message.id} text={message.text} />
                    ) : (
                      <AssistantTurn
                        key={message.id}
                        message={message}
                        prompt={precedingUserText(chat.messages, index)}
                        creating={creatingVideo && message.id === lastAssistant?.id}
                        busy={busy}
                        onResolve={resolveApproval}
                        onFollowUp={handleVideoFollowUp}
                        followUpHotkeys={message.id === lastAssistant?.id}
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
                  <PromptBar
                    placeholder="Reply"
                    disabled={busy}
                    value={composer}
                    onChange={setComposer}
                    onSend={send}
                    inputRef={composerInputRef}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex min-h-0 w-full max-w-[720px] flex-1 flex-col justify-center px-4 py-10 sm:px-8">
              <h1 className="font-heading text-2xl font-medium leading-none tracking-[-0.02em] text-fg">
                <span className="block text-fg-tertiary">Hello</span>
                <span className="block">Let's make a film</span>
              </h1>
              <div className="mt-7">
                <PromptBar
                  autoFocus
                  placeholder="Ask anything"
                  disabled={busy}
                  value={composer}
                  onChange={setComposer}
                  onSend={send}
                  inputRef={composerInputRef}
                />
              </div>
              <div className="mt-10">
                <SuggestionRail onPrefill={prefillPrompt} />
              </div>
            </div>
          )}
          </>
          ) : null}
        </section>

        {view === "chat" && showPane ? (
          <aside
            className={`hidden shrink-0 flex-col overflow-hidden rounded-[14px] bg-neutral-0 shadow-sm lg:flex ${
              creatingVideo || paneArtifact?.kind === "video" ? "w-[min(520px,42vw)]" : "w-[360px]"
            }`}
          >
            {paneArtifact?.kind === "video" ? (
              <ChannelPreviews
                artifact={paneArtifact}
                prompt={lastUser?.text}
              />
            ) : (
              <>
                <div className="flex h-11 shrink-0 items-center justify-between border-b border-border-default px-3">
                  <Text size="sm" weight="medium">
                    {creatingVideo ? "Creating video" : paneArtifact?.title}
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
                <div
                  className={
                    creatingVideo ? "min-h-0 flex-1" : "min-h-0 flex-1 overflow-y-auto p-3"
                  }
                >
                  {creatingVideo ? <VideoCreating /> : null}
                  {paneArtifact?.kind === "records" ? <RecordsTable artifact={paneArtifact} /> : null}
                </div>
              </>
            )}
          </aside>
        ) : null}
      </div>
    </main>
  );
}
