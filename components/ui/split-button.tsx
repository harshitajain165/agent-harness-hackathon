"use client";

import { ChevronDownIcon } from "@/components/icons";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type * as React from "react";

const splitChevronSizeMap = {
  sm: "icon-sm",
  md: "icon",
  lg: "icon-lg",
  xl: "icon-xl",
  default: "icon",
  icon: "icon",
  "icon-sm": "icon-sm",
  "icon-lg": "icon-lg",
  "icon-xl": "icon-xl",
  "icon-xs": "icon-xs",
} as const;

function splitSeamClass(variant: ButtonProps["variant"]) {
  switch (variant) {
    case "primary":
    case "default":
    case "brand":
    case "danger":
      return "border-on-inverted/20";
    case "tertiary":
      return "border-border-default";
    default:
      return "border-fg/15";
  }
}

export function SplitButton({
  children,
  className,
  variant = "primary",
  size = "md",
  shape = "rounded",
  menu,
  disabled,
  ...props
}: ButtonProps & {
  menu: React.ReactNode;
}) {
  const chevronSize =
    splitChevronSizeMap[size as keyof typeof splitChevronSizeMap] ?? "icon";
  const seamClass = splitSeamClass(variant);

  return (
    <div className={cn("inline-flex items-stretch", className)}>
      <Button
        variant={variant}
        size={size}
        shape={shape}
        disabled={disabled}
        className="rounded-e-none"
        {...props}
      >
        {children}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          render={
            <Button
              variant={variant}
              size={chevronSize}
              shape={shape}
              aria-label="More actions"
              className={cn(
                "self-stretch rounded-s-none border-l",
                seamClass
              )}
            />
          }
        >
          <ChevronDownIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">{menu}</DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export { DropdownMenuItem as SplitButtonItem };
