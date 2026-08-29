"use client";

import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { mergeRefs, useInvalidShake } from "@/components/ui/use-invalid-shake";

export const inputVariants = cva(
  "w-full min-w-0 border-0 px-3 py-1 text-sm font-normal text-fg outline-none transition-[color,box-shadow,background-color] duration-150 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-normal file:text-fg placeholder:text-fg-tertiary ring-2 ring-danger-solid/0 focus-visible:ring-brand-border-focus disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-fg-disabled disabled:shadow-none aria-invalid:ring-danger-solid aria-invalid:duration-[var(--input-error-revert-dur)] aria-invalid:ease-[var(--ease-out)]",
  {
    variants: {
      variant: {
        primary: "bg-neutral-100 shadow-none",
        secondary: "bg-neutral-0 shadow-sm",
        bare: "!rounded-none bg-transparent shadow-none ring-0 focus-visible:ring-0",
      },
      size: {
        sm: "h-9 rounded-[10px]",
        md: "h-10 rounded-[12px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "sm",
    },
  }
);

function Input({
  className,
  type,
  variant,
  size,
  ref,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>) {
  const shakeRef = useInvalidShake(variant === "bare" ? "input-group" : "self");

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-variant={variant ?? "primary"}
      data-size={size ?? "sm"}
      className={cn(inputVariants({ variant, size }), className)}
      ref={mergeRefs(shakeRef, ref)}
      {...props}
    />
  );
}

export { Input };
