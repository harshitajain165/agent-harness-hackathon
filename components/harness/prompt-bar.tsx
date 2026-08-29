"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUpIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function PromptBar({
  placeholder = "Ask anything",
  disabled,
  onSend,
  autoFocus,
}: {
  placeholder?: string;
  disabled?: boolean;
  onSend: (text: string) => void;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !disabled;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    ref.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={submit}
      className={cn(
        "flex items-center gap-2 rounded-[14px] bg-neutral-0 p-2 shadow-sm",
        "ring-1 ring-inset ring-neutral-200 focus-within:ring-2 focus-within:ring-brand-border-focus"
      )}
    >
      <Textarea
        ref={ref}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        variant="bare"
        rows={1}
        className="block min-h-9 max-h-40 flex-1 resize-none px-2 py-2 leading-5"
      />
      <IconButton
        type="submit"
        aria-label="Send"
        variant="primary"
        size="md"
        disabled={!canSend}
      >
        <ArrowUpIcon className="size-4" />
      </IconButton>
    </form>
  );
}
