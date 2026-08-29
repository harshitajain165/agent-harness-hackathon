"use client";

import { ArrowCornerDownLeftIcon, CopyIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export type FollowUp = {
  id: string;
  label: string;
  /** When set, the harness should `send()` this prompt. Export has no prompt. */
  prompt?: string;
};

export const VIDEO_FOLLOW_UPS: FollowUp[] = [
  {
    id: "slack",
    label: "Send to Slack for approval",
    prompt: "Send this video to Slack for approval",
  },
  { id: "export", label: "Export video" },
  { id: "publish", label: "Publish to channels", prompt: "Publish to channels" },
  { id: "voiceover", label: "Rewrite the voiceover", prompt: "Rewrite the voiceover" },
];

export function FollowUpList({
  items,
  disabled,
  onFollowUp,
}: {
  items: FollowUp[];
  disabled?: boolean;
  onFollowUp: (item: FollowUp) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="w-full">
      <Text size="sm" weight="medium" color="secondary">
        Follow-ups
      </Text>
      <div className="mt-0.5 flex flex-col">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onFollowUp(item)}
            className={cn(
              "-mx-1.5 flex items-center gap-2 rounded-[7px] border-b border-neutral-200 px-1.5 py-1.5 text-left text-sm text-fg",
              "transition-colors duration-150 last:border-b-0 hover:bg-neutral-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border-focus",
              "disabled:pointer-events-none disabled:text-fg-secondary"
            )}
            style={{
              animation: `fade-up 350ms cubic-bezier(0.23, 1, 0.32, 1) ${index * 90}ms both`,
            }}
          >
            <ArrowCornerDownLeftIcon className="size-3.5 shrink-0 text-fg-tertiary" />
            {item.label}
          </button>
        ))}
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
