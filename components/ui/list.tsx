import type React from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Frame } from "@/components/ui/frame"
import { cn } from "@/lib/utils"

function ListColumns({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof Frame>) {
  return (
    <Frame
      data-slot="list-columns"
      variant={variant}
      className={className}
      {...props}
    />
  )
}

function ListHeader({
  className,
  weight = "regular",
  ...props
}: React.ComponentProps<"div"> & {
  weight?: "regular" | "medium"
}) {
  return (
    <div
      data-slot="list-header"
      className={cn(
        "flex w-full items-center p-4 text-sm text-fg",
        weight === "medium" ? "font-medium" : "font-normal",
        className
      )}
      {...props}
    />
  )
}

function List({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="list"
      className={cn(
        "flex w-full flex-col overflow-hidden bg-neutral-0 shadow-sm",
        "rounded-2xl group-data-[variant=thin]/frame:rounded-[12px]",
        className
      )}
      {...props}
    />
  )
}

type ListItemProps = React.ComponentProps<"li"> & {
  checkbox?: boolean
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  checkboxLabel?: string
  hoverable?: boolean
  trailing?: React.ReactNode
  trailingLayout?: "inline" | "stacked"
}

function ListItem({
  className,
  children,
  checkbox = false,
  checked,
  onCheckedChange,
  checkboxLabel = "Select item",
  hoverable = false,
  trailing,
  trailingLayout = "inline",
  onClick,
  ...props
}: ListItemProps) {
  return (
    <li
      data-slot="list-item"
      data-selection={checkbox ? "checkbox" : undefined}
      data-hoverable={hoverable ? "true" : undefined}
      className={cn(
        "flex gap-3 p-4 not-last:border-b not-last:border-neutral-150",
        hoverable && "transition-colors duration-150 hover:bg-neutral-50",
        trailingLayout === "stacked" ? "items-start" : "items-center",
        checkbox && "cursor-pointer",
        className
      )}
      onClick={(event) => {
        onClick?.(event)
        if (!checkbox || event.defaultPrevented) return

        const target = event.target as Element
        if (target.closest("button, a, input, textarea, select, [role=button], [data-slot=checkbox]")) return
        onCheckedChange?.(!Boolean(checked))
      }}
      {...props}
    >
      {children}
      {checkbox ? (
        <Checkbox size="md" className="ml-auto" checked={checked} onCheckedChange={onCheckedChange} aria-label={checkboxLabel} />
      ) : trailing ? (
        <div
          data-slot="list-item-trailing"
          data-layout={trailingLayout}
          className={cn(
            "ml-auto flex shrink-0",
            trailingLayout === "stacked" ? "flex-col items-end gap-2" : "items-center gap-2"
          )}
        >
          {trailing}
        </div>
      ) : null}
    </li>
  )
}

export { List, ListItem, ListColumns, ListHeader }
