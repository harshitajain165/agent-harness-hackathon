"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { Kbd, resolveKbdTokens } from "@/components/ui/kbd";
import {
  cn,
  controlHeightClass,
  controlRadiusClass,
  type ControlSize,
} from "@/lib/utils";

export const buttonVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 border-0 font-sans text-sm font-medium whitespace-nowrap outline-none transition-[color,background-color] duration-150 ease-in-out focus-visible:ring-2 focus-visible:ring-brand-border-focus data-[variant=danger]:focus-visible:ring-danger-border-focus data-[variant=danger-subtle]:focus-visible:ring-danger-border-focus data-[variant=link-danger]:focus-visible:ring-danger-border-focus data-[variant=destructive]:focus-visible:ring-danger-border-focus disabled:pointer-events-none disabled:bg-neutral-100 disabled:text-fg-disabled disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_[data-slot=kbd]_svg]:size-3",
  {
    defaultVariants: {
      size: "md",
      variant: "primary",
      shape: "rounded",
    },
    variants: {
      variant: {
        primary:
          "bg-neutral-950 text-on-inverted shadow-none hover:bg-neutral-800 data-pressed:bg-neutral-800",
        secondary:
          "bg-neutral-100 text-fg shadow-none hover:bg-neutral-150 data-pressed:bg-neutral-200",
        tertiary:
          "border-0 bg-neutral-0 text-fg shadow-sm hover:border-0 hover:bg-neutral-50 hover:shadow-sm data-pressed:border-0 data-pressed:bg-neutral-100 data-pressed:shadow-none",
        brand:
          "bg-brand-solid text-on-brand shadow-none hover:bg-brand-solid-hover data-pressed:bg-brand-solid-active",
        danger:
          "bg-danger-solid text-on-danger shadow-none hover:bg-danger-solid-hover data-pressed:bg-danger-solid-hover",
        "danger-subtle":
          "bg-danger-subtle text-danger-fg shadow-none hover:bg-danger-subtle-hover data-pressed:bg-danger-subtle-active",
        link: "h-auto px-0 text-fg shadow-none hover:text-fg-secondary data-pressed:text-fg-secondary",
        "link-primary":
          "h-auto px-0 text-brand-fg shadow-none hover:text-brand-fg-hover data-pressed:text-brand-fg-hover",
        "link-danger":
          "h-auto px-0 text-danger-fg shadow-none hover:text-danger-fg-hover data-pressed:text-danger-fg-hover",
        transparent:
          "text-fg shadow-none hover:bg-neutral-100 data-pressed:bg-neutral-100",
        ghost:
          "bg-transparent text-fg shadow-none hover:bg-neutral-100 data-pressed:bg-neutral-100",
        outline:
          "border-0 bg-neutral-0 text-fg shadow-sm hover:border-0 hover:bg-neutral-50 hover:shadow-sm data-pressed:border-0 data-pressed:bg-neutral-100 data-pressed:shadow-none",
        default:
          "bg-neutral-950 text-on-inverted shadow-none hover:bg-neutral-800 data-pressed:bg-neutral-800",
        destructive:
          "bg-danger-solid text-on-danger shadow-none hover:bg-danger-solid-hover data-pressed:bg-danger-solid-hover",
      },
      size: {
        sm: cn(
          controlHeightClass("sm"),
          controlRadiusClass("sm"),
          "py-1.5 [&_svg]:size-4"
        ),
        md: cn(
          controlHeightClass("md"),
          controlRadiusClass("md"),
          "py-2 [&_svg]:size-4"
        ),
        lg: cn(
          controlHeightClass("lg"),
          controlRadiusClass("lg"),
          "py-2.5 [&_svg]:size-5"
        ),
        xl: cn(
          controlHeightClass("xl"),
          controlRadiusClass("xl"),
          "py-3 [&_svg]:size-5"
        ),
        default: cn(
          controlHeightClass("md"),
          controlRadiusClass("md"),
          "py-2 [&_svg]:size-4"
        ),
        "icon-sm": cn(
          controlHeightClass("sm"),
          controlRadiusClass("sm"),
          "size-8 min-w-8 px-2 py-1.5 [&_svg]:size-4"
        ),
        icon: cn(
          controlHeightClass("md"),
          controlRadiusClass("md"),
          "size-9 min-w-9 px-2.5 py-2 [&_svg]:size-4"
        ),
        "icon-lg": cn(
          controlHeightClass("lg"),
          controlRadiusClass("lg"),
          "size-10 min-w-10 px-2.5 py-2.5 [&_svg]:size-5"
        ),
        "icon-xl": cn(
          controlHeightClass("xl"),
          controlRadiusClass("xl"),
          "size-11 min-w-11 px-3 py-3 [&_svg]:size-5"
        ),
        "icon-xs": "size-6 min-w-6 rounded-[8px] px-1.5 py-1 [&_svg]:size-3.5",
      },
      shape: {
        rounded: "",
        pill: "!rounded-full",
      },
    },
  }
);

