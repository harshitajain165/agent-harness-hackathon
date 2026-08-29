"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  XIcon,
  CircleCheckIcon,
  CircleInfoIcon,
  TriangleAlertIcon,
  CircleXIcon,
  LoaderIcon,
} from "@/components/icons"

type ToastPosition =
  | "bottom-center"
  | "bottom-right"
  | "top-center"
  | "top-right"

type ToastVariant = "default" | "dark"

type ToastData = {
  closeButton?: boolean
  progress?: boolean
  variant?: ToastVariant
}

const toastPositions: ToastPosition[] = [
  "bottom-center",
  "bottom-right",
  "top-center",
  "top-right",
]

const toastManagers: Record<
  ToastPosition,
  ReturnType<typeof ToastPrimitive.createToastManager<ToastData>>
> = {
  "bottom-center": ToastPrimitive.createToastManager<ToastData>(),
  "bottom-right": ToastPrimitive.createToastManager<ToastData>(),
  "top-center": ToastPrimitive.createToastManager<ToastData>(),
  "top-right": ToastPrimitive.createToastManager<ToastData>(),
}

const toastManager = toastManagers["bottom-right"]

type ToastOptions = Parameters<typeof toastManager.add>[0]
type ToastInputOptions = Omit<ToastOptions, "data" | "title"> &
  ToastData & { position?: ToastPosition }

type ToastFn = {
  (message: string, options?: ToastInputOptions): string
  dark: (message: string, options?: Omit<ToastInputOptions, "variant">) => string
  error: (message: string, options?: Omit<ToastInputOptions, "type">) => string
  info: (message: string, options?: Omit<ToastInputOptions, "type">) => string
  progress: (message: string, options?: Omit<ToastInputOptions, "progress">) => string
  success: (message: string, options?: Omit<ToastInputOptions, "type">) => string
  warning: (message: string, options?: Omit<ToastInputOptions, "type">) => string
}

function createToastFn(): ToastFn {
  const add = (message: string, options: ToastInputOptions = {}) => {
    const { closeButton, position, progress, variant, ...toastOptions } = options
    return toastManagers[position ?? "bottom-right"].add({
      title: message,
      ...toastOptions,
      data: { closeButton, progress, variant },
    })
  }

  const fn = ((message: string, options?: ToastInputOptions) =>
    add(message, options)) as ToastFn

  fn.success = (message, options) =>
    add(message, { type: "success", ...options })
  fn.info = (message, options) =>
    add(message, { type: "info", ...options })
  fn.warning = (message, options) =>
    add(message, { type: "warning", ...options })
  fn.error = (message, options) =>
    add(message, { type: "error", ...options })
  fn.dark = (message, options) => add(message, { variant: "dark", ...options })
  fn.progress = (message, options) =>
    add(message, { progress: true, timeout: 5000, ...options })

  return fn
}

const toast = createToastFn()

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />
}

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />
}

function ToastViewport({
  className,
  position,
  ...props
}: ToastPrimitive.Viewport.Props & { position: ToastPosition }) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      data-position={position}
      aria-label={`Notifications (${position})`}
      className={cn(
        "pointer-events-none fixed z-50 w-[min(calc(100vw-2rem),26.875rem)] outline-none",
        position === "bottom-center" && "bottom-4 left-1/2 -translate-x-1/2",
        position === "bottom-right" && "right-4 bottom-4",
        position === "top-center" && "top-4 left-1/2 -translate-x-1/2",
        position === "top-right" && "top-4 right-4",
        className
      )}
      {...props}
    />
  )
}

function Toast({
  className,
  front = false,
  position = "bottom-right",
  variant = "default",
  ...props
}: ToastPrimitive.Root.Props & {
  front?: boolean
  position?: ToastPosition
  variant?: ToastVariant
}) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      data-front={front}
      data-position={position}
      data-variant={variant}
      swipeDirection={position.startsWith("top") ? "up" : "down"}
      className={cn(
        "toast-stack-item group/toast pointer-events-auto w-full rounded-xl border-0 bg-neutral-0 text-fg shadow-[0_0_0_1px_rgb(0_0_0_/_0.06),0_12px_32px_-16px_rgb(0_0_0_/_0.15),0_8px_40px_-4px_rgb(0_0_0_/_0.06)] outline-none select-none focus-visible:ring-2 focus-visible:ring-brand-border-focus data-[variant=dark]:bg-black/80 data-[variant=dark]:text-on-inverted data-[variant=dark]:backdrop-blur-[3px]",
        className
      )}
      {...props}
    />
  )
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        "relative z-10 flex h-full min-h-12 items-center gap-3 overflow-hidden rounded-xl px-3 py-2 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-behind:opacity-0 data-expanded:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("text-sm leading-5 font-medium group-data-[variant=dark]/toast:text-on-inverted", className)}
      {...props}
    />
  )
}

