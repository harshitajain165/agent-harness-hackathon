"use client";

import { useState } from "react";
import { CheckIcon, ChevronDownIcon, SparkleCentralIcon } from "@/components/icons";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import type { ThinkingStep } from "@/lib/agent/types";

export function ThinkingState({
  label,
  steps = [],
  working,
}: {
  label: string;
  steps?: ThinkingStep[];
  working: boolean;
}) {
  const [open, setOpen] = useState(true);
  const doneLabel = steps.length
    ? `Thought · ${steps.length} ${steps.length === 1 ? "step" : "steps"}`
    : "Thought";

  return (
    <div className="flex w-full max-w-[520px] flex-col">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="-mx-1.5 flex w-fit items-center gap-2 rounded-[10px] px-1.5 py-1 transition-colors duration-150 hover:bg-neutral-100"
      >
        <SparkleCentralIcon
          className={cn("size-4", working ? "text-fg-secondary" : "text-fg-tertiary")}
        />
        {working ? (
          <span
            role="status"
            className="bg-clip-text text-sm font-medium text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(90deg, var(--neutral-400) 35%, var(--neutral-950) 50%, var(--neutral-400) 65%)",
              backgroundSize: "200% 100%",
              animation: "shimmer-text 1.4s linear infinite",
            }}
          >
            {label}
          </span>
        ) : (
          <Text as="span" size="sm" weight="medium" color="secondary">
            {doneLabel}
          </Text>
        )}
        <ChevronDownIcon
          className={cn(
            "size-3.5 text-fg-tertiary transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      <div
        className="grid transition-[grid-template-rows,opacity] duration-300"
        style={{
          gridTemplateRows: open && steps.length ? "1fr" : "0fr",
          opacity: open && steps.length ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          <div className="relative mt-1 ml-2 border-l border-border-default pl-4">
            <ul className="flex flex-col gap-1 py-1">
              {steps.map((step) => (
                <li key={step.id} className="flex min-h-7 items-center gap-2">
                  {step.status === "running" ? (
                    <Spinner className="size-3.5 text-fg-secondary" />
                  ) : (
                    <CheckIcon className="size-3.5 text-fg-tertiary" />
                  )}
                  <Text as="span" size="sm" weight="medium" className="min-w-0 truncate">
                    {step.label}
                  </Text>
                  {step.detail ? (
                    <Text as="span" size="sm" color="tertiary" className="min-w-0 truncate">
                      {step.detail}
                    </Text>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
