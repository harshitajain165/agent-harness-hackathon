"use client"

import * as React from "react"
import {
  Children,
  isValidElement,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Command as CommandPrimitive } from "cmdk"
import { motion, useReducedMotion } from "motion/react"

import {
  ArrowCornerDownLeftIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CloseIcon,
  SearchIcon,
} from "@/components/icons"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog"
import { Kbd } from "@/components/ui/kbd"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  menuSeparatorClassName,
  menuSurfaceClassName,
} from "@/lib/menu-styles"
import { cn } from "@/lib/utils"

const COMMAND_PANEL_HEIGHT = "min(25rem,calc(100dvh - 8rem))"
const COMMAND_STACK_PEEK_SPACE = "2.75rem"
/** 6px inset for search and list chrome. */
const COMMAND_INSET = "p-1.5"
/** 10px inset for footer chrome. */
const COMMAND_FOOTER_INSET = "p-2.5"
/** Room for shadow-xl hairline + blur so sides and bottom are not clipped. */
const COMMAND_SURFACE_INSET = "inset-x-3 bottom-3"
const COMMAND_DIALOG_POPUP_CLASS =
  "fixed top-1/2 left-1/2 z-50 flex w-[min(37.5rem,calc(100%-2rem))] max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-visible bg-transparent text-sm text-fg shadow-none outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:transition-none"

const commandItemBaseClassName =
  "relative flex w-full cursor-pointer outline-none select-none transition-colors duration-150 hover:bg-neutral-150 data-selected:bg-neutral-150 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0"

/** 40px row: 10px padding + 20px icon/text + 10px padding; 10px gap; 14px medium label. */
const COMMAND_ITEM_COMPACT_CLASS = cn(
  "min-h-10 items-center gap-2.5 rounded-[10px] py-2.5",
  "text-sm font-medium leading-5 text-fg",
  "[&_svg:not([class*='size-'])]:size-5",
  "[&_[data-slot=command-shortcut]]:ml-auto [&_[data-slot=command-shortcut]]:flex [&_[data-slot=command-shortcut]]:items-center"
)

/** 60px row: 10px padding + 40px media/two-line content + 10px padding. */
const COMMAND_ITEM_ENTITY_CLASS = cn(
  "min-h-[3.75rem] items-center gap-2.5 rounded-[10px] py-2.5",
  "[&_[data-slot=entity]]:min-w-0 [&_[data-slot=entity]]:flex-1 [&_[data-slot=entity]]:gap-2.5",
  "[&_[data-slot=entity-media]]:size-10 [&_[data-slot=entity-media]]:shrink-0 [&_[data-slot=entity-media]]:rounded-[10px]",
  "[&_[data-slot=entity-title]]:text-sm [&_[data-slot=entity-title]]:leading-5 [&_[data-slot=entity-title]]:font-medium",
  "[&_[data-slot=entity-description]]:text-sm [&_[data-slot=entity-description]]:leading-5 [&_[data-slot=entity-description]]:font-normal [&_[data-slot=entity-description]]:text-fg-secondary",
  "[&_svg:not([class*='size-'])]:size-5 [&_svg:not([data-slot=entity-media]_*)]:shrink-0"
)

function isCommandIconChild(child: ReactNode): boolean {
  if (!isValidElement(child)) return false
  const props = child.props as { "data-slot"?: string }
  if (props["data-slot"] === "icon") return true
  const type = child.type
  if (typeof type === "function") {
    const named = type as { displayName?: string; name?: string }
    const name = named.displayName ?? named.name ?? ""
    return name === "Icon" || /Icon$/.test(name)
  }
  return false
}

function treeHasEntityMedia(node: ReactNode): boolean {
  let found = false
  Children.forEach(node, (child) => {
    if (found || !isValidElement(child)) return
    const props = child.props as {
      "data-slot"?: string
      children?: ReactNode
    }
    if (props["data-slot"] === "entity-media") {
      found = true
      return
    }
    if (props.children && treeHasEntityMedia(props.children)) {
      found = true
    }
  })
  return found
}

function hasCommandLeadingVisual(children: ReactNode): boolean {
  const items = Children.toArray(children).filter(Boolean)
  if (items.length === 0) return false

  const first = items[0]
  if (isCommandIconChild(first)) return true

  if (isValidElement(first)) {
    const props = first.props as { "data-slot"?: string; children?: ReactNode }
    if (props["data-slot"] === "entity-media") return true
    if (props["data-slot"] === "entity" && treeHasEntityMedia(props.children)) {
      return true
    }
  }

  return false
}

/** Rows with a leading icon or media use 10px inset; text-only rows use 12px. */
function commandItemInsetPadding(children: ReactNode): string {
  return hasCommandLeadingVisual(children) ? "px-2.5" : "px-3"
}

