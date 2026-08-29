"use client";

import { type FormEvent, type KeyboardEvent, type RefObject } from "react";
import { ArrowUpIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function PromptBar({
  placeholder = "Ask anything",
  disabled,
  onSend,
  autoFocus,
  value,
  onChange,
  inputRef,
}: {
  placeholder?: string;
  disabled?: boolean;
  onSend: (text: string) => void;
  autoFocus?: boolean;
  value: string;
  onChange: (value: string) => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const canSend = value.trim().length > 0 && !disabled;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    onChange("");
    inputRef?.current?.focus();
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
        "flex flex-col rounded-[14px] bg-neutral-0 p-2 shadow-sm",
        "ring-1 ring-inset ring-neutral-200 focus-within:ring-1 focus-within:ring-brand-border-focus"
      )}
    >
      <Textarea
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        variant="bare"
        rows={1}
        className="block min-h-9 max-h-40 w-full flex-1 resize-none px-2 py-2 leading-5"
      />
      <div className="flex justify-end">
        <IconButton
          type="submit"
          aria-label="Send"
          variant="brand"
          size="md"
          disabled={!canSend}
        >
          <ArrowUpIcon className="size-4" />
        </IconButton>
      </div>
    </form>
  );
}
