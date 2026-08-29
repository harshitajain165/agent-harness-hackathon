"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import type { VariantProps } from "class-variance-authority";

import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "@/components/icons";
import { MenuCheckboxIndicator } from "@/components/ui/menu-checkbox-indicator";
import {
  controlPaddingTrailingIconClassName,
  inputGroupVariants,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  menuItemClassName,
  menuItemStackClassName,
  menuLabelClassName,
  menuPopupMotionClassName,
  menuSeparatorClassName,
  menuSurfaceClassName,
} from "@/lib/menu-styles";
import { cn } from "@/lib/utils";

function Select<Value>(props: Omit<SelectPrimitive.Root.Props<Value, false>, "multiple">) {
  return <SelectPrimitive.Root {...props} />;
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return <SelectPrimitive.Group data-slot="select-group" className={cn("flex flex-col gap-0", className)} {...props} />;
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return <SelectPrimitive.Value data-slot="select-value" className={cn("min-w-0 flex-1 truncate text-left", className)} {...props} />;
}

function SelectMultipleValue({
  className,
  placeholder = "Select options",
  plural,
}: {
  className?: string;
  placeholder?: React.ReactNode;
  plural: string;
}) {
  return (
    <SelectValue className={className} placeholder={placeholder}>
      {(value: unknown) => {
        const selected = Array.isArray(value) ? value : [];
        if (selected.length === 0) return placeholder;
        if (selected.length === 1) return String(selected[0]);
        return `${selected.length} ${plural}`;
      }}
    </SelectValue>
  );
}

function SelectTrigger({ className, size = "sm", variant = "primary", children, ...props }: Omit<SelectPrimitive.Trigger.Props, "size"> & VariantProps<typeof inputGroupVariants>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      data-variant={variant}
      className={cn(
        inputGroupVariants({ variant, size }),
        controlPaddingTrailingIconClassName,
        "cursor-pointer items-center justify-between text-left outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-border-focus disabled:cursor-not-allowed disabled:opacity-100 data-placeholder:text-fg-tertiary",
        variant === "secondary" ? "hover:bg-neutral-50" : "hover:bg-neutral-150",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDownIcon radius="0" className="size-4 shrink-0 text-fg" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({ className, children, side = "bottom", sideOffset = 6, align = "start", alignOffset = 0, alignItemWithTrigger = false, ...props }: SelectPrimitive.Popup.Props & Pick<SelectPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger">) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner side={side} sideOffset={sideOffset} align={align} alignOffset={alignOffset} alignItemWithTrigger={alignItemWithTrigger} className="isolate z-50 outline-none">
        <SelectPrimitive.Popup data-slot="select-content" className={cn(menuSurfaceClassName, menuPopupMotionClassName, "w-(--anchor-width) min-w-36 max-w-(--available-width) overflow-hidden", className)} {...props}>
          <ScrollArea className="max-h-[inherit]" viewportClassName="max-h-[inherit]" scrollFade>
            <SelectPrimitive.List className={menuItemStackClassName}>{children}</SelectPrimitive.List>
          </ScrollArea>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return <SelectPrimitive.GroupLabel data-slot="select-label" className={cn(menuLabelClassName, className)} {...props} />;
}

function SelectItem({
  className,
  children,
  description,
  selection = "single",
  indicatorPosition = "leading",
  leading,
  ...props
}: SelectPrimitive.Item.Props & {
  description?: string;
  selection?: "single" | "multiple";
  indicatorPosition?: "leading" | "trailing";
  /** Optional content before the label, commonly a product icon. */
  leading?: React.ReactNode;
}) {
  const multipleIndicator = (checked: boolean) => (
    <span
      className={cn("flex size-4 shrink-0 items-center justify-center", indicatorPosition === "trailing" && "ml-auto")}
      data-slot="select-item-checkbox"
    >
      <MenuCheckboxIndicator checked={checked} size="sm" />
    </span>
  );

  const descriptionSingleIndicator = (selected: boolean) => (
    <span
      data-slot="select-item-selected"
      className="ml-4 flex size-5 shrink-0 items-center justify-center"
    >
      {selected ? (
        <CheckIcon data-slot="select-check" radius="0" className="size-5 text-fg" />
      ) : null}
    </span>
  );

  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      data-selection={selection}
      className={cn(
        menuItemClassName,
        description && "items-center whitespace-normal py-2",
        "group/select-item transition-colors hover:bg-neutral-100 data-highlighted:bg-neutral-100",
        className
      )}
      {...props}
      render={(itemProps, state) => (
        <div {...itemProps}>
          {selection === "multiple" && indicatorPosition === "leading" ? multipleIndicator(state.selected) : null}
          {leading ? <span data-slot="select-item-leading" className="flex shrink-0">{leading}</span> : null}
          {description ? (
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <SelectPrimitive.ItemText className="font-medium">{children}</SelectPrimitive.ItemText>
              <span className="font-normal text-pretty text-fg-secondary">{description}</span>
            </span>
          ) : (
            <SelectPrimitive.ItemText className="min-w-0 flex-1 truncate">{children}</SelectPrimitive.ItemText>
          )}
          {selection === "single" && description ? (
            descriptionSingleIndicator(state.selected)
          ) : (
            <SelectPrimitive.ItemIndicator className={cn("ml-auto flex size-[18px] shrink-0 items-center justify-center", selection === "single" ? "" : "hidden")}>
              <CheckIcon radius="0" className="size-[18px] text-fg" />
            </SelectPrimitive.ItemIndicator>
          )}
          {selection === "multiple" && indicatorPosition === "trailing" ? multipleIndicator(state.selected) : null}
        </div>
      )}
    />
  );
}

function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return <SelectPrimitive.Separator data-slot="select-separator" className={cn(menuSeparatorClassName, className)} {...props} />;
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return <SelectPrimitive.ScrollUpArrow data-slot="select-scroll-up-button" className={cn("sticky top-0 z-10 flex h-8 w-full items-center justify-center bg-neutral-0 text-fg", className)} {...props}><ChevronUpIcon radius="0" className="size-[18px]" /></SelectPrimitive.ScrollUpArrow>;
}

function SelectScrollDownButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return <SelectPrimitive.ScrollDownArrow data-slot="select-scroll-down-button" className={cn("sticky bottom-0 z-10 flex h-8 w-full items-center justify-center bg-neutral-0 text-fg", className)} {...props}><ChevronDownIcon radius="0" className="size-[18px]" /></SelectPrimitive.ScrollDownArrow>;
}

export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectMultipleValue, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue };
