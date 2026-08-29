"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";

import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "@/components/icons";
import { MenuCheckboxIndicator } from "@/components/ui/menu-checkbox-indicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  menuItemClassName,
  menuItemStackClassName,
  menuLabelClassName,
  menuMaxHeightClassName,
  menuPopupMotionClassName,
  type MenuSearchVariant,
  menuSearchFieldClassName,
  menuSearchInputClassName,
  menuSeparatorClassName,
  menuSurfaceClassName,
} from "@/lib/menu-styles";
import { cn } from "@/lib/utils";

type DropdownViewContextValue = {
  view: string | null;
  setView: (view: string | null) => void;
};

const DropdownViewContext = React.createContext<DropdownViewContextValue | null>(
  null
);
const DropdownPanelContext = React.createContext(false);
type DropdownSubContextValue = {
  name?: string;
  variant: "inline" | "floating";
};

const DropdownSubNameContext =
  React.createContext<DropdownSubContextValue | null>(null);
const DropdownPanelPortalContext = React.createContext<HTMLElement | null>(null);
const DropdownSearchHostContext = React.createContext<HTMLElement | null>(null);
const DropdownFooterHostContext = React.createContext<HTMLElement | null>(null);

function useDropdownView() {
  return React.useContext(DropdownViewContext);
}

const itemClassName = menuItemClassName;
const itemStackClassName = menuItemStackClassName;
const chevronClassName = "ml-auto size-[18px] shrink-0 text-fg";

const paneMotionClassName =
  "transition-opacity duration-200 ease-[cubic-bezier(0.645,0.045,0.355,1)] motion-reduce:transition-none";

const heightLockClassName = "overflow-hidden motion-reduce:transition-none";

const heightTransitionClassName =
  "transition-[height] duration-200 ease-[cubic-bezier(0.645,0.045,0.355,1)]";

const trackMotionClassName =
  "flex w-[200%] transition-transform duration-200 ease-[cubic-bezier(0.645,0.045,0.355,1)] motion-reduce:transition-none";

function DropdownMenu({
  onOpenChange,
  open,
  ...props
}: MenuPrimitive.Root.Props) {
  const [view, setView] = React.useState<string | null>(null);

  return (
    <DropdownViewContext.Provider value={{ view, setView }}>
      <MenuPrimitive.Root
        data-slot="dropdown-menu"
        open={open}
        onOpenChange={(next, eventDetails) => {
          if (!next && open !== true) setView(null);
          onOpenChange?.(next, eventDetails);
        }}
        {...props}
      />
    </DropdownViewContext.Provider>
  );
}

function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function measurePaneHeight(pane: HTMLElement | null) {
  if (!pane) return 0;
  const header = pane.querySelector<HTMLElement>(
    "[data-slot=dropdown-menu-sub-header]"
  );
  const search = pane.querySelector<HTMLElement>(
    "[data-slot=dropdown-menu-search-slot]"
  );
  const measure = pane.querySelector<HTMLElement>(
    "[data-slot=dropdown-menu-measure]"
  );
  const foot = pane.querySelector<HTMLElement>(
    "[data-slot=dropdown-menu-footer]"
  );
  return (
    (header?.offsetHeight ?? 0) +
    (search?.offsetHeight ?? 0) +
    (measure?.offsetHeight ?? 0) +
    (foot?.offsetHeight ?? 0)
  );
}

function DropdownScrollBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ScrollArea
      scrollFade
      className="min-h-0 flex-1"
      viewportClassName="overscroll-contain focus-visible:ring-0"
    >
      <div
        data-slot="dropdown-menu-measure"
        className={cn(itemStackClassName, className)}
      >
        {children}
      </div>
    </ScrollArea>
  );
}

