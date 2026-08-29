"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-lg bg-neutral-150 motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

const SkeletonRevealContext = React.createContext<{ revealed: boolean } | null>(null)

function SkeletonReveal({
  revealed,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  revealed: boolean
}) {
  const nodeRef = React.useRef<HTMLDivElement>(null)
  const revealedRef = React.useRef(revealed)
  revealedRef.current = revealed

  const setRef = React.useCallback((node: HTMLDivElement | null) => {
    nodeRef.current = node
    if (node && revealedRef.current) node.setAttribute("data-revealed", "")
  }, [])

  React.useLayoutEffect(() => {
    const node = nodeRef.current
    if (!node) return

    const isRevealed = node.hasAttribute("data-revealed")
    if (revealed && !isRevealed) {
      node.setAttribute("data-revealed", "")
      return
    }
    if (!revealed && isRevealed) {
      node.setAttribute("data-resetting", "")
      node.removeAttribute("data-revealed")
      void node.offsetWidth
      node.removeAttribute("data-resetting")
    }
  }, [revealed])

  return (
    <SkeletonRevealContext.Provider value={{ revealed }}>
      <div
        ref={setRef}
        data-slot="skeleton-reveal"
        aria-busy={!revealed}
        className={className}
        {...props}
      >
        {children}
      </div>
    </SkeletonRevealContext.Provider>
  )
}

function SkeletonRevealSkeleton({
  className,
  pulsing,
  ...props
}: React.ComponentProps<"div"> & {
  pulsing?: boolean
}) {
  const ctx = React.useContext(SkeletonRevealContext)
  const isPulsing = pulsing ?? !ctx?.revealed

  return (
    <div
      data-slot="skeleton-reveal-skeleton"
      data-pulsing={isPulsing ? "" : undefined}
      aria-hidden={ctx?.revealed}
      className={cn("flex w-full min-w-0 items-start gap-3", className)}
      {...props}
    />
  )
}

function SkeletonRevealContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const ctx = React.useContext(SkeletonRevealContext)

  return (
    <div
      data-slot="skeleton-reveal-content"
      aria-hidden={!ctx?.revealed}
      className={cn("flex w-full min-w-0 items-start gap-3", className)}
      {...props}
    />
  )
}

export {
  Skeleton,
  SkeletonReveal,
  SkeletonRevealContent,
  SkeletonRevealSkeleton,
}
