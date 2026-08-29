"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { mergeRefs, useInvalidShake } from "@/components/ui/use-invalid-shake";

export const textareaVariants = cva(
  "flex field-sizing-content min-h-16 w-full rounded-[10px] border-0 px-3 py-2 text-sm font-normal text-fg outline-none transition-[color,box-shadow,background-color] duration-150 placeholder:text-fg-tertiary ring-2 ring-danger-solid/0 focus-visible:ring-brand-border-focus disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-fg-disabled disabled:shadow-none aria-invalid:ring-danger-solid aria-invalid:duration-[var(--input-error-revert-dur)] aria-invalid:ease-[var(--ease-out)]",
  {
    variants: {
      variant: {
        primary: "bg-neutral-100 shadow-none",
        secondary: "bg-neutral-0 shadow-sm",
        bare: "rounded-none bg-transparent shadow-none ring-0 focus-visible:ring-0",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
);

function Textarea({
  className,
  variant,
  ref,
  ...props
}: React.ComponentProps<"textarea"> & VariantProps<typeof textareaVariants>) {
  const shakeRef = useInvalidShake(variant === "bare" ? "input-group" : "self");

  return (
    <textarea
      data-slot="textarea"
      data-variant={variant ?? "primary"}
      className={cn(textareaVariants({ variant }), className)}
      ref={mergeRefs(shakeRef, ref)}
      {...props}
    />
  );
}

export { Textarea };
