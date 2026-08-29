"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { CloseIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return <DialogPrimitive.Backdrop data-slot="dialog-overlay" className={cn("fixed inset-0 isolate z-50 bg-black/10 duration-150 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:transition-none", className)} {...props} />
}

function DialogContent({ className, children, showCloseButton = false, ...props }: DialogPrimitive.Popup.Props & { showCloseButton?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup data-slot="dialog-content" className={cn("fixed top-1/2 left-1/2 z-50 flex w-[569px] max-w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[20px] bg-neutral-0 text-sm text-fg shadow-xl outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:transition-none", className)} {...props}>
        {children}
        {showCloseButton ? <DialogPrimitive.Close aria-label="Close dialog" data-slot="dialog-close" render={<Button variant="transparent" size="icon-sm" className="absolute top-3 right-3" />}><CloseIcon radius="0" className="size-[18px] text-fg" /></DialogPrimitive.Close> : null}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-body" className={cn("min-h-0 overflow-y-auto px-6 pt-6 pb-9", className)} {...props} />
}

type DialogStepDirection = -1 | 1

function DialogAutoHeight({ children }: { children: React.ReactNode }) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [height, setHeight] = React.useState<number>()
  const shouldReduceMotion = useReducedMotion()

  React.useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return

    const updateHeight = () => setHeight(content.offsetHeight)
    updateHeight()

    const observer = new ResizeObserver(updateHeight)
    observer.observe(content)

    return () => observer.disconnect()
  }, [])

  return (
    <motion.div
      data-slot="dialog-autoheight"
      aria-live="polite"
      initial={false}
      animate={height == null ? undefined : { height }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.22, ease: [0.4, 0, 0.2, 1] }
      }
      className="overflow-visible"
    >
      <div ref={contentRef} className="relative">
        {children}
      </div>
    </motion.div>
  )
}

function DialogStepBody({
  step,
  direction = 1,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  step: React.Key
  direction?: DialogStepDirection
}) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <DialogBody className={cn("flex-1", className)} {...props}>
      <DialogAutoHeight>
        <div
          data-slot="dialog-step-viewport"
          className="-mx-6 overflow-x-clip overflow-y-visible px-6"
        >
          <AnimatePresence initial={false} mode="popLayout" custom={direction}>
            <motion.div
              key={step}
              data-slot="dialog-step"
              custom={direction}
              initial={shouldReduceMotion ? false : "initial"}
              animate="active"
              exit={shouldReduceMotion ? "active" : "exit"}
              variants={{
                initial: (nextDirection: DialogStepDirection) => ({
                  x: `${nextDirection * 110}%`,
                  opacity: 0,
                }),
                active: {
                  x: "0%",
                  opacity: 1,
                  transition: shouldReduceMotion
                    ? { duration: 0 }
                    : {
                        x: { type: "spring", duration: 0.3, bounce: 0 },
                        opacity: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
                      },
                },
                exit: (nextDirection: DialogStepDirection) => ({
                  x: `${nextDirection * -110}%`,
                  opacity: 0,
                  transition: {
                    x: { duration: 0.18, ease: [0.4, 0, 1, 1] },
                    opacity: { duration: 0.16, ease: [0.4, 0, 1, 1] },
                  },
                }),
              }}
              className="w-full will-change-transform"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogAutoHeight>
    </DialogBody>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-2", className)} {...props} />
}

function DialogIcon({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-icon" className={cn("flex size-8 items-center justify-center text-danger-fg [&_svg]:size-8", className)} {...props} />
}

function DialogFooter({ className, separated = true, children, ...props }: React.ComponentProps<"div"> & { separated?: boolean }) {
  return <div data-slot="dialog-footer" className={cn("flex min-h-15 shrink-0 items-center justify-end gap-2 p-3", separated && "border-t border-neutral-150", className)} {...props}>{children}</div>
}

function DialogNotice({ className, icon, children, ...props }: React.ComponentProps<"div"> & { icon?: React.ReactNode }) {
  return <div data-slot="dialog-notice" className={cn("inline-flex items-center gap-1.5 rounded-[8px] p-2 text-sm leading-5 font-medium", className)} {...props}>{icon ? <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">{icon}</span> : null}{children}</div>
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-lg leading-7 font-medium text-fg text-balance", className)} {...props} />
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-sm leading-5 text-fg-secondary text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-fg", className)} {...props} />
}

export { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcon, DialogNotice, DialogOverlay, DialogPortal, DialogStepBody, DialogTitle, DialogTrigger, type DialogStepDirection }
