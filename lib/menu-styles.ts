import { cn } from "@/lib/utils";

export type MenuSearchVariant = "default" | "focus";

/** Shared by Dropdown and Combobox popups. */
export const menuSurfaceClassName =
  "flex flex-col overflow-hidden rounded-[14px] bg-neutral-0 text-sm font-normal text-fg shadow-xl outline-none";

export const menuMaxHeightClassName =
  "max-h-[min(500px,var(--available-height))]";

export const menuPopupMotionClassName =
  "max-h-[min(500px,var(--available-height))] origin-(--transform-origin) duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95";

export const menuItemStackClassName = "flex flex-col gap-0 p-1.5";

export const menuItemClassName =
  "relative flex w-full cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-normal text-fg outline-hidden select-none hover:bg-neutral-150 data-highlighted:bg-neutral-150 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([data-slot=dropdown-check])]:text-current [&_svg:not([data-slot=dropdown-chevron]):not([data-slot=dropdown-check])]:size-[18px]";

export const menuLabelClassName =
  "px-2 py-1.5 text-sm font-normal text-fg-tertiary";

export const menuSeparatorClassName = "-mx-1.5 my-1.5 h-px bg-neutral-150";

const menuSearchFieldBaseClassName =
  "flex min-h-8 items-center gap-1.5 rounded-lg bg-neutral-100 px-2 py-1.5 text-sm font-normal text-fg-tertiary";

export function menuSearchFieldClassName(
  variant: MenuSearchVariant = "default"
) {
  return cn(
    menuSearchFieldBaseClassName,
    variant === "focus" && "ring-2 ring-brand-border-focus"
  );
}

export const menuSearchInputClassName =
  "min-w-0 flex-1 bg-transparent text-sm font-normal text-fg outline-none placeholder:font-normal placeholder:text-fg-tertiary";

export function menuSurface(className?: string) {
  return cn(menuSurfaceClassName, className);
}
