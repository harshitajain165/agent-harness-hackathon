"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { CopyIcon, ExportIcon, MegaphoneIcon, RewriteIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Kbd } from "@/components/ui/kbd";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export type FollowUp = {
  id: string;
  label: string;
  /** When set, the harness should `send()` this prompt. Export and publish have no prompt. */
  prompt?: string;
};

export const VIDEO_FOLLOW_UPS: FollowUp[] = [
  {
    id: "slack",
    label: "Send to Slack for approval",
    prompt: "Send this video to Slack for approval",
  },
  { id: "export", label: "Export video" },
  { id: "publish", label: "Publish to channels" },
  { id: "voiceover", label: "Rewrite the voiceover", prompt: "Rewrite the voiceover" },
];

const FOLLOW_UP_SHORTCUT: Record<string, string> = {
  slack: "1",
  export: "2",
  publish: "3",
  voiceover: "4",
};

function FollowUpIcon({ id }: { id: string }) {
  const className = "size-4 shrink-0 text-fg-tertiary";
  if (id === "slack") {
    return (
      <img
        src="/home/channels/slack.svg"
        alt=""
        width={16}
        height={16}
        className="size-4 shrink-0"
      />
    );
  }
  if (id === "export") return <ExportIcon className={className} />;
  if (id === "publish") return <MegaphoneIcon className={className} />;
  if (id === "voiceover") return <RewriteIcon className={className} />;
  return null;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function useModKey() {
  const [modKey, setModKey] = useState("⌘");
  useEffect(() => {
    const apple =
      /Mac|iPhone|iPad|iPod/.test(navigator.platform) ||
      /Mac OS X/.test(navigator.userAgent);
    setModKey(apple ? "⌘" : "⌃");
  }, []);
  return modKey;
}

export function FollowUpList({
  items,
  disabled,
  onFollowUp,
  hotkeys = true,
}: {
  items: FollowUp[];
  disabled?: boolean;
  onFollowUp: (item: FollowUp) => void;
  hotkeys?: boolean;
}) {
  const onFollowUpRef = useRef(onFollowUp);
  onFollowUpRef.current = onFollowUp;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const modKey = useModKey();

  useEffect(() => {
    if (!hotkeys) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (isTypingTarget(event.target)) return;
      if (disabledRef.current) return;
      const digit = event.code.match(/^Digit([1-4])$/)?.[1];
      if (!digit) return;
      const item = itemsRef.current.find((entry) => FOLLOW_UP_SHORTCUT[entry.id] === digit);
      if (!item) return;
      event.preventDefault();
      onFollowUpRef.current(item);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hotkeys]);

  if (items.length === 0) return null;

  return (
    <div className="w-full">
      <Text size="sm" weight="regular" color="secondary">
        Follow-ups
      </Text>
      <div className="mt-0.5 flex flex-col">
        {items.map((item, index) => {
          const shortcut = FOLLOW_UP_SHORTCUT[item.id];
          return (
            <Fragment key={item.id}>
              {index > 0 ? (
                <div aria-hidden className="h-px bg-neutral-200" />
              ) : null}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onFollowUp(item)}
                aria-keyshortcuts={shortcut ? `Meta+${shortcut} Control+${shortcut}` : undefined}
                className={cn(
                  "-mx-1.5 flex w-[calc(100%+12px)] items-center gap-2 rounded-[10px] px-1.5 py-2.5 text-left text-sm font-medium text-fg",
                  "transition-colors duration-150 hover:bg-neutral-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border-focus",
                  "disabled:pointer-events-none disabled:text-fg-secondary"
                )}
                style={{
                  animation: `fade-up 350ms cubic-bezier(0.23, 1, 0.32, 1) ${index * 90}ms both`,
                }}
              >
                <FollowUpIcon id={item.id} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {shortcut ? (
                  <span className="ml-auto inline-flex shrink-0 items-center gap-0.5" aria-hidden>
                    <Kbd>{modKey}</Kbd>
                    <Kbd>{shortcut}</Kbd>
                  </span>
                ) : null}
              </button>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export function StreamingText({
  text,
  streaming,
  error,
}: {
  text: string;
  streaming: boolean;
  error?: string;
}) {
  return (
    <div className="w-full">
      {text || streaming ? (
        <p className="text-sm leading-relaxed text-fg whitespace-pre-wrap">
          {text}
          {streaming ? (
            <span
              aria-hidden
              className="ml-0.5 inline-block h-3 w-0.5 translate-y-0.5 rounded-full bg-neutral-950"
              style={{ animation: "caret-blink 1s steps(1) infinite" }}
            />
          ) : null}
        </p>
      ) : null}
      {error ? (
        <Text size="sm" className="mt-2 text-danger-fg">
          {error}
        </Text>
      ) : null}
      {!streaming && text ? (
        <div className="mt-2 flex items-center gap-0.5">
          <IconButton
            aria-label="Copy reply"
            variant="transparent"
            size="sm"
            onClick={() => navigator.clipboard.writeText(text)}
          >
            <CopyIcon className="size-4" />
          </IconButton>
        </div>
      ) : null}
    </div>
  );
}

export function UserBubble({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("flex justify-end pl-10 sm:pl-24", className)}>
      <div className="rounded-[10px] bg-neutral-100 px-3.5 py-2 text-sm leading-relaxed text-fg">
        {text}
      </div>
    </div>
  );
}
