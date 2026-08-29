import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      shadow: [
        {
          shadow: [
            "thin-border",
            "thin-sm",
            "thin-md",
            "thin-lg",
            "thin-xl",
            "switch-thumb",
            "switch-thumb-sm",
            "switch-inset",
            "switch-inset-sm",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Control heights: sm=32px, md=36px, lg=40px, xl=44px */
export type ControlSize = "sm" | "md" | "lg" | "xl" | "default"

export function controlHeightClass(size: ControlSize = "md"): string {
  switch (size) {
    case "sm":
      return "h-8"
    case "lg":
      return "h-10"
    case "xl":
      return "h-11"
    default:
      return "h-9"
  }
}

/** Control radius principle: 36px → 10px; 40px → 12px. Smaller/larger sizes inherit the nearest recipe. */
export function controlRadiusClass(size: ControlSize = "md"): string {
  return size === "lg" || size === "xl"
    ? "rounded-[12px]"
    : "rounded-[10px]"
}

/** Surface recipe for controls: plain neutral fields, normal elevation on white fields. */
export function controlSurfaceClass(
  size: ControlSize = "md",
  variant: "primary" | "secondary" = "primary"
): string {
  return cn(
    controlHeightClass(size),
    controlRadiusClass(size),
    "border-0 text-sm font-normal text-fg outline-none transition-[color,box-shadow,background-color] duration-150 focus-visible:ring-2 focus-visible:ring-brand-border-focus disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-fg-disabled disabled:shadow-none aria-invalid:ring-2 aria-invalid:ring-danger-solid",
    variant === "primary" ? "bg-neutral-100 shadow-none" : "bg-neutral-0 shadow-sm"
  )
}

/** Floating panels — one elevation token. */
export const floatingSurfaceClassName =
  "rounded-[14px] border-0 bg-neutral-0 shadow-xl outline-none"

/** @deprecated Use controlSurfaceClass */
export const fieldSurfaceClassName = controlSurfaceClass("md")
