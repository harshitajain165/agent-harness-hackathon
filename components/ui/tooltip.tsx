"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { cva } from "class-variance-authority";

import { CircleInfoIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TooltipCreateHandle = TooltipPrimitive.createHandle;

function TooltipProvider({
  delay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  );
}

function Tooltip<Payload = unknown>({
  ...props
}: TooltipPrimitive.Root.Props<Payload>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

const tooltipPopupVariants = cva([
  "z-50 inline-flex w-fit max-w-xs origin-(--transform-origin) items-center rounded-[12px] px-3 py-1.5 text-sm text-on-inverted duration-150 ease-[var(--ease-out)]",
  "bg-neutral-950 shadow-[0_8px_24px_rgb(0_0_0_/_0.22),0_0_0_1px_rgb(255_255_255_/_0.12)]",
  "supports-backdrop-filter:bg-black/65 supports-backdrop-filter:backdrop-blur-xl supports-backdrop-filter:backdrop-saturate-150",
  "[&:not(:has([data-slot=tooltip-header]))]:line-clamp-2",
  "has-[[data-slot=tooltip-header]]:max-w-[200px] has-[[data-slot=tooltip-header]]:flex-col has-[[data-slot=tooltip-header]]:items-stretch has-[[data-slot=tooltip-header]]:gap-3 has-[[data-slot=tooltip-header]]:py-3 has-[[data-slot=tooltip-action]]:w-[200px]",
  "transition-[opacity,translate] motion-reduce:transition-opacity",
  "data-starting-style:opacity-0 data-ending-style:opacity-0",
  "data-[side=top]:data-starting-style:translate-y-1 data-[side=top]:data-ending-style:translate-y-1",
  "data-[side=bottom]:data-starting-style:-translate-y-1 data-[side=bottom]:data-ending-style:-translate-y-1",
  "data-[side=left]:data-starting-style:translate-x-1 data-[side=left]:data-ending-style:translate-x-1",
  "data-[side=right]:data-starting-style:-translate-x-1 data-[side=right]:data-ending-style:-translate-x-1",
  "motion-reduce:data-starting-style:translate-none motion-reduce:data-ending-style:translate-none",
  "data-instant:duration-0",
]);

type TooltipPopupProps = TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    | "align"
    | "alignOffset"
    | "anchor"
    | "collisionAvoidance"
    | "collisionBoundary"
    | "collisionPadding"
    | "side"
    | "sideOffset"
  > & {
    portalProps?: TooltipPrimitive.Portal.Props;
    /**
     * Enables Viewport morphing for detached triggers that share one popup.
     * Omit for normal tooltips — Viewport changes measurement and misaligns top/left.
     */
    adaptive?: boolean;
  };

function TooltipPopup({
  className,
  align = "center",
  alignOffset = 0,
  sideOffset = 8,
  side = "top",
  anchor,
  collisionAvoidance,
  collisionBoundary,
  collisionPadding,
  adaptive = false,
  children,
  portalProps,
  ...props
}: TooltipPopupProps) {
  return (
    <TooltipPrimitive.Portal {...portalProps}>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className={cn(
          "z-50",
          adaptive &&
            "isolate h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom,transform] duration-150 data-instant:transition-none",
        )}
        data-slot="tooltip-positioner"
        side={side}
        sideOffset={sideOffset}
        {...(collisionAvoidance != null ? { collisionAvoidance } : null)}
        {...(collisionBoundary != null ? { collisionBoundary } : null)}
        {...(collisionPadding != null ? { collisionPadding } : null)}
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            tooltipPopupVariants(),
            adaptive &&
              "h-(--popup-height,auto) w-(--popup-width,auto) max-w-none p-0 transition-[width,height,scale,opacity]",
            className,
          )}
          {...props}
        >
          {adaptive ? (
            <TooltipPrimitive.Viewport
              data-slot="tooltip-viewport"
              className="relative size-full overflow-clip px-3 py-1.5 data-instant:transition-none **:data-current:w-[calc(var(--popup-width)-1.5rem)] **:data-previous:w-[calc(var(--popup-width)-1.5rem)] **:data-current:opacity-100 **:data-previous:opacity-100 **:data-current:transition-opacity **:data-previous:transition-opacity **:data-current:data-ending-style:opacity-0 **:data-current:data-starting-style:opacity-0 **:data-previous:data-ending-style:opacity-0 **:data-previous:data-starting-style:opacity-0 **:data-previous:truncate"
            >
              {children}
            </TooltipPrimitive.Viewport>
          ) : (
            children
          )}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

function TooltipHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="tooltip-header"
      className={cn("flex min-w-0 flex-col gap-0.5 text-left", className)}
      {...props}
    />
  );
}

function TooltipTitle({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="tooltip-title"
      className={cn(
        "truncate text-sm leading-5 font-medium text-on-inverted",
        className,
      )}
      {...props}
    />
  );
}

