"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon, ChipIcon, SearchIcon } from "@/components/icons";
import { Chip } from "@/components/ui/chip";
import { Text } from "@/components/ui/text";
import { floatingSurfaceClassName, cn } from "@/lib/utils";
import type { DiffFile, ToolCall, ToolResult } from "@/lib/agent/types";

type ToolRow = {
  call: ToolCall;
  result?: ToolResult;
};

export function ToolChips({ tools }: { tools: ToolRow[] }) {
  const [open, setOpen] = useState(true);
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<{ file: DiffFile; x: number; top: number } | null>(
    null
  );
  const diffs = tools.flatMap((tool) => tool.result?.diff ?? []);

  return (
    <div className="w-full max-w-[520px]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="-mx-1.5 flex w-fit items-center gap-1.5 rounded-[10px] px-1.5 py-1 text-sm text-fg-secondary transition-colors duration-150 hover:bg-neutral-100"
      >
        <ChevronDownIcon
          className={cn("size-3.5 transition-transform duration-150", !open && "-rotate-90")}
        />
        <span>
          {tools.length} {tools.length === 1 ? "tool call" : "tool calls"}
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows,opacity] duration-300"
        style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
      >
        <div className="overflow-hidden">
          <ul className="mt-1.5 flex flex-col gap-1">
            {tools.map(({ call, result }) => {
              const rowOpen = openRows.has(call.id);
              return (
                <li key={call.id}>
                  <button
                    type="button"
                    aria-expanded={rowOpen}
                    onClick={() =>
                      setOpenRows((current) => {
                        const next = new Set(current);
                        next.has(call.id) ? next.delete(call.id) : next.add(call.id);
                        return next;
                      })
                    }
                    className="flex h-8 w-full items-center gap-2 rounded-[8px] px-1 text-left transition-colors duration-150 hover:bg-neutral-100"
                  >
                    {call.name === "search" ? (
                      <SearchIcon className="size-4 text-fg-tertiary" />
                    ) : (
                      <ChipIcon className="size-4 text-fg-tertiary" />
                    )}
                    <Text as="span" size="sm" weight="medium" className="shrink-0">
                      {call.label}
                    </Text>
                    {call.input ? (
                      <Chip fill="neutral" className="min-w-0 flex-1 font-mono">
                        <span className="truncate">{call.input}</span>
                      </Chip>
                    ) : null}
                  </button>
                  {rowOpen && result?.detail ? (
                    <div className="ml-6 border-l border-border-default py-1 pl-3">
                      <Text size="sm" color="secondary" className="font-mono">
                        {result.detail}
                      </Text>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {diffs.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border-default pt-2.5">
              {diffs.map((file) => (
                <button
                  key={file.path}
                  type="button"
                  className="inline-flex h-7 items-center gap-2 rounded-[6px] bg-neutral-0 px-2 font-mono text-sm text-fg shadow-sm transition-colors duration-150 hover:bg-neutral-50"
                  onMouseEnter={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setPreview({ file, x: rect.left, top: rect.bottom + 6 });
                  }}
                  onMouseLeave={() => setPreview(null)}
                >
                  <span className="max-w-[160px] truncate">{file.path}</span>
                  <span className="text-positive-fg">+{file.added}</span>
                  {file.removed > 0 ? (
                    <span className="text-danger-fg">−{file.removed}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {preview && typeof document !== "undefined"
        ? createPortal(
            <div
              className={cn(floatingSurfaceClassName, "fixed z-50 w-80 overflow-hidden")}
              style={{ left: preview.x, top: preview.top }}
            >
              <div className="flex items-center justify-between border-b border-border-default px-3 py-2 font-mono text-sm">
                <span className="min-w-0 truncate text-fg-secondary">{preview.file.path}</span>
                <span>
                  <span className="text-positive-fg">+{preview.file.added}</span>
                  {preview.file.removed > 0 ? (
                    <span className="text-danger-fg"> −{preview.file.removed}</span>
                  ) : null}
                </span>
              </div>
              <div className="py-1 font-mono text-sm leading-6">
                {preview.file.lines.map((line, index) => (
                  <div
                    key={`${line.text}-${index}`}
                    className={cn(
                      "flex gap-2 px-3 whitespace-pre",
                      line.tone === "add" && "bg-positive-subtle text-positive-fg",
                      line.tone === "del" && "bg-danger-subtle text-danger-fg",
                      line.tone === "ctx" && "text-fg-secondary"
                    )}
                  >
                    <span className="w-3 shrink-0 select-none">
                      {line.tone === "add" ? "+" : line.tone === "del" ? "−" : " "}
                    </span>
                    <span className="min-w-0 truncate">{line.text}</span>
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
