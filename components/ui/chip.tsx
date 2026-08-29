"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { XIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export const chipVariants = cva(
  "inline-flex w-fit max-w-full shrink-0 text-fg has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50",
  {
    defaultVariants: {
      fill: "container",
      variant: "md",
    },
    variants: {
      fill: {
        /** White surface — use on primary (neutral-100) inputs. */
        container: "bg-neutral-0 shadow-sm",
        /** Neutral-100 surface — use on secondary (white) inputs. */
        neutral: "bg-neutral-100 shadow-sm",
      },
      variant: {
        md: "h-6 items-center gap-1 rounded-[6px] py-1 pl-2 pr-1 text-xs font-normal",
        sm: "h-5 items-center gap-1 rounded-[6px] py-0.5 pl-1.5 pr-0.5 text-xs font-normal",
        inline:
          "mx-1 box-border h-5 items-center gap-1 rounded-[6px] border border-border-default bg-neutral-100 py-0 pl-2 pr-1 text-sm font-normal leading-5 shadow-none [vertical-align:baseline]",
      },
    },
  }
);

export const chipRemoveVariants = cva(
  "inline-flex shrink-0 items-center justify-center text-fg-secondary transition-colors hover:text-fg disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      variant: "md",
    },
    variants: {
      variant: {
        md: "size-3.5 [&_svg]:size-3.5",
        sm: "size-3 [&_svg]:size-3",
        inline: "size-4 [&_svg]:size-4",
      },
    },
  }
);

export type ChipVariant = NonNullable<VariantProps<typeof chipVariants>["variant"]>;
export type ChipFill = NonNullable<VariantProps<typeof chipVariants>["fill"]>;

function Chip({
  className,
  variant = "md",
  fill = "container",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof chipVariants>) {
  return (
    <span
      data-slot="chip"
      data-variant={variant}
      data-fill={variant === "inline" ? "neutral" : fill}
      className={cn(
        chipVariants({
          variant,
          ...(variant === "inline" ? {} : { fill }),
        }),
        className
      )}
      {...props}
    />
  );
}

function ChipRemove({
  className,
  variant = "md",
  children,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof chipRemoveVariants>) {
  return (
    <button
      type="button"
      data-slot="chip-remove"
      className={cn(chipRemoveVariants({ variant }), className)}
      {...props}
    >
      {children ?? <XIcon className="pointer-events-none" />}
    </button>
  );
}

export { Chip, ChipRemove };
