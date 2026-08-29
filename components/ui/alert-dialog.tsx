"use client"

import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"

import { cn } from "@/lib/utils"

const AlertDialogActionsContext = React.createContext<React.RefObject<AlertDialogPrimitive.Root.Actions | null> | null>(
  null
)

function AlertDialog({
  actionsRef,
  ...props
}: AlertDialogPrimitive.Root.Props) {
  const internalActionsRef = React.useRef<AlertDialogPrimitive.Root.Actions | null>(null)

  React.useImperativeHandle(actionsRef, () => ({
    unmount: () => internalActionsRef.current?.unmount(),
    close: () => internalActionsRef.current?.close(),
  }))

  return (
    <AlertDialogActionsContext.Provider value={internalActionsRef}>
      <AlertDialogPrimitive.Root
        data-slot="alert-dialog"
        actionsRef={internalActionsRef}
        {...props}
      />
    </AlertDialogActionsContext.Provider>
  )
}

function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
}

function AlertDialogPortal({ ...props }: AlertDialogPrimitive.Portal.Props) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
}

function AlertDialogOverlay({
  className,
  onClick,
  ...props
}: AlertDialogPrimitive.Backdrop.Props) {
  const actionsRef = React.useContext(AlertDialogActionsContext)

  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 transition-opacity duration-[250ms] ease-[var(--ease-out)] supports-backdrop-filter:backdrop-blur-xs starting:opacity-0 data-[starting-style]:opacity-0 data-[ending-style]:pointer-events-none data-[ending-style]:opacity-0 motion-reduce:duration-200",
        className
      )}
      {...props}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        actionsRef?.current?.close()
      }}
    />
  )
}

function AlertDialogContent({ className, ...props }: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex w-[min(calc(100%-2rem),473px)] max-h-[calc(100dvh-2rem)] origin-center flex-col overflow-hidden rounded-[20px] bg-neutral-0 text-sm text-fg shadow-xl outline-none opacity-100 [transform:translate(-50%,-50%)_scale(1)] transition-[opacity,transform] duration-[250ms] ease-[var(--ease-out)] starting:opacity-0 starting:[transform:translate(-50%,-50%)_scale(0.96)] data-[starting-style]:opacity-0 data-[starting-style]:[transform:translate(-50%,-50%)_scale(0.96)] data-[ending-style]:opacity-0 data-[ending-style]:[transform:translate(-50%,-50%)_scale(0.96)] motion-reduce:transition-opacity motion-reduce:duration-200 motion-reduce:starting:[transform:translate(-50%,-50%)_scale(1)] motion-reduce:data-[starting-style]:[transform:translate(-50%,-50%)_scale(1)] motion-reduce:data-[ending-style]:[transform:translate(-50%,-50%)_scale(1)]",
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
}

function AlertDialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-body" className={cn("min-h-0 overflow-y-auto px-4 pt-4 pb-6", className)} {...props} />
}

function AlertDialogIcon({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-icon" className={cn("mb-4 flex size-8 items-center justify-center text-danger-fg [&_svg]:size-8", className)} {...props} />
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-header" className={cn("flex flex-col gap-2", className)} {...props} />
}

function AlertDialogFooter({ className, layout = "equal", children, ...props }: React.ComponentProps<"div"> & { layout?: "equal" | "end" }) {
  return <div data-slot="alert-dialog-footer" data-layout={layout} className={cn("flex min-h-15 shrink-0 items-center gap-2 border-t border-neutral-150 p-3", layout === "equal" ? "[&>*]:min-w-0 [&>*]:flex-1" : "justify-end", className)} {...props}>{children}</div>
}

function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props) {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn("text-lg leading-7 font-medium text-fg text-balance", className)} {...props} />
}

function AlertDialogDescription({ className, ...props }: AlertDialogPrimitive.Description.Props) {
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn("text-sm leading-5 text-fg-secondary text-pretty", className)} {...props} />
}

function AlertDialogCancel({ ...props }: AlertDialogPrimitive.Close.Props) {
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-cancel" {...props} />
}

function AlertDialogAction({ ...props }: AlertDialogPrimitive.Close.Props) {
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-action" {...props} />
}

export { AlertDialog, AlertDialogAction, AlertDialogBody, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogIcon, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogTrigger }
