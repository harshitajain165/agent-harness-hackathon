"use client";

import { Frame, FramePanel } from "@/components/ui/frame";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import type { DiffArtifact } from "@/lib/agent/types";

export function DiffTable({ artifact }: { artifact: DiffArtifact }) {
  return (
    <div className="flex flex-col gap-3">
      <Text size="sm" weight="medium">
        {artifact.title}
      </Text>
      {artifact.files.map((file) => (
        <Frame key={file.path} variant="thin">
          <FramePanel>
            <div className="flex items-center justify-between border-b border-border-default px-3 py-2 font-mono text-sm">
              <span className="min-w-0 truncate">{file.path}</span>
              <span>
                <span className="text-positive-fg">+{file.added}</span>
                {file.removed > 0 ? (
                  <span className="text-danger-fg"> −{file.removed}</span>
                ) : null}
              </span>
            </div>
            <div className="py-1 font-mono text-sm leading-6">
              {file.lines.map((line, index) => (
                <div
                  key={`${file.path}-${index}`}
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
          </FramePanel>
        </Frame>
      ))}
    </div>
  );
}
