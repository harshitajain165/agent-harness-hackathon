"use client";

import * as React from "react";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";

import { cn } from "@/lib/utils";

function ScrollArea({
  className,
  viewportClassName,
  viewportRef,
  scrollFade = false,
  children,
  ...props
}: ScrollAreaPrimitive.Root.Props & {
  viewportClassName?: string;
  viewportRef?: React.Ref<HTMLDivElement>;
  /** Fade overflowing content at the viewport edges. */
  scrollFade?: boolean;
}) {
  const viewportRefInternal = React.useRef<HTMLDivElement>(null);
  const setViewportRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      viewportRefInternal.current = node;
      if (typeof viewportRef === "function") {
        viewportRef(node);
      } else if (viewportRef) {
        viewportRef.current = node;
      }
    },
    [viewportRef]
  );
  const [fade, setFade] = React.useState({
    top: false,
    right: false,
    bottom: false,
    left: false,
  });

  const updateFade = React.useCallback(() => {
    const viewport = viewportRefInternal.current;
    if (!viewport || !scrollFade) return;

    const threshold = 1;
    const next = {
      top: viewport.scrollTop > threshold,
      right:
        viewport.scrollLeft + viewport.clientWidth <
        viewport.scrollWidth - threshold,
      bottom:
        viewport.scrollTop + viewport.clientHeight <
        viewport.scrollHeight - threshold,
      left: viewport.scrollLeft > threshold,
    };
    setFade((current) =>
      current.top === next.top &&
      current.right === next.right &&
      current.bottom === next.bottom &&
      current.left === next.left
        ? current
        : next
    );
  }, [scrollFade]);

  React.useLayoutEffect(() => {
    if (!scrollFade) return;
    const viewport = viewportRefInternal.current;
    if (!viewport) return;

    updateFade();
    const observer = new ResizeObserver(updateFade);
    observer.observe(viewport);
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
    return () => observer.disconnect();
  }, [children, scrollFade, updateFade]);

  const verticalMask = fade.top || fade.bottom
    ? `linear-gradient(to bottom, ${fade.top ? "transparent 0, black 20px" : "black 0"}, ${fade.bottom ? "black calc(100% - 20px), transparent 100%" : "black 100%"})`
    : undefined;
  const horizontalMask = fade.left || fade.right
    ? `linear-gradient(to right, ${fade.left ? "transparent 0, black 20px" : "black 0"}, ${fade.right ? "black calc(100% - 20px), transparent 100%" : "black 100%"})`
    : undefined;
  const maskImage = verticalMask ?? horizontalMask;

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={setViewportRef}
        data-slot="scroll-area-viewport"
        data-fade-top={fade.top ? "true" : undefined}
        data-fade-right={fade.right ? "true" : undefined}
        data-fade-bottom={fade.bottom ? "true" : undefined}
        data-fade-left={fade.left ? "true" : undefined}
        onScroll={updateFade}
        style={scrollFade && maskImage ? { maskImage, WebkitMaskImage: maskImage } : undefined}
        className={cn(
          "size-full overscroll-contain rounded-[inherit] outline-none transition-[color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-brand-border-focus",
          viewportClassName
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors duration-150 select-none data-horizontal:h-1.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-1.5 data-vertical:border-l data-vertical:border-l-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-neutral-300"
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