function ToastDescription({
  className,
  ...props
}: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("text-sm leading-5 text-fg-secondary group-data-[variant=dark]/toast:text-white/70", className)}
      {...props}
    />
  )
}

function ToastAction({
  className,
  render = <Button variant="secondary" size="sm" />,
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      className={cn("shrink-0 group-data-[variant=dark]/toast:bg-white/15 group-data-[variant=dark]/toast:text-on-inverted group-data-[variant=dark]/toast:hover:bg-white/20", className)}
      {...props}
    />
  )
}

function ToastClose({
  className,
  children,
  render = <Button variant="transparent" size="icon-sm" />,
  ...props
}: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Close toast"
      render={render}
      className={cn(
        "relative shrink-0 text-fg-secondary after:absolute after:-inset-2 after:content-[''] hover:text-fg group-data-[variant=dark]/toast:text-white/60 group-data-[variant=dark]/toast:hover:text-on-inverted",
        className
      )}
      {...props}
    >
      {children ?? (
        <XIcon aria-hidden="true" />
      )}
    </ToastPrimitive.Close>
  )
}

function ToastIcon({ type }: { type: string | undefined }) {
  let icon: React.ReactNode = null

  if (type === "success") {
    icon = (
      <CircleCheckIcon aria-hidden="true" />
    )
  }

  if (type === "info") {
    icon = (
      <CircleInfoIcon aria-hidden="true" />
    )
  }

  if (type === "warning") {
    icon = (
      <TriangleAlertIcon aria-hidden="true" />
    )
  }

  if (type === "error") {
    icon = (
      <CircleXIcon className="text-destructive" aria-hidden="true" />
    )
  }

  if (type === "loading") {
    icon = (
      <LoaderIcon className="animate-spin" aria-hidden="true" />
    )
  }

  if (!icon) {
    return null
  }

  return (
    <span
      data-slot="toast-icon"
      className="shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4"
    >
      {icon}
    </span>
  )
}

function ToastProgress({ timeout }: { timeout: number }) {
  return (
    <span
      data-slot="toast-progress"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl bg-transparent"
    >
      <span
        className="block h-full origin-left bg-fg/[0.06] motion-reduce:animate-none group-data-[expanded]/toast:[animation-play-state:paused] group-data-[variant=dark]/toast:bg-white/[0.12] animate-[toast-progress_var(--toast-duration)_linear_forwards]"
        style={{ "--toast-duration": `${timeout}ms` } as React.CSSProperties}
      />
    </span>
  )
}

function ToastList({
  position,
  timeout: defaultTimeout = 5000,
}: {
  position: ToastPosition
  timeout?: number
}) {
  const { toasts } = ToastPrimitive.useToastManager()
  const frontActiveIndex = toasts.findIndex(
    (toastItem) => toastItem.transitionStatus !== "ending"
  )

  return toasts.map((toastItem, index) => {
    const timeout = toastItem.timeout ?? defaultTimeout
    const showProgress = toastItem.data?.progress && timeout > 0

    return (
      <Toast
        key={toastItem.id}
        front={index === 0 || index === frontActiveIndex}
        toast={toastItem}
        position={position}
        variant={toastItem.data?.variant}
      >
        <ToastContent>
          <ToastIcon type={toastItem.type} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <ToastTitle />
            {toastItem.description ? <ToastDescription /> : null}
          </div>
          {toastItem.actionProps ? <ToastAction {...toastItem.actionProps} /> : null}
          {toastItem.data?.closeButton ? <ToastClose /> : null}
        </ToastContent>
        {showProgress ? <ToastProgress timeout={timeout} /> : null}
      </Toast>
    )
  })
}

function Toaster({
  children,
  toastManager: toastManagerProp = toastManager,
  timeout,
  ...props
}: ToastPrimitive.Provider.Props) {
  return (
    <>
      <ToastProvider toastManager={toastManagerProp} timeout={timeout} {...props}>
        {children}
        <ToastPortal>
          <ToastViewport position="bottom-right">
            <ToastList position="bottom-right" timeout={timeout} />
          </ToastViewport>
        </ToastPortal>
      </ToastProvider>
      {toastPositions.filter((position) => position !== "bottom-right").map((position) => (
        <ToastProvider key={position} toastManager={toastManagers[position]} timeout={timeout} {...props}>
          <ToastPortal>
            <ToastViewport position={position}>
              <ToastList position={position} timeout={timeout} />
            </ToastViewport>
          </ToastPortal>
        </ToastProvider>
      ))}
    </>
  )
}

const createToastManager = ToastPrimitive.createToastManager
const useToastManager = ToastPrimitive.useToastManager

export {
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastPosition,
  type ToastVariant,
  createToastManager,
  toast,
  toastManager,
  useToastManager,
}