type SmallestButtonVariant = NonNullable<
  VariantProps<typeof buttonVariants>["variant"]
>;

export type ButtonVariantInput = SmallestButtonVariant;

type ButtonSizeInput = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

type ContentSlotPaddingTable = Record<
  "sm" | "md" | "lg" | "xl",
  { pl: string; pr: string; plIcon: string; prIcon: string }
>;

const CONTENT_SLOT_PADDING = {
  sm: { pl: "pl-3", pr: "pr-3", plIcon: "pl-2.5", prIcon: "pr-2.5" },
  md: { pl: "pl-3", pr: "pr-3", plIcon: "pl-2.5", prIcon: "pr-2.5" },
  lg: { pl: "pl-4", pr: "pr-4", plIcon: "pl-3.5", prIcon: "pr-3.5" },
  xl: {
    pl: "pl-[18px]",
    pr: "pr-[18px]",
    plIcon: "pl-4",
    prIcon: "pr-4",
  },
} as const satisfies ContentSlotPaddingTable;

/** Pill caps eat the first ~half-height, so inset past the curve. */
const PILL_CONTENT_SLOT_PADDING = {
  sm: { pl: "pl-4", pr: "pr-4", plIcon: "pl-3.5", prIcon: "pr-3.5" },
  md: {
    pl: "pl-[18px]",
    pr: "pr-[18px]",
    plIcon: "pl-4",
    prIcon: "pr-4",
  },
  lg: { pl: "pl-5", pr: "pr-5", plIcon: "pl-[18px]", prIcon: "pr-[18px]" },
  xl: {
    pl: "pl-[22px]",
    pr: "pr-[22px]",
    plIcon: "pl-5",
    prIcon: "pr-5",
  },
} as const satisfies ContentSlotPaddingTable;

function isIconChild(child: ReactNode): boolean {
  if (!isValidElement(child)) return false;
  const props = child.props as { "data-slot"?: string };
  if (props["data-slot"] === "icon") return true;
  const type = child.type;
  if (typeof type === "function") {
    const named = type as { displayName?: string; name?: string };
    const name = named.displayName ?? named.name ?? "";
    return name === "Icon" || /Icon$/.test(name);
  }
  return false;
}

function contentSlotPadding(
  children: ReactNode,
  size: ButtonSizeInput,
  shape?: VariantProps<typeof buttonVariants>["shape"]
): string {
  if (size.startsWith("icon")) return "";

  const sizeKey =
    size === "default" ? "md" : size;
  const table =
    shape === "pill" ? PILL_CONTENT_SLOT_PADDING : CONTENT_SLOT_PADDING;
  if (!(sizeKey in table)) return "";

  const pad = table[sizeKey as keyof typeof table];

  const items = Children.toArray(children).filter(Boolean);
  if (items.length < 2) {
    return cn(pad.pl, pad.pr);
  }

  const firstIsCompact = isIconChild(items[0]);
  const lastIsCompact = isIconChild(items[items.length - 1]);

  return cn(
    firstIsCompact ? pad.plIcon : pad.pl,
    lastIsCompact ? pad.prIcon : pad.pr
  );
}

