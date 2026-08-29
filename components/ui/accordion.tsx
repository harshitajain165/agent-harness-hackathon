"use client";

import * as React from "react";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";

import { ChevronDownIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

type AccordionProps = AccordionPrimitive.Root.Props & {
  /** One item stays open at a time, or several independent items can be open. */
  type?: "single" | "multiple";
};

function Accordion({ type = "single", className, ...props }: AccordionProps) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      data-type={type}
      multiple={type === "multiple"}
      className={cn("flex w-full flex-col overflow-hidden rounded-[14px] bg-neutral-0 shadow-sm", className)}
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(
        "group border-b border-neutral-150 last:border-b-0 transition-colors duration-150 data-disabled:pointer-events-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-neutral-50",
        className
      )}
      {...props}
    />
  );
}

function AccordionHeader({ className, ...props }: AccordionPrimitive.Header.Props) {
  return <AccordionPrimitive.Header data-slot="accordion-header" className={cn("m-0", className)} {...props} />;
}

function AccordionTrigger({ className, children, size = "md", ...props }: AccordionPrimitive.Trigger.Props & { size?: "sm" | "md" }) {
  return (
    <AccordionPrimitive.Trigger
      data-slot="accordion-trigger"
      data-size={size}
      className={cn(
        "flex w-full items-center gap-2 px-3 text-left text-sm font-medium text-fg outline-none focus-visible:ring-2 focus-visible:ring-brand-border-focus disabled:pointer-events-none disabled:text-fg-disabled",
        size === "sm" ? "min-h-10 py-2" : "min-h-11 py-2.5",
        className
      )}
      {...props}
    >
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronDownIcon radius="0" className="size-[18px] shrink-0 text-fg transition-transform duration-200 ease-[var(--ease-out)] group-data-open:rotate-180 motion-reduce:transition-none" />
    </AccordionPrimitive.Trigger>
  );
}

function AccordionPanel({ className, children, ...props }: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-panel"
      className={cn(
        "h-[var(--accordion-panel-height)] overflow-hidden transition-[height,opacity] duration-200 ease-[var(--ease-out)] data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0 motion-reduce:transition-none",
        className
      )}
      {...props}
    >
      <div className="px-3 pb-3 text-sm leading-5 text-fg-secondary">{children}</div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionItem, AccordionHeader, AccordionTrigger, AccordionPanel };
