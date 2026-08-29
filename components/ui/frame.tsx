import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const frameVariants = cva(
  "group/frame relative flex w-full flex-col overflow-hidden bg-neutral-100 outline outline-[0.5px] outline-offset-[-0.5px] outline-neutral-150",
  {
    variants: {
      /** Inset between the neutral well and the white panel. */
      variant: {
        /** 4px inset — lists with columns, tables. */
        default: "gap-1 rounded-[20px] p-1",
        /** 2px inset — compact framed surfaces. */
        thin: "gap-0.5 rounded-[14px] p-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Frame({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof frameVariants>) {
  return (
    <div
      data-slot="frame"
      data-variant={variant}
      className={cn(frameVariants({ variant }), className)}
      {...props}
    />
  );
}

function FramePanel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="frame-panel"
      className={cn(
        "relative min-w-0 overflow-hidden bg-neutral-0 shadow-sm",
        "group-data-[variant=default]/frame:rounded-[16px]",
        "group-data-[variant=thin]/frame:rounded-[12px]",
        className
      )}
      {...props}
    />
  );
}

function FrameHeader({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="frame-header"
      className={cn("flex w-full flex-col gap-0.5 px-4 py-3", className)}
      {...props}
    />
  );
}

function FrameTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="frame-title"
      className={cn("text-sm font-medium text-fg", className)}
      {...props}
    />
  );
}

function FrameDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="frame-description"
      className={cn("text-sm font-normal text-fg-secondary", className)}
      {...props}
    />
  );
}

function FrameFooter({ className, ...props }: React.ComponentProps<"footer">) {
  return (
    <footer
      data-slot="frame-footer"
      className={cn(
        "flex w-full items-center px-4 py-3 text-sm font-normal text-fg-secondary",
        className
      )}
      {...props}
    />
  );
}

export {
  Frame,
  FramePanel,
  FrameHeader,
  FrameTitle,
  FrameDescription,
  FrameFooter,
  frameVariants,
};