const invertedKeyVariants = new Set<SmallestButtonVariant>([
  "primary",
  "default",
  "brand",
  "danger",
  "destructive",
]);

const flatKeyVariants = new Set<SmallestButtonVariant>([
  "tertiary",
  "outline",
  "transparent",
  "ghost",
]);

export type ButtonKeys = ReactNode | readonly ReactNode[];

function hasButtonKeys(
  keys: ButtonKeys | undefined
): keys is ButtonKeys {
  if (keys == null || keys === false || keys === "") return false;
  return !Array.isArray(keys) || keys.length > 0;
}

function buttonKbdClassName(
  variant: SmallestButtonVariant,
  disabled?: boolean
): string {
  if (disabled) {
    return "bg-neutral-0 text-fg-disabled shadow-none";
  }
  if (invertedKeyVariants.has(variant)) {
    return "bg-neutral-0/15 text-current shadow-none";
  }
  if (variant === "link") {
    return "bg-neutral-50 text-current shadow-none";
  }
  if (variant === "link-primary") {
    return "bg-blue-50 text-current shadow-none";
  }
  if (variant === "link-danger") {
    return "bg-red-50 text-current shadow-none";
  }
  if (variant === "danger-subtle") {
    return "bg-red-100 text-current shadow-none";
  }
  if (flatKeyVariants.has(variant)) {
    return "bg-neutral-100 text-fg-secondary shadow-none";
  }
  return "bg-neutral-0 shadow-none";
}

function ButtonKeys({
  keys,
  variant,
  disabled,
}: {
  keys: ButtonKeys;
  variant: SmallestButtonVariant;
  disabled?: boolean;
}) {
  const items = (Array.isArray(keys) ? keys : [keys]).flatMap(resolveKbdTokens);
  const kbdClass = cn("leading-none", buttonKbdClassName(variant, disabled));

  return (
    <span data-slot="button-keys" className="ml-1 inline-flex items-center gap-1">
      {items.map((key, index) => (
        <Kbd key={index} aria-hidden className={kbdClass}>
          {key}
        </Kbd>
      ))}
    </span>
  );
}

export function normalizeButtonVariant(
  variant: ButtonVariantInput | undefined
): SmallestButtonVariant {
  return variant ?? "primary";
}

export function normalizeButtonSize(
  size: ButtonSizeInput | undefined
): NonNullable<VariantProps<typeof buttonVariants>["size"]> {
  return size ?? "md";
}

export interface ButtonProps extends useRender.ComponentProps<"button"> {
  variant?: ButtonVariantInput;
  size?: ButtonSizeInput;
  shape?: VariantProps<typeof buttonVariants>["shape"];
  /** Trailing keyboard shortcut. A string is one chip; an array is one chip per key. */
  keys?: ButtonKeys;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  shape = "rounded",
  render,
  children,
  disabled,
  keys,
  ...props
}: ButtonProps): ReactElement {
  const isLink =
    variant === "link" ||
    variant === "link-primary" ||
    variant === "link-danger";
  const isIconOnly =
    size === "icon" ||
    size === "icon-sm" ||
    size === "icon-lg" ||
    size === "icon-xl" ||
    size === "icon-xs";
  const typeValue = render ? undefined : ("button" as const);
  const showKeys = !isIconOnly && hasButtonKeys(keys);
  const composedChildren = showKeys ? (
    <>
      {children}
      <ButtonKeys keys={keys} variant={variant} disabled={disabled} />
    </>
  ) : (
    children
  );

  const defaultProps = {
    children: composedChildren,
    className: cn(
      buttonVariants({ variant, size, shape }),
      !isLink && !isIconOnly && contentSlotPadding(composedChildren, size, shape),
      isLink &&
        "h-auto min-h-0 !rounded-none px-0 shadow-none decoration-skip-ink-all focus-visible:ring-0 focus-visible:underline focus-visible:underline-offset-2",
      className
    ),
    "data-slot": "button",
    "data-variant": variant,
    disabled,
    type: typeValue,
  };

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(defaultProps, props),
    render,
  });
}

export { type ControlSize };
