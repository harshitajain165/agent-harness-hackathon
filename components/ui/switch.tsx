"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

const SWITCH_SCALE_SM = 20 / 26;

function switchVar(
  value: number,
  unit = "px",
  size: "sm" | "default"
) {
  return size === "sm" ? `calc(${value}${unit} * ${SWITCH_SCALE_SM})` : `${value}${unit}`;
}

function Switch({
  className,
  size = "default",
  style,
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      style={
        {
          "--switch-h": switchVar(26, "px", size),
          "--switch-w": switchVar(55, "px", size),
          "--switch-p": switchVar(2, "px", size),
          "--switch-thumb-h": switchVar(22, "px", size),
          "--switch-thumb-w": switchVar(32, "px", size),
          "--switch-travel": switchVar(19, "px", size),
          "--switch-thumb-border": switchVar(0.65, "px", size),
          "--switch-inset-shadow":
            size === "sm"
              ? "var(--shadow-switch-inset-sm)"
              : "var(--shadow-switch-inset)",
          "--switch-thumb-shadow":
            size === "sm"
              ? "var(--shadow-switch-thumb-sm)"
              : "var(--shadow-switch-thumb)",
          ...style,
        } as unknown as CSSProperties
      }
      className={cn(
        "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full outline-none",
        "h-(--switch-h) w-(--switch-w) p-(--switch-p)",
        "transition-[box-shadow,background-color] duration-300",
        "focus-visible:ring-2 focus-visible:ring-brand-border-focus",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        "data-unchecked:bg-neutral-200",
        "data-checked:bg-neutral-950 data-checked:shadow-[var(--switch-inset-shadow)]",
        "aria-invalid:ring-2 aria-invalid:ring-danger-solid",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none relative z-10 block rounded-full bg-neutral-50 ring-0",
          "h-(--switch-thumb-h) w-(--switch-thumb-w)",
          "border-[length:var(--switch-thumb-border)] border-neutral-0",
          "shadow-[var(--switch-thumb-shadow)] transition-transform duration-300",
          "group-data-unchecked/switch:translate-x-0",
          "group-data-checked/switch:translate-x-(--switch-travel)"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