function DropdownPaneChrome({
  header,
  searchClassName,
  children,
}: {
  header?: React.ReactNode;
  searchClassName?: string;
  children: React.ReactNode;
}) {
  const [searchHost, setSearchHost] = React.useState<HTMLDivElement | null>(
    null
  );
  const [footerHost, setFooterHost] = React.useState<HTMLDivElement | null>(
    null
  );

  return (
    <DropdownSearchHostContext.Provider value={searchHost}>
      <DropdownFooterHostContext.Provider value={footerHost}>
        <div className="flex min-h-0 flex-1 flex-col has-[[data-slot=dropdown-menu-search]]:[&_[data-slot=dropdown-menu-measure]]:pt-0">
          {header}
          <div
            ref={setSearchHost}
            data-slot="dropdown-menu-search-slot"
            className={cn(
              "relative z-10 shrink-0 px-1.5 pb-1.5 empty:hidden",
              searchClassName
            )}
          />
          <DropdownScrollBody>{children}</DropdownScrollBody>
          <div
            ref={setFooterHost}
            data-slot="dropdown-menu-footer-host"
            className="shrink-0 empty:hidden"
          />
        </div>
      </DropdownFooterHostContext.Provider>
    </DropdownSearchHostContext.Provider>
  );
}

function DropdownPanes({
  nested,
  children,
}: {
  nested: boolean;
  children: React.ReactNode;
}) {
  const rootPaneRef = React.useRef<HTMLDivElement>(null);
  const nestedRef = React.useRef(nested);
  const [panelNode, setPanelNode] = React.useState<HTMLDivElement | null>(null);
  const [height, setHeight] = React.useState<number>();
  const [heightTransition, setHeightTransition] = React.useState(false);

  React.useLayoutEffect(() => {
    if (nestedRef.current !== nested) {
      setHeightTransition(true);
      nestedRef.current = nested;
    }
  }, [nested]);

  React.useLayoutEffect(() => {
    const pane = nested ? panelNode : rootPaneRef.current;
    if (!pane) return;

    const update = () =>
      setHeight(Math.min(measurePaneHeight(pane), 500));
    update();

    const observer = new ResizeObserver(update);
    observer.observe(pane);
    pane
      .querySelectorAll(
        "[data-slot=dropdown-menu-measure], [data-slot=dropdown-menu-search-slot], [data-slot=dropdown-menu-sub-header], [data-slot=dropdown-menu-footer-host], [data-slot=dropdown-menu-footer]"
      )
      .forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [nested, panelNode, children]);

  const sized = height != null;

  return (
    <DropdownPanelPortalContext.Provider value={panelNode}>
      <div
        className={cn(
          heightLockClassName,
          menuMaxHeightClassName,
          heightTransition && heightTransitionClassName
        )}
        style={sized ? { height } : undefined}
      >
        <div
          className={cn(
            trackMotionClassName,
            sized ? "h-full" : "h-auto",
            nested ? "-translate-x-1/2" : "translate-x-0"
          )}
        >
          <div
            ref={rootPaneRef}
            data-slot="dropdown-pane-root"
            className={cn(
              "flex w-1/2 shrink-0 flex-col",
              sized && "h-full min-h-0",
              paneMotionClassName,
              nested ? "pointer-events-none opacity-0" : "opacity-100"
            )}
          >
            <DropdownPaneChrome searchClassName="pt-1.5">
              {children}
            </DropdownPaneChrome>
          </div>
          <div
            className={cn(
              "flex w-1/2 shrink-0 flex-col",
              sized && "h-full min-h-0",
              paneMotionClassName,
              nested ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            <div
              ref={setPanelNode}
              className="flex h-full min-h-0 flex-col"
            />
          </div>
        </div>
      </div>
    </DropdownPanelPortalContext.Provider>
  );
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  children,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  const ctx = useDropdownView();
  const nested = Boolean(ctx?.view);
  const surfaceClassName = cn(menuSurfaceClassName, "w-72", className);

  const panes = <DropdownPanes nested={nested}>{children}</DropdownPanes>;

  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(surfaceClassName, menuPopupMotionClassName)}
          {...props}
        >
          {panes}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({
  className,
  separated = false,
  ...props
}: MenuPrimitive.Group.Props & { separated?: boolean }) {
  return (
    <MenuPrimitive.Group
      data-slot="dropdown-menu-group"
      data-separated={separated ? "true" : undefined}
      className={cn(
        "flex flex-col gap-0",
        separated && "-mx-1.5 mt-1.5 border-t border-neutral-150 px-1.5 pt-1.5",
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dropdown-menu-label"
      className={cn(menuLabelClassName, className)}
      {...props}
    />
  );
}

function DropdownMenuItem({
  className,
  variant = "primary",
  description,
  selected,
  leading,
  trailing,
  children,
  ...props
}: MenuPrimitive.Item.Props & {
  variant?: "primary" | "danger";
  description?: string;
  selected?: boolean;
  /** Fixed content at the start of the row, usually an icon or avatar. */
  leading?: React.ReactNode;
  /** Fixed content at the end of the row, such as a shortcut or status. */
  trailing?: React.ReactNode;
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      data-selected={selected ? "true" : undefined}
      className={cn(
        itemClassName,
        description && "items-center whitespace-normal py-2",
        variant === "danger" &&
          "text-danger-fg data-highlighted:bg-red-50 data-highlighted:text-danger-fg [&_svg]:text-danger-fg",
        className
      )}
      {...props}
    >
      {leading ? <span data-slot="dropdown-menu-item-leading" className="flex shrink-0">{leading}</span> : null}
      {description ? (
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-medium">{children}</span>
          <span className="font-normal text-pretty text-fg-secondary">{description}</span>
        </span>
      ) : (
        children
      )}
      {trailing ? <span data-slot="dropdown-menu-item-trailing" className="ml-auto flex shrink-0">{trailing}</span> : null}
      {description && !trailing ? (
        <span
          data-slot="dropdown-menu-item-selected"
          className="ml-4 flex size-5 shrink-0 items-center justify-center"
        >
          {selected ? (
            <CheckIcon
              data-slot="dropdown-check"
              radius="0"
              className="size-5 text-fg"
            />
          ) : null}
        </span>
      ) : selected && !trailing ? (
        <span
          data-slot="dropdown-menu-item-selected"
          className="ml-auto flex size-5 shrink-0 items-center justify-center"
        >
          <CheckIcon
            data-slot="dropdown-check"
            radius="0"
            className="size-5 text-fg"
          />
        </span>
      ) : null}
    </MenuPrimitive.Item>
  );
}

type DropdownMenuSubProps =
  | {
      /** Identifier used by the inline drill-in pane. */
      name: string;
      /** `inline` replaces the current pane within the same menu surface. */
      variant: "inline";
      children: React.ReactNode;
    }
  | {
      /** `floating` opens a conventional side submenu. */
      name?: never;
      variant?: "floating";
      children: React.ReactNode;
    };

function DropdownMenuSub({
  name,
  variant = "floating",
  children,
}: DropdownMenuSubProps) {
  const content = (
    <DropdownSubNameContext.Provider value={{ name, variant }}>
      {children}
    </DropdownSubNameContext.Provider>
  );

  if (variant === "floating") {
    return <MenuPrimitive.SubmenuRoot>{content}</MenuPrimitive.SubmenuRoot>;
  }

  return content;
}

function DropdownMenuSubTrigger({
  className,
  leading,
  trailing,
  children,
  onClick,
  ...props
}: MenuPrimitive.Item.Props & {
  /** Fixed content before the submenu label. */
  leading?: React.ReactNode;
  /** Fixed content before the submenu chevron. */
  trailing?: React.ReactNode;
}) {
  const sub = React.useContext(DropdownSubNameContext);
  const ctx = useDropdownView();
  if (!sub) return null;

  if (sub.variant === "floating") {
    return (
      <MenuPrimitive.SubmenuTrigger
        data-slot="dropdown-menu-sub-trigger"
        className={cn(itemClassName, className)}
        {...props}
        onClick={onClick}
      >
        {leading ? <span data-slot="dropdown-menu-sub-trigger-leading" className="flex shrink-0">{leading}</span> : null}
        <span className="flex min-w-0 flex-1 items-center gap-1.5">{children}</span>
        {trailing ? <span data-slot="dropdown-menu-sub-trigger-trailing" className="flex shrink-0">{trailing}</span> : null}
        <ChevronRightIcon
          data-slot="dropdown-chevron"
          radius="0"
          className={chevronClassName}
        />
      </MenuPrimitive.SubmenuTrigger>
    );
  }

  if (!sub.name || !ctx) return null;
  const name = sub.name;

  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-sub-trigger"
      closeOnClick={false}
      className={cn(itemClassName, className)}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) ctx.setView(name);
      }}
    >
      {leading ? <span data-slot="dropdown-menu-sub-trigger-leading" className="flex shrink-0">{leading}</span> : null}
      <span className="flex min-w-0 flex-1 items-center gap-1.5">{children}</span>
      {trailing ? <span data-slot="dropdown-menu-sub-trigger-trailing" className="flex shrink-0">{trailing}</span> : null}
      <ChevronRightIcon
        data-slot="dropdown-chevron"
        radius="0"
        className={chevronClassName}
      />
    </MenuPrimitive.Item>
  );
}

function DropdownMenuFloatingSubPanel({
  search,
  className,
  children,
}: {
  search?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const [searchHost, setSearchHost] = React.useState<HTMLDivElement | null>(
    null
  );

  return (
    <DropdownSearchHostContext.Provider value={searchHost}>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner
          className="isolate z-50 outline-none"
          align="start"
          side="right"
          sideOffset={6}
        >
          <MenuPrimitive.Popup
            data-slot="dropdown-menu-sub-panel"
            className={cn(
              menuSurfaceClassName,
              menuMaxHeightClassName,
              "w-72",
              className
            )}
          >
            <div className="flex max-h-[inherit] min-h-0 flex-col">
              <div ref={setSearchHost} className="p-1.5">
                {search ?? <DropdownMenuSearchField placeholder="Search" />}
              </div>
              <DropdownScrollBody className="pt-0">{children}</DropdownScrollBody>
            </div>
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </DropdownSearchHostContext.Provider>
  );
}

function DropdownMenuSubPanel({
  title,
  aside,
  search,
  className,
  children,
}: {
  /** Visible only by the inline drill-in, where it labels the back row. */
  title?: string;
  aside?: React.ReactNode;
  search?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const sub = React.useContext(DropdownSubNameContext);
  const ctx = useDropdownView();
  const portal = React.useContext(DropdownPanelPortalContext);

  if (sub?.variant === "floating") {
    return (
      <DropdownMenuFloatingSubPanel
        search={search}
        className={className}
      >
        {children}
      </DropdownMenuFloatingSubPanel>
    );
  }

  if (!sub?.name || !ctx || ctx.view !== sub.name || !portal) return null;

  return createPortal(
    <DropdownPanelContext.Provider value={true}>
      <div
        data-slot="dropdown-menu-sub-panel"
        className={cn("flex h-full min-h-0 flex-col", className)}
      >
        <DropdownPaneChrome
          header={
            <div
              data-slot="dropdown-menu-sub-header"
              className="flex shrink-0 items-center gap-1.5 p-1.5"
            >
              <button
                type="button"
                onClick={() => ctx.setView(null)}
                className={cn(
                  itemClassName,
                  "min-w-0 flex-1 text-fg-quaternary hover:text-fg focus-visible:ring-2 focus-visible:ring-brand-border-focus"
                )}
              >
                <ChevronLeftIcon
                  data-slot="dropdown-chevron"
                  radius="0"
                  className="size-[18px] shrink-0 text-fg"
                />
                <span className="truncate">{title ?? "Back"}</span>
              </button>
              {aside ? (
                <div
                  data-slot="dropdown-menu-sub-aside"
                  className="shrink-0"
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  {aside}
                </div>
              ) : null}
            </div>
          }
        >
          {search ?? <DropdownMenuSearch placeholder="Search" />}
          {children}
        </DropdownPaneChrome>
      </div>
    </DropdownPanelContext.Provider>,
    portal
  );
}

function DropdownMenuSearchField({
  className,
  onKeyDown,
  onKeyUp,
  variant = "default",
  ...props
}: React.ComponentProps<"input"> & { variant?: MenuSearchVariant }) {
  const keepKeysInInput = (
    event: React.KeyboardEvent<HTMLInputElement>,
    next?: React.KeyboardEventHandler<HTMLInputElement>
  ) => {
    if (event.key !== "Escape") {
      event.stopPropagation();
    }
    next?.(event);
  };

  const node = (
    <div data-slot="dropdown-menu-search">
      <label className={menuSearchFieldClassName(variant)}>
        <SearchIcon className="size-4 text-fg-tertiary" />
        <input
          type="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          {...props}
          data-slot="dropdown-menu-search-input"
          className={cn(menuSearchInputClassName, className)}
          onKeyDown={(event) => keepKeysInInput(event, onKeyDown)}
          onKeyUp={(event) => keepKeysInInput(event, onKeyUp)}
        />
      </label>
    </div>
  );

  return node;
}

function DropdownMenuSearch(
  props: React.ComponentProps<"input"> & { variant?: MenuSearchVariant }
) {
  const host = React.useContext(DropdownSearchHostContext);
  if (!host) return null;
  return createPortal(<DropdownMenuSearchField {...props} />, host);
}
DropdownMenuSearch.displayName = "DropdownMenuSearch";

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  indicatorPosition = "leading",
  leading,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  indicatorPosition?: "leading" | "trailing";
  /** Optional content before the label, commonly a product icon. */
  leading?: React.ReactNode;
}) {
  const indicator = (isChecked: boolean) => (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center",
        indicatorPosition === "trailing" && "ml-auto"
      )}
      data-slot="dropdown-menu-checkbox-item-indicator"
    >
      <MenuCheckboxIndicator checked={isChecked} size="sm" />
    </span>
  );

  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-indicator-position={indicatorPosition}
      className={cn(
        itemClassName,
        "group/checkbox",
        className
      )}
      checked={checked}
      {...props}
      render={(itemProps, state) => (
        <div {...itemProps}>
          {indicatorPosition === "leading" ? indicator(state.checked) : null}
          {leading ? (
            <span
              data-slot="dropdown-menu-checkbox-item-leading"
              className="flex shrink-0"
            >
              {leading}
            </span>
          ) : null}
          <span className="min-w-0 flex-1">{children}</span>
          {indicatorPosition === "trailing" ? indicator(state.checked) : null}
        </div>
      )}
    />
  );
}

