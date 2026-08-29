"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Frame, FramePanel } from "@/components/ui/frame";
import { Heading } from "@/components/ui/heading";
import { Kbd } from "@/components/ui/kbd";
import { RadioGroup, RadioRow } from "@/components/ui/radio-group";
import { Text } from "@/components/ui/text";
import type { ApprovalQuestion, ApprovalRequest } from "@/lib/agent/types";

export function ApprovalCard({
  approval,
  resolved,
  onSubmit,
}: {
  approval: ApprovalRequest;
  resolved?: "accepted" | "rejected";
  onSubmit: (accepted: boolean, answers: Record<string, string | string[]>) => void;
}) {
  const questions = approval.questions ?? [];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const question = questions[index] as ApprovalQuestion | undefined;
  const current = question ? answers[question.id] : undefined;
  const canContinue = useMemo(() => {
    if (!question) return true;
    if (question.type === "single") return typeof current === "string" && current.length > 0;
    return Array.isArray(current) && current.length > 0;
  }, [current, question]);

  if (resolved) {
    return (
      <Frame variant="thin" className="max-w-[420px]">
        <FramePanel className="px-4 py-3">
          <Text size="sm" weight="medium">
            {resolved === "accepted" ? "Approved" : "Dismissed"}
          </Text>
          <Text size="sm" color="secondary" className="mt-1">
            {approval.title}
          </Text>
        </FramePanel>
      </Frame>
    );
  }

  const finish = (accepted: boolean) => onSubmit(accepted, answers);

  const advance = () => {
    if (index < questions.length - 1) {
      setIndex((value) => value + 1);
      return;
    }
    finish(true);
  };

  return (
    <Frame variant="thin" className="max-w-[460px]">
      <FramePanel className="flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Heading as="h3" size="base">
              {approval.title}
            </Heading>
            <Text size="sm" color="secondary" className="mt-1">
              {question?.prompt ?? approval.message}
            </Text>
          </div>
          {questions.length > 1 ? (
            <Text size="sm" color="tertiary" className="tabular-nums">
              {index + 1}/{questions.length}
            </Text>
          ) : null}
        </div>

        {question?.type === "single" ? (
          <RadioGroup
            value={typeof current === "string" ? current : ""}
            onValueChange={(value) => {
              if (!value) return;
              setAnswers((prev) => ({ ...prev, [question.id]: value }));
              if (index < questions.length - 1) {
                window.setTimeout(() => setIndex((n) => n + 1), 180);
              }
            }}
          >
            {question.options.map((option) => (
              <RadioRow key={option} value={option} title={option} />
            ))}
          </RadioGroup>
        ) : null}

        {question?.type === "multi" ? (
          <div className="flex flex-col gap-2">
            {question.options.map((option) => {
              const selected = Array.isArray(current) ? current : [];
              const checked = selected.includes(option);
              return (
                <label
                  key={option}
                  className="flex items-center gap-3 rounded-[10px] bg-neutral-100 px-3 py-2.5"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => {
                      setAnswers((prev) => {
                        const next = new Set(Array.isArray(prev[question.id]) ? prev[question.id] : []);
                        if (value) next.add(option);
                        else next.delete(option);
                        return { ...prev, [question.id]: [...next] };
                      });
                    }}
                  />
                  <Text size="sm" weight="medium">
                    {option}
                  </Text>
                </label>
              );
            })}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button variant="tertiary" size="sm" onClick={() => finish(false)}>
            Dismiss
          </Button>
          <Button variant="primary" size="sm" disabled={!canContinue} onClick={advance}>
            {index < questions.length - 1 ? "Continue" : "Approve"}
            <Kbd>↵</Kbd>
          </Button>
        </div>
      </FramePanel>
    </Frame>
  );
}
