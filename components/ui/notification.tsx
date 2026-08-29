"use client";

import * as React from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

function formatNotificationCount(count: number) {
  if (count <= 0) return null;
  if (count > 99) return "99+";
  return String(count);
}

function Notification({
  avatar,
  author,
  time,
  source,
  title,
  description,
  unread = true,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  avatar: React.ReactNode;
  author: string;
  time: string;
  source?: React.ReactNode;
  title: string;
  description: string;
  unread?: boolean;
}) {
  return (
    <button
      type="button"
      data-slot="notification"
      data-unread={unread ? "true" : undefined}
      className={cn(
        "relative grid w-full grid-cols-[auto_minmax(0,1fr)] gap-x-3 px-4 pt-3.5 pb-2 text-left outline-none",
        "transition-colors duration-150 hover:bg-neutral-50",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-border-focus",
        className
      )}
      {...props}
    >
      <span className="row-span-3 mt-0.5 flex size-6 shrink-0 items-start justify-center">
        {avatar}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
          {author}
        </span>
        <span className="shrink-0 text-sm text-fg-tertiary">{time}</span>
        {source ? (
          <span className="flex size-4 shrink-0 items-center justify-center text-fg-tertiary [&_svg]:size-4">
            {source}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "mt-0.5 min-w-0 truncate text-sm",
          unread ? "font-medium text-fg" : "font-normal text-fg-secondary"
        )}
      >
        {title}
      </span>
      <span className="min-w-0 truncate text-sm font-normal text-fg-secondary">
        {description}
      </span>
    </button>
  );
}

function NotificationTray({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="notification-tray"
      className={cn(
        "flex max-h-[min(28rem,70vh)] min-h-72 w-full flex-col overflow-hidden",
        className
      )}
      {...props}
    />
  );
}

function NotificationTrayHeader({
  className,
  trailing,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  trailing?: React.ReactNode;
}) {
  return (
    <div
      data-slot="notification-tray-header"
      className={cn(
        "flex min-h-14 shrink-0 items-center justify-between gap-3 pt-2 pb-4 pl-4",
        trailing ? "pr-2" : "pr-4",
        className
      )}
      {...props}
    >
      <p className="text-base font-medium text-fg">{children}</p>
      {trailing ? (
        <div className="flex shrink-0 items-center gap-0">{trailing}</div>
      ) : null}
    </div>
  );
}

function NotificationTrayList({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [fade, setFade] = React.useState({ top: false, bottom: false });

  const updateFade = React.useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const threshold = 1;
    const next = {
      top: scroller.scrollTop > threshold,
      bottom:
        scroller.scrollTop + scroller.clientHeight <
        scroller.scrollHeight - threshold,
    };
    setFade((current) =>
      current.top === next.top && current.bottom === next.bottom
        ? current
        : next
    );
  }, []);

  React.useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    updateFade();
    scroller.addEventListener("scroll", updateFade, { passive: true });
    const observer = new ResizeObserver(updateFade);
    observer.observe(scroller);
    if (contentRef.current) observer.observe(contentRef.current);
    return () => {
      scroller.removeEventListener("scroll", updateFade);
      observer.disconnect();
    };
  }, [children, updateFade]);

  return (
    <div className="relative grid min-h-0 flex-1">
      <ScrollArea
        data-slot="notification-tray-list"
        data-fade-top={fade.top ? "true" : undefined}
        data-fade-bottom={fade.bottom ? "true" : undefined}
        viewportRef={scrollerRef}
        className={cn("min-h-0 [grid-area:1/1]", className)}
        viewportClassName="overscroll-contain focus-visible:ring-0 [&_[data-slot=notification]:not(:last-child)]:after:pointer-events-none [&_[data-slot=notification]:not(:last-child)]:after:absolute [&_[data-slot=notification]:not(:last-child)]:after:right-[5%] [&_[data-slot=notification]:not(:last-child)]:after:bottom-0 [&_[data-slot=notification]:not(:last-child)]:after:left-[5%] [&_[data-slot=notification]:not(:last-child)]:after:h-px [&_[data-slot=notification]:not(:last-child)]:after:bg-neutral-150 [&_[data-slot=notification]:not(:last-child)]:after:content-['']"
        {...props}
      >
        <div ref={contentRef}>{children}</div>
      </ScrollArea>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none z-10 h-8 self-start [grid-area:1/1] bg-gradient-to-b from-neutral-0 to-transparent transition-opacity duration-150",
          fade.top ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none z-10 h-8 self-end [grid-area:1/1] bg-gradient-to-t from-neutral-0 to-transparent transition-opacity duration-150",
          fade.bottom ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}

const EMPTY_COPY = {
  never: {
    title: "No notifications yet",
    description: "Alerts about your workspace will show up here.",
  },
  "caught-up": {
    title: "You're all caught up",
    description: null,
  },
} as const;

function NotificationTrayEmpty({
  variant = "caught-up",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  variant?: keyof typeof EMPTY_COPY;
}) {
  const copy = EMPTY_COPY[variant];

  return (
    <div
      data-slot="notification-tray-empty"
      data-variant={variant}
      className={cn(
        "flex flex-1 flex-col items-center justify-center self-stretch px-8 text-center",
        className
      )}
      {...props}
    >
      {/* Pull up by half the header height so copy centers in the full tray. */}
      <div className="-translate-y-7 flex flex-col items-center">
        <p className="text-sm font-medium text-fg">{copy.title}</p>
        {copy.description ? (
          <p className="mt-1 max-w-[184px] text-sm text-balance text-fg-secondary">
            {copy.description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function NotificationCount({
  count,
  className,
  style,
  ...props
}: React.ComponentProps<"span"> & {
  count: number;
}) {
  const isOpen = count > 0;
  const [label, setLabel] = React.useState(count);

  React.useEffect(() => {
    if (count > 0) {
      setLabel(count);
    }
  }, [count]);

  const display = formatNotificationCount(label) ?? "0";
  const isPill = display.length > 1;
  const right = display.length > 2 ? -10 : isPill ? -5 : -1;

  return (
    <span
      data-slot="notification-count"
      data-open={isOpen}
      aria-hidden
      className={cn("pointer-events-none absolute z-10", className)}
      style={{ top: -3, right, ...style }}
      {...props}
    >
      <span
        data-slot="notification-count-label"
        className={cn(
          "inline-flex items-center justify-center rounded-full py-px text-[10px] leading-4 font-medium text-on-inverted tabular-nums",
          isPill ? "min-h-5 px-1.5" : "size-5 px-1"
        )}
      >
        {display}
      </span>
    </span>
  );
}

export {
  Notification,
  NotificationCount,
  NotificationTray,
  NotificationTrayEmpty,
  NotificationTrayHeader,
  NotificationTrayList,
  formatNotificationCount,
};
