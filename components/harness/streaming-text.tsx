"use client";

import { CopyIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

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
    <div className="w-full max-w-[640px]">
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