function DropdownMenuRadioGroup({
  className,
  ...props
}: MenuPrimitive.RadioGroup.Props) {
  return (
    <MenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      className={cn("flex flex-col gap-0", className)}
      {...props}
    />
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  indicatorPosition = "trailing",
  leading,
  trailing,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  indicatorPosition?: "leading" | "trailing";
  /** Optional content before the label, commonly a product icon. */
  leading?: React.ReactNode;
  /** Optional content after the label and before a trailing selection mark. */
  trailing?: React.ReactNode;
}) {
  const indicatorNode = (
    <MenuPrimitive.RadioItemIndicator
      className={cn(
        "flex size-[18px] shrink-0 items-center justify-center",
        indicatorPosition === "trailing" && !trailing && "ml-auto"
      )}
      data-slot="dropdown-menu-radio-item-indicator"
    >
      <CheckIcon
        data-slot="dropdown-check"
        radius="0"
        className="size-[18px] text-fg"
      />
    </MenuPrimitive.RadioItemIndicator>
  );

  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-indicator-position={indicatorPosition}
      className={cn(itemClassName, className)}
      {...props}
    >
      {indicatorPosition === "leading" ? indicatorNode : null}
      {leading ? (
        <span
          data-slot="dropdown-menu-radio-item-leading"
          className="flex shrink-0"
        >
          {leading}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">{children}</span>
      {trailing ? (
        <span
          data-slot="dropdown-menu-radio-item-trailing"
          className="ml-auto flex shrink-0"
        >
          {trailing}
        </span>
      ) : null}
      {indicatorPosition === "trailing" ? indicatorNode : null}
    </MenuPrimitive.RadioItem>
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn(menuSeparatorClassName, className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn("ml-auto text-sm font-normal tracking-normal text-fg", className)}
      {...props}
    />
  );
}

function DropdownMenuFooter({
  className,
  variant = "button",
  children,
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "button" | "caption";
}) {
  const host = React.useContext(DropdownFooterHostContext);
  const node = (
    <div
      data-slot="dropdown-menu-footer"
      data-variant={variant}
      className={cn(
        "shrink-0 border-t border-neutral-150",
        variant === "button" &&
          "bg-neutral-0 p-1.5",
        variant === "caption" &&
          "bg-neutral-50 px-3 py-3 text-sm font-normal text-fg shadow-[0_-4px_7px_3px_#FFFFFFCC]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );

  if (!host) return null;
  return createPortal(node, host);
}
DropdownMenuFooter.displayName = "DropdownMenuFooter";

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubPanel,
  DropdownMenuSearch,
  DropdownMenuFooter,
};
