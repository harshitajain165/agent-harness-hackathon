"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type StepperProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Total number of steps. */
  count: number
  /** Zero-based index of the current step. */
  value: number
  /** Optional names used in the accessible progress announcement. */
  labels?: readonly string[]
  /** Removes the track fill while keeping the rounded container. */
  variant?: "default" | "ghost"
  /** When set, steps can be clicked and arrow-keyed. */
  onValueChange?: (value: number) => void
}

function Stepper({
  count,
  value,
  labels,
  variant = "default",
  onValueChange,
  className,
  "aria-label": ariaLabel = "Progress",
  ...props
}: StepperProps) {
  const normalizedCount = Number.isFinite(count) ? Math.floor(count) : 1
  const normalizedValue = Number.isFinite(value) ? Math.floor(value) : 0
  const safeCount = Math.max(1, normalizedCount)
  const safeValue = Math.min(Math.max(0, normalizedValue), safeCount - 1)
  const interactive = typeof onValueChange === "function"
  const stepName = labels?.[safeValue]
  const valueText = stepName
    ? `Step ${safeValue + 1} of ${safeCount}: ${stepName}`
    : `Step ${safeValue + 1} of ${safeCount}`

  function goTo(next: number) {
    const clamped = Math.min(Math.max(0, next), safeCount - 1)
    if (clamped !== safeValue) onValueChange?.(clamped)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!interactive) return
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault()
        goTo(safeValue + 1)
        break
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault()
        goTo(safeValue - 1)
        break
      case "Home":
        event.preventDefault()
        goTo(0)
        break
      case "End":
        event.preventDefault()
        goTo(safeCount - 1)
        break
      default:
        break
    }
  }

  return (
    <div
      data-slot="stepper"
      role={interactive ? "tablist" : "progressbar"}
      aria-label={ariaLabel}
      aria-valuemin={interactive ? undefined : 1}
      aria-valuemax={interactive ? undefined : safeCount}
      aria-valuenow={interactive ? undefined : safeValue + 1}
      aria-valuetext={interactive ? undefined : valueText}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={onKeyDown}
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 shadow-none",
        variant === "default" && "bg-neutral-100",
        interactive && "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-border-focus",
        className
      )}
      {...props}
    >
      {interactive ? null : <span className="sr-only">{valueText}</span>}
      <span aria-hidden={!interactive} className="flex items-center gap-1">
        {Array.from({ length: safeCount }, (_, index) => {
          const active = index === safeValue
          const label = labels?.[index] ?? `Step ${index + 1}`
          const mark = (
            <span
              data-slot="stepper-step"
              data-active={active ? "true" : undefined}
              data-complete={index < safeValue ? "true" : undefined}
              className={cn(
                "h-2 w-2 shrink-0 rounded-full bg-neutral-300",
                "transition-[width,background-color] duration-150 ease-[var(--ease-out)] motion-reduce:transition-none",
                "data-active:w-6 data-active:bg-neutral-950 data-complete:bg-neutral-400",
                interactive &&
                  "group-hover/step:bg-neutral-400 data-active:group-hover/step:bg-neutral-800"
              )}
            />
          )

          if (!interactive) return <React.Fragment key={index}>{mark}</React.Fragment>

          return (
            <button
              key={index}
              type="button"
              role="tab"
              aria-label={label}
              aria-selected={active}
              tabIndex={-1}
              className="group/step inline-flex h-5 items-center justify-center rounded-full"
              onClick={() => goTo(index)}
            >
              {mark}
            </button>
          )
        })}
      </span>
    </div>
  )
}

export { Stepper, type StepperProps }