const COMMAND_LIST_CLASS = "flex flex-col gap-0"
const COMMAND_GROUP_CLASS = cn(
  "overflow-hidden text-fg",
  "**:[[cmdk-group-heading]]:flex **:[[cmdk-group-heading]]:min-h-10 **:[[cmdk-group-heading]]:items-center",
  "**:[[cmdk-group-heading]]:px-1.5 **:[[cmdk-group-heading]]:pb-1.5 **:[[cmdk-group-heading]]:pt-3.5",
  "**:[[cmdk-group-heading]]:text-sm **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-fg-tertiary"
)

const commandFooterKbdClassName =
  "text-fg-secondary"
const STACK_SCALE_STEP = 0.08
const STACK_PEEK = -22
const STACK_VISIBLE = 3
const STACK_PRESS_SCALE = 0.96
const STACK_EASE = "var(--ease-out-quint)"

type PushPhase = "idle" | "pressing" | "settling"

type CommandStackContextValue = {
  host: HTMLElement | null
  depth: number
  frontDepth: number
  pushPhase: PushPhase
  pushSourceDepth: number | null
  registerLayer: (id: string, depth: number, open: boolean) => void
  beginPush: (sourceDepth: number) => void
  completePush: () => void
}

const CommandStackContext = React.createContext<CommandStackContextValue | null>(null)

function useCommandStack() {
  return React.useContext(CommandStackContext)
}

function useCommandNestedSelect(onOpen: () => void) {
  const stack = useCommandStack()

  const beginPress = React.useCallback(() => {
    if (!stack) return
    stack.beginPush(stack.depth)
  }, [stack])

  return {
    onPointerDown: beginPress,
    onMouseDown: beginPress,
    onPointerLeave: () => {
      if (
        stack?.pushPhase === "pressing" &&
        stack.pushSourceDepth === stack.depth
      ) {
        stack.completePush()
      }
    },
    onSelect: () => {
      onOpen()
      window.requestAnimationFrame(() => stack?.completePush())
    },
  }
}

