"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import type { VariantProps } from "class-variance-authority";

import { CheckIcon, ChevronDownIcon, XIcon } from "@/components/icons";
import { chipRemoveVariants, chipVariants, type ChipFill, type ChipVariant } from "@/components/ui/chip";
import { MenuCheckboxIndicator } from "@/components/ui/menu-checkbox-indicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  controlPaddingTrailingIconClassName,
  inputGroupVariants,
} from "@/components/ui/input-group";
import {
  menuItemClassName,
  menuItemStackClassName,
  menuLabelClassName,
  menuPopupMotionClassName,
  menuSearchInputClassName,
  menuSeparatorClassName,
  menuSurfaceClassName,
} from "@/lib/menu-styles";
import { cn } from "@/lib/utils";

const ComboboxModeContext = React.createContext(false);

const ComboboxFilteringContext = React.createContext(false);

const ComboboxChipFillContext = React.createContext<ChipFill>("container");

function comboboxChipFillForInput(
  variant: "primary" | "secondary" | null | undefined
): ChipFill {
  return variant === "secondary" ? "neutral" : "container";
}

function Combobox<Value, Multiple extends boolean | undefined = false>({
  multiple,
  autoHighlight = true,
  onInputValueChange,
  ...props
}: ComboboxPrimitive.Root.Props<Value, Multiple>) {
  const [isFiltering, setIsFiltering] = React.useState(false);

  return (
    <ComboboxModeContext.Provider value={multiple === true}>
      <ComboboxFilteringContext.Provider value={isFiltering}>
        <ComboboxPrimitive.Root
          autoHighlight={autoHighlight}
          multiple={multiple}
          onInputValueChange={(inputValue, eventDetails) => {
            setIsFiltering(inputValue.trim().length > 0);
            onInputValueChange?.(inputValue, eventDetails);
          }}
          {...props}
        />
      </ComboboxFilteringContext.Provider>
    </ComboboxModeContext.Provider>
  );
}

function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

function ComboboxCountValue({
  plural,
  placeholder = "Select",
}: {
  plural: string;
  placeholder?: string;
}) {
  return (
    <ComboboxValue data-slot="combobox-count-value">
      {(values: string[]) => {
        if (!values.length) return placeholder;
        if (values.length === 1) return values[0];
        return `${values.length} ${plural}`;
      }}
    </ComboboxValue>
  );
}

function ComboboxTrigger({
  className,
  children,
  variant = "primary",
  size = "sm",
  ...props
}: Omit<ComboboxPrimitive.Trigger.Props, "size"> &
  VariantProps<typeof inputGroupVariants>) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      data-variant={variant}
      data-size={size}
      className={cn(
        inputGroupVariants({ variant, size }),
        controlPaddingTrailingIconClassName,
        "cursor-pointer items-center justify-between text-left outline-none transition-[box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-brand-border-focus disabled:cursor-not-allowed",
        "[&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon
        radius="0"
        className="pointer-events-none size-4 text-fg"
      />
    </ComboboxPrimitive.Trigger>
  );
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      render={<InputGroupButton variant="transparent" size="icon-xs" />}
      className={cn(className)}
      {...props}
    >
      <XIcon className="pointer-events-none" />
    </ComboboxPrimitive.Clear>
  );
}

function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  variant = "primary",
  size = "sm",
  ...props
}: Omit<ComboboxPrimitive.Input.Props, "size"> & {
  showTrigger?: boolean;
  showClear?: boolean;
} &
  VariantProps<typeof inputGroupVariants>) {
  return (
    <InputGroup
      variant={variant}
      size={size}
      className={cn("w-auto text-sm", className)}
    >
      <ComboboxPrimitive.Input
        render={
          <InputGroupInput
            disabled={disabled}
            className="placeholder:text-fg-tertiary"
          />
        }
        {...props}
      />
      <InputGroupAddon align="inline-end">
        {showTrigger && (
          <InputGroupButton
            size="icon-xs"
            variant="transparent"
            render={<ComboboxPrimitive.Trigger />}
            data-slot="input-group-button"
            className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
            disabled={disabled}
          >
            <ChevronDownIcon
              radius="0"
              className="pointer-events-none size-4 text-fg"
            />
          </InputGroupButton>
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
      </InputGroupAddon>
      {children}
    </InputGroup>
  );
}

function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  children,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
  >) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50 outline-none"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-chips={!!anchor}
          className={cn(
            menuSurfaceClassName,
            menuPopupMotionClassName,
            "group/combobox-content w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] data-[chips=true]:min-w-(--anchor-width)",
            className
          )}
          {...props}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ScrollArea
      scrollFade
      className="max-h-[min(--spacing(72),var(--available-height))] min-h-0 has-[[data-slot=combobox-list][data-empty]]:hidden"
      viewportClassName="max-h-[inherit] overscroll-contain focus-visible:ring-0"
    >
      <ComboboxPrimitive.List
        data-slot="combobox-list"
        className={cn(menuItemStackClassName, "data-empty:p-0", className)}
        {...props}
      />
    </ScrollArea>
  );
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  const multiple = React.useContext(ComboboxModeContext);

  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        menuItemClassName,
        className
      )}
      {...props}
      render={(itemProps, state) => (
        <div {...itemProps}>
          <span className="min-w-0 flex-1">{children}</span>
          {multiple ? (
            <span data-slot="combobox-item-checkbox" className="ml-auto flex size-4 shrink-0 items-center justify-center">
              <MenuCheckboxIndicator checked={state.selected} size="sm" />
            </span>
          ) : (
            <ComboboxPrimitive.ItemIndicator className="ml-auto flex size-[18px] shrink-0 items-center justify-center">
              <CheckIcon data-slot="dropdown-check" radius="0" className="size-[18px] text-fg" />
            </ComboboxPrimitive.ItemIndicator>
          )}
        </div>
      )}
    />
  );
}