function TooltipDescription({
  className,
  children,
  ...props
}: ComponentProps<"p">) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [fits, setFits] = useState(true);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.hidden = false;
    const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight);
    const next =
      Number.isFinite(lineHeight) && lineHeight > 0
        ? el.scrollHeight <= lineHeight * 2 + 1
        : true;
    el.hidden = !next;
    setFits(next);
  }, [children]);

  return (
    <p
      ref={ref}
      hidden={!fits}
      data-slot="tooltip-description"
      className={cn(
        "text-sm leading-5 text-white/70",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

function TooltipAction({
  className,
  variant = "secondary",
  size = "sm",
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="tooltip-action"
      variant={variant}
      size={size}
      className={cn(
        "w-full bg-white/15 text-on-inverted hover:bg-white/20 data-pressed:bg-white/20",
        className,
      )}
      {...props}
    />
  );
}

function slugifyDocumentationPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function documentationCalloutPageName(page?: string) {
  if (page) return slugifyDocumentationPart(page);
  if (typeof window === "undefined") return "unknown";
  const segment =
    window.location.pathname.split("/").filter(Boolean).at(-1) ?? "home";
  return slugifyDocumentationPart(segment);
}

function adjacentDocumentationHeading(root: HTMLElement | null) {
  if (!root) return undefined;
  const labeled = root
    .closest("[data-docs-heading]")
    ?.getAttribute("data-docs-heading");
  if (labeled) return labeled;
  const previous = root.previousElementSibling?.textContent?.trim();
  if (previous) return previous;
  const parent = root.parentElement;
  if (!parent) return undefined;
  for (const child of parent.children) {
    if (child === root) continue;
    const text = child.textContent?.trim();
    if (text) return text;
  }
  return undefined;
}

function documentationCalloutSource({
  page,
  heading,
  title,
  root,
}: {
  page?: string;
  heading?: string;
  title: string;
  root: HTMLElement | null;
}) {
  const resolvedHeading =
    heading ?? adjacentDocumentationHeading(root) ?? title;
  return `${documentationCalloutPageName(page)}/${slugifyDocumentationPart(resolvedHeading)}`;
}

function captureDocumentationCallout(source: string, href: string) {
  if (typeof window === "undefined") return;
  const posthog = (
    window as Window & {
      posthog?: { capture: (event: string, properties?: Record<string, unknown>) => void };
    }
  ).posthog;
  posthog?.capture("documentation_callout_clicked", { source, href });
}

function DocumentationCallout({
  title,
  description,
  href,
  docsLabel = "View docs",
  page,
  heading,
  action,
  label = "More information",
  defaultOpen,
  side,
  align,
  ...triggerProps
}: {
  title: string;
  description?: string;
  href: string;
  docsLabel?: string;
  page?: string;
  heading?: string;
  action?: ComponentProps<typeof TooltipAction>;
  label?: string;
  defaultOpen?: boolean;
} & Pick<TooltipPopupProps, "side" | "align"> &
  Pick<TooltipPrimitive.Trigger.Props, "closeDelay">) {
  const rootRef = useRef<HTMLSpanElement>(null);

  return (
    <span ref={rootRef} className="inline-flex">
      <Tooltip defaultOpen={defaultOpen}>
        <TooltipTrigger
          closeDelay={triggerProps.closeDelay ?? 150}
          render={
            <Button
              variant="transparent"
              size="icon-sm"
              aria-label={label}
              className="bg-transparent text-fg-tertiary"
            />
          }
        >
          <CircleInfoIcon className="size-4 text-fg-tertiary" />
        </TooltipTrigger>
        <TooltipPopup side={side} align={align}>
          <TooltipHeader>
            <TooltipTitle>{title}</TooltipTitle>
            {description ? (
              <TooltipDescription>{description}</TooltipDescription>
            ) : null}
          </TooltipHeader>
          <TooltipAction
            {...action}
            render={<a href={href} target="_blank" rel="noreferrer" />}
            onClick={(event) => {
              captureDocumentationCallout(
                documentationCalloutSource({
                  page,
                  heading,
                  title,
                  root: rootRef.current,
                }),
                href,
              );
              action?.onClick?.(event);
            }}
          >
            {action?.children ?? docsLabel}
          </TooltipAction>
        </TooltipPopup>
      </Tooltip>
    </span>
  );
}

/** @deprecated Prefer `TooltipPopup`. */
function TooltipContent(props: ComponentProps<typeof TooltipPopup>) {
  return <TooltipPopup {...props} />;
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipPopup,
  TooltipContent,
  TooltipHeader,
  TooltipTitle,
  TooltipDescription,
  TooltipAction,
  DocumentationCallout,
  TooltipProvider,
  TooltipCreateHandle,
  tooltipPopupVariants,
};