function CommandStackCard({
  depth,
  frontDepth,
  pushPhase,
  pushSourceDepth,
  className,
  children,
}: {
  depth: number
  frontDepth: number
  pushPhase: PushPhase
  pushSourceDepth: number | null
  className?: string
  children: React.ReactNode
}) {
  const shouldReduceMotion = useReducedMotion()
  const behind = Math.max(0, frontDepth - depth)
  const isFront = behind === 0
  const hidden = behind >= STACK_VISIBLE
  const isPressSource = pushSourceDepth === depth
  const holdAsFront = isPressSource && pushPhase === "pressing"
  const effectiveBehind = holdAsFront ? 0 : behind
  const stackScale = 1 - effectiveBehind * STACK_SCALE_STEP
  const pressScale = isPressSource && pushPhase === "pressing" ? STACK_PRESS_SCALE : 1

  return (
    <motion.div
      data-slot="command-stack-card"
      data-front={isFront ? "" : undefined}
      initial={false}
      animate={{
        scale: stackScale * pressScale,
        y: effectiveBehind * STACK_PEEK,
        opacity: hidden ? 0 : 1,
      }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : isPressSource && pushPhase === "pressing"
            ? { duration: 0.08, ease: "easeOut" }
            : { duration: 0.22, ease: [0.23, 1, 0.32, 1] }
      }
      className={cn(
        "absolute flex origin-top flex-col overflow-visible",
        COMMAND_SURFACE_INSET,
        className
      )}
      style={{
        zIndex: holdAsFront ? frontDepth + 1 : depth,
        pointerEvents: isFront ? "auto" : "none",
        height: COMMAND_PANEL_HEIGHT,
        transitionTimingFunction: shouldReduceMotion ? undefined : STACK_EASE,
      }}
      aria-hidden={!isFront}
    >
      <div className={cn(menuSurfaceClassName, "flex h-full min-h-0 flex-col overflow-hidden")}>
        {children}
      </div>
    </motion.div>
  )
}

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex min-h-0 flex-col overflow-hidden text-sm text-fg",
        "in-data-[slot=command-stack-card]:h-full in-data-[slot=command-stack-card]:rounded-none in-data-[slot=command-stack-card]:bg-transparent in-data-[slot=command-stack-card]:shadow-none",
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: Omit<DialogPrimitive.Root.Props, "children" | "onOpenChange"> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
  onOpenChange?: (open: boolean, eventDetails?: DialogPrimitive.Root.ChangeEventDetails) => void
}) {
  const parent = useCommandStack()
  const nestedId = React.useId()
  const isNested = parent != null
  const depth = (parent?.depth ?? -1) + 1
  const isControlled = open !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false)
  const resolvedOpen = isControlled ? open : uncontrolledOpen
  const [host, setHost] = React.useState<HTMLElement | null>(null)
  const [openLayers, setOpenLayers] = React.useState<Map<string, number>>(() => new Map())
  const [pushPhase, setPushPhase] = React.useState<PushPhase>("idle")
  const [pushSourceDepth, setPushSourceDepth] = React.useState<number | null>(null)
  const settleTimer = React.useRef<number | null>(null)

  const registerLayer = React.useCallback((id: string, layerDepth: number, nextOpen: boolean) => {
    setOpenLayers((current) => {
      const has = current.has(id)
      if (nextOpen && has && current.get(id) === layerDepth) return current
      if (!nextOpen && !has) return current
      const next = new Map(current)
      if (nextOpen) next.set(id, layerDepth)
      else next.delete(id)
      return next
    })
  }, [])

  const emitOpenChange = React.useCallback(
    (nextOpen: boolean, eventDetails?: DialogPrimitive.Root.ChangeEventDetails) => {
      if (!isControlled) setUncontrolledOpen(nextOpen)
      onOpenChange?.(nextOpen, eventDetails)
    },
    [isControlled, onOpenChange]
  )

  const beginPush = React.useCallback((sourceDepth: number) => {
    if (settleTimer.current != null) window.clearTimeout(settleTimer.current)
    setPushSourceDepth(sourceDepth)
    setPushPhase("pressing")
  }, [])

  const completePush = React.useCallback(() => {
    setPushPhase("settling")
    settleTimer.current = window.setTimeout(() => {
      setPushPhase("idle")
      setPushSourceDepth(null)
      settleTimer.current = null
    }, 220)
  }, [])

  React.useEffect(() => {
    return () => {
      if (settleTimer.current != null) window.clearTimeout(settleTimer.current)
    }
  }, [])

  React.useEffect(() => {
    if (!parent) return
    parent.registerLayer(nestedId, depth, Boolean(resolvedOpen))
    return () => parent.registerLayer(nestedId, depth, false)
  }, [depth, nestedId, parent, resolvedOpen])

  React.useEffect(() => {
    if (!isNested || !resolvedOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      event.stopImmediatePropagation()
      emitOpenChange(false)
    }
    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  }, [emitOpenChange, isNested, resolvedOpen])

  const frontDepth = parent?.frontDepth ?? (openLayers.size === 0 ? 0 : Math.max(...openLayers.values()))
  const stackHost = parent?.host ?? host
  const inheritedPushPhase = parent?.pushPhase ?? pushPhase
  const inheritedPushSourceDepth = parent?.pushSourceDepth ?? pushSourceDepth

  const stackValue = React.useMemo(
    () => ({
      host: stackHost,
      depth,
      frontDepth,
      pushPhase: inheritedPushPhase,
      pushSourceDepth: inheritedPushSourceDepth,
      registerLayer: parent?.registerLayer ?? registerLayer,
      beginPush: parent?.beginPush ?? beginPush,
      completePush: parent?.completePush ?? completePush,
    }),
    [
      beginPush,
      completePush,
      depth,
      frontDepth,
      inheritedPushPhase,
      inheritedPushSourceDepth,
      parent?.beginPush,
      parent?.completePush,
      parent?.registerLayer,
      registerLayer,
      stackHost,
    ]
  )

  const panel = (
    <CommandStackCard
      depth={depth}
      frontDepth={frontDepth}
      pushPhase={inheritedPushPhase}
      pushSourceDepth={inheritedPushSourceDepth}
      className={className}
    >
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {children}
      {showCloseButton ? (
        <Button
          variant="transparent"
          size="icon-sm"
          aria-label="Close command"
          className="absolute top-3 right-3"
          onClick={() => emitOpenChange(false)}
        >
          <CloseIcon radius="0" className="size-[18px] text-fg" />
        </Button>
      ) : null}
    </CommandStackCard>
  )

  if (isNested) {
    return (
      <CommandStackContext.Provider value={stackValue}>
        {resolvedOpen && stackHost ? createPortal(panel, stackHost) : null}
      </CommandStackContext.Provider>
    )
  }

  return (
    <CommandStackContext.Provider value={stackValue}>
      <Dialog
        data-slot="command-dialog"
        open={resolvedOpen}
        onOpenChange={emitOpenChange}
        {...props}
      >
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Popup data-slot="command-dialog-content" className={COMMAND_DIALOG_POPUP_CLASS}>
            <div
              ref={setHost}
              data-slot="command-stack-host"
              className="relative w-full overflow-visible"
              style={{ height: `calc(${COMMAND_PANEL_HEIGHT} + ${COMMAND_STACK_PEEK_SPACE} + 0.75rem)` }}
            >
              {panel}
            </div>
          </DialogPrimitive.Popup>
        </DialogPortal>
      </Dialog>
    </CommandStackContext.Provider>
  )
}

function CommandInput({
  className,
  children,
  focusRing = "none",
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input> & {
  children?: React.ReactNode
  /** Search field focus ring. Defaults to none. */
  focusRing?: "none" | "ring"
}) {
  return (
    <div data-slot="command-input-wrapper" className={COMMAND_INSET}>
      <label
        className={cn(
          "relative flex items-center gap-2.5 rounded-[10px] bg-neutral-100 py-2.5 pl-2.5 text-sm text-fg-tertiary",
          children ? "pr-0.5" : "pr-2.5",
          "transition-[box-shadow] duration-150",
          focusRing === "ring" &&
            "focus-within:ring-2 focus-within:ring-brand-border-focus"
        )}
      >
        <SearchIcon className="size-5 shrink-0 text-fg-tertiary" />
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            "min-w-0 flex-1 bg-transparent text-sm font-medium leading-5 text-fg outline-none placeholder:font-normal placeholder:text-fg-tertiary",
            children && "pr-[42px]",
            className
          )}
          {...props}
        />
        {children ? (
          <div className="absolute top-1/2 right-0.5 -translate-y-1/2 shrink-0">
            {children}
          </div>
        ) : null}
      </label>
    </div>
  )
}

function CommandList({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <ScrollArea
      scrollFade
      viewportRef={ref}
      className="max-h-[min(20rem,calc(100dvh-14rem))] min-h-0 flex-1 px-1.5 pb-1.5 pt-0"
      viewportClassName="max-h-[inherit] overscroll-contain focus-visible:ring-0"
    >
      <CommandPrimitive.List
        data-slot="command-list"
        className={cn(COMMAND_LIST_CLASS, className)}
        {...props}
      />
    </ScrollArea>
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-6 text-center text-sm text-fg-secondary", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(COMMAND_GROUP_CLASS, className)}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn(menuSeparatorClassName, "mx-0", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  layout = "compact",
  nestedSelect,
  children,
  onSelect,
  onPointerDown,
  onMouseDown,
  onPointerLeave,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item> & {
  layout?: "compact" | "entity"
  nestedSelect?: () => void
}) {
  const stack = useCommandStack()

  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      data-layout={layout === "entity" ? "entity" : undefined}
      className={cn(
        commandItemBaseClassName,
        layout === "entity" ? COMMAND_ITEM_ENTITY_CLASS : COMMAND_ITEM_COMPACT_CLASS,
        commandItemInsetPadding(children),
        className
      )}
      onPointerDown={(event) => {
        if (nestedSelect) stack?.beginPush(stack.depth)
        onPointerDown?.(event)
      }}
      onMouseDown={(event) => {
        if (nestedSelect) stack?.beginPush(stack.depth)
        onMouseDown?.(event)
      }}
      onPointerLeave={(event) => {
        if (
          nestedSelect &&
          stack?.pushPhase === "pressing" &&
          stack.pushSourceDepth === stack.depth
        ) {
          stack.completePush()
        }
        onPointerLeave?.(event)
      }}
      onSelect={(value) => {
        if (nestedSelect) {
          nestedSelect()
          window.requestAnimationFrame(() => stack?.completePush())
          return
        }
        onSelect?.(value)
      }}
      {...props}
    >
      {children}
    </CommandPrimitive.Item>
  )
}

function CommandShortcut({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn("ml-auto flex shrink-0 items-center", className)}
      {...props}
    >
      <Kbd>{children}</Kbd>
    </span>
  )
}

function CommandFooter({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="command-footer"
      className={cn(
        COMMAND_FOOTER_INSET,
        "flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 border-t border-neutral-150 bg-neutral-50 text-sm font-normal text-fg shadow-[0_-4px_7px_3px_#FFFFFFCC]",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <span className="flex items-center gap-1.5 text-sm font-normal text-fg-tertiary">
            <Kbd className={commandFooterKbdClassName}>
              <ArrowUpIcon size={12} />
            </Kbd>
            <Kbd className={commandFooterKbdClassName}>
              <ArrowDownIcon size={12} />
            </Kbd>
            to navigate
          </span>
          <span className="flex items-center gap-1.5 text-sm font-normal text-fg-tertiary">
            <Kbd className={commandFooterKbdClassName}>
              <ArrowCornerDownLeftIcon size={12} />
            </Kbd>
            to select
          </span>
          <span className="flex items-center gap-1.5 text-sm font-normal text-fg-tertiary">
            <Kbd className={commandFooterKbdClassName}>esc</Kbd>
            to close
          </span>
        </>
      )}
    </div>
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
  CommandFooter,
  useCommandNestedSelect,
}