function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={cn("flex flex-col gap-0", className)}
      {...props}
    />
  );
}

function ComboboxLabel({
  className,
  ...props
}: ComboboxPrimitive.GroupLabel.Props) {
  const isFiltering = React.useContext(ComboboxFilteringContext);

  if (isFiltering) {
    return null;
  }

  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn(menuLabelClassName, className)}
      {...props}
    />
  );
}

function ComboboxCollection({ ...props }: ComboboxPrimitive.Collection.Props) {
  return (
    <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />
  );
}

function ComboboxSelectionGroups<Value>({
  selected,
  children,
  selectedLabel,
  unselectedLabel,
  isItemEqualToValue = Object.is,
}: {
  selected: readonly Value[];
  children: (item: Value, index: number) => React.ReactNode;
  selectedLabel?: React.ReactNode;
  unselectedLabel?: React.ReactNode;
  isItemEqualToValue?: (item: Value, value: Value) => boolean;
}) {
  const filteredItems = ComboboxPrimitive.useFilteredItems() as readonly Value[];
  const isFiltering = React.useContext(ComboboxFilteringContext);
  const selectedItems = filteredItems.filter((item) =>
    selected.some((value) => isItemEqualToValue(item, value))
  );
  const unselectedItems = filteredItems.filter(
    (item) => !selected.some((value) => isItemEqualToValue(item, value))
  );

  return (
    <>
      {selectedItems.length > 0 ? (
        <ComboboxGroup items={selectedItems}>
          {!isFiltering && selectedLabel ? (
            <ComboboxLabel>{selectedLabel}</ComboboxLabel>
          ) : null}
          <ComboboxCollection>{children}</ComboboxCollection>
        </ComboboxGroup>
      ) : null}
      {unselectedItems.length > 0 ? (
        <ComboboxGroup items={unselectedItems} className={selectedItems.length > 0 ? "mt-1.5 border-t border-neutral-150 pt-1.5" : undefined}>
          {!isFiltering && unselectedLabel ? (
            <ComboboxLabel>{unselectedLabel}</ComboboxLabel>
          ) : null}
          <ComboboxCollection>{children}</ComboboxCollection>
        </ComboboxGroup>
      ) : null}
    </>
  );
}

function ComboboxEmpty({ className, children, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "hidden px-1.5 py-1.5 group-data-empty/combobox-content:block",
        className
      )}
      {...props}
    >
      <div
        data-slot="combobox-empty-row"
        className="flex min-h-8 items-center rounded-lg px-2 py-1.5 text-sm font-normal text-fg-secondary"
      >
        {children}
      </div>
    </ComboboxPrimitive.Empty>
  );
}

function ComboboxSeparator({
  className,
  ...props
}: ComboboxPrimitive.Separator.Props) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn(menuSeparatorClassName, className)}
      {...props}
    />
  );
}

function ComboboxChips({
  className,
  variant = "primary",
  size = "sm",
  ...props
}: Omit<React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips>, "size"> &
  Omit<ComboboxPrimitive.Chips.Props, "size"> &
  VariantProps<typeof inputGroupVariants>) {
  const chipFill = comboboxChipFillForInput(variant);

  return (
    <ComboboxChipFillContext.Provider value={chipFill}>
      <ComboboxPrimitive.Chips
        data-slot="combobox-chips"
        data-variant={variant}
        data-size={size}
        className={cn(
          inputGroupVariants({ variant, size }),
          "h-auto min-h-9 flex-wrap items-center gap-1 focus-within:ring-2 focus-within:ring-brand-border-focus has-aria-invalid:ring-2 has-aria-invalid:ring-danger-solid has-data-[slot=combobox-chip]:px-1.5 has-data-[slot=combobox-chip]:py-1 has-not-data-[slot=combobox-chip]:px-3 has-not-data-[slot=combobox-chip]:py-0",
          className
        )}
        {...props}
      />
    </ComboboxChipFillContext.Provider>
  );
}

function ComboboxChip({
  className,
  children,
  showRemove = true,
  variant = "md",
  fill,
  ...props
}: ComboboxPrimitive.Chip.Props & {
  showRemove?: boolean;
  /** Chip surface: md (24px), sm (20px), or inline (20px, text-sm for prose). */
  variant?: ChipVariant;
  /** Chip fill. Defaults to the inverse of the parent ComboboxChips input surface. */
  fill?: ChipFill;
}) {
  const contextFill = React.useContext(ComboboxChipFillContext);
  const resolvedFill = fill ?? contextFill;

  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      data-variant={variant}
      data-fill={resolvedFill}
      className={cn(
        chipVariants({ variant, fill: resolvedFill }),
        "min-w-0 whitespace-nowrap",
        className
      )}
      {...props}
    >
      <span className="min-w-0 truncate">{children}</span>
      {showRemove ? (
        <ComboboxPrimitive.ChipRemove
          render={
            <button
              type="button"
              data-slot="combobox-chip-remove"
              className={chipRemoveVariants({ variant })}
            />
          }
        >
          <XIcon className="pointer-events-none" />
        </ComboboxPrimitive.ChipRemove>
      ) : null}
    </ComboboxPrimitive.Chip>
  );
}

function ComboboxChipsInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      className={cn(menuSearchInputClassName, "min-w-16 flex-1 px-0", className)}
      {...props}
    />
  );
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null);
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxContent as ComboboxPopup,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxSelectionGroups,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  ComboboxCountValue,
  useComboboxAnchor,
};
