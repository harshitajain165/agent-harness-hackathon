"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Input-family icon padding — same 2px reduction as buttons.
 * Text-only controls stay `px-3`. Icon↔label gap is `gap-2`.
 */
const controlPaddingLeadingIconClassName = "gap-2 pl-2.5 pr-3";
const controlPaddingTrailingIconClassName = "gap-2 pl-3 pr-2.5";
const controlPaddingBothIconsClassName = "gap-2 pl-2.5 pr-2.5";

export const inputGroupVariants = cva(
  "group/input-group relative flex w-full min-w-0 items-stretch overflow-hidden border-0 text-sm font-normal text-fg has-disabled:pointer-events-none has-disabled:bg-neutral-100 has-disabled:text-fg-disabled has-disabled:shadow-none has-disabled:[&_[data-slot=input-group-addon]]:border-transparent has-disabled:[&_[data-slot=input-group-addon]]:bg-transparent has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[[data-align=inline-start]]:[&>[data-slot=input-group-control]]:pl-0 has-[[data-align=inline-end]]:[&>[data-slot=input-group-control]]:pr-0",
  {
    variants: {
      variant: {
        primary: "bg-neutral-100 shadow-none",
        secondary: "bg-neutral-0 shadow-sm",
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

function InputGroup({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupVariants>) {
  const resolvedSize = size ?? "sm";

  return (
    <div
      data-slot="input-group"
      data-variant={variant ?? "primary"}
      data-size={size ?? "sm"}
      role="group"
      className={cn(
        resolvedSize === "md" ? "rounded-[12px]" : "rounded-[10px]",
        "ring-2 ring-danger-solid/0 transition-[box-shadow] duration-150 focus-within:ring-brand-border-focus has-[[data-slot][aria-invalid=true]]:ring-danger-solid has-[[data-slot][aria-invalid=true]]:duration-[var(--input-error-revert-dur)] has-[[data-slot][aria-invalid=true]]:ease-[var(--ease-out)]",
        className
      )}
    >
      <div className={cn(inputGroupVariants({ variant, size }))} {...props} />
    </div>
  );
}

const inputGroupAddonVariants = cva(
  "flex h-auto shrink-0 cursor-text items-center justify-center self-stretch text-sm font-normal text-fg-secondary select-none group-has-disabled/input-group:text-fg-disabled [&_svg]:pointer-events-none [&_svg:not([class*='text-'])]:text-fg-tertiary [&_svg:not([class*='size-'])]:size-4 group-has-disabled/input-group:[&_svg]:text-fg-disabled",
  {
    variants: {
      align: {
        "inline-start": "order-first pl-2.5 pr-2 has-[>button]:px-1",
        "inline-end": "order-last pr-2.5 pl-2 has-[>button]:px-1",
        "block-start":
          "order-first w-full justify-start px-3 pt-2 group-has-[>input]/input-group:pt-2",
        "block-end":
          "order-last w-full justify-start px-3 pb-2 group-has-[>input]/input-group:pb-2",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  }
);

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return;
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus();
      }}
      {...props}
    />
  );
}

const inputGroupButtonVariants = cva(
  "text-fg-tertiary shadow-none hover:text-fg [&_svg]:size-4",
  {
    variants: {
      size: {
        xs: "h-6 gap-1 rounded-[8px] px-1.5 text-sm font-normal",
        sm: "h-6 rounded-[8px] px-2 text-sm font-normal",
        "icon-xs": "size-6 rounded-[8px] p-0",
        "icon-sm": "size-6 rounded-[8px] p-0",
      },
    },
    defaultVariants: {
      size: "icon-xs",
    },
  }
);

function InputGroupButton({
  className,
  type = "button",
  variant = "transparent",
  size = "icon-xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "type"> &
  VariantProps<typeof inputGroupButtonVariants> & {
    type?: "button" | "submit" | "reset";
  }) {
  const buttonSize =
    size === "icon-sm" || size === "icon-xs" ? size : "sm";

  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      size={buttonSize}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-sm font-normal text-fg-tertiary [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function InputGroupInput({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "size">) {
  return (
    <Input
      variant="bare"
      data-slot="input-group-control"
      className={cn(
        "h-full min-w-0 flex-1 px-3 py-1 ring-0 focus-visible:ring-0 disabled:bg-transparent disabled:shadow-none aria-invalid:ring-0",
        className
      )}
      {...props}
    />
  );
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      variant="bare"
      data-slot="input-group-control"
      className={cn(
        "flex-1 resize-none py-2 ring-0 focus-visible:ring-0 disabled:bg-transparent disabled:shadow-none aria-invalid:ring-0",
        className
      )}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
  controlPaddingLeadingIconClassName,
  controlPaddingTrailingIconClassName,
  controlPaddingBothIconsClassName,
};
