"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list relative isolate inline-flex w-fit items-center text-sm font-medium",
  {
    variants: {
      variant: {
        primary: "h-[38px] rounded-[11px] bg-neutral-100 p-px",
        line: "gap-5 rounded-none border-b border-neutral-150 bg-transparent px-1",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
);

function TabsIndicator({
  className,
  ...props
}: TabsPrimitive.Indicator.Props) {
  return (
    <TabsPrimitive.Indicator
      data-slot="tabs-indicator"
      className={cn("pointer-events-none absolute inset-0 z-0", className)}
      {...props}
    >
      <span
        aria-hidden
        className="absolute top-[var(--active-tab-top)] right-[var(--active-tab-right)] bottom-[var(--active-tab-bottom)] left-[var(--active-tab-left)] rounded-[10px] bg-neutral-0 shadow-sm transition-[top,right,bottom,left] duration-200 ease-in-out motion-reduce:transition-none group-data-[variant=line]/tabs-list:hidden"
      />
      <span
        aria-hidden
        className="absolute inset-x-0 -bottom-px hidden h-0.5 bg-neutral-950 transition-[clip-path] duration-200 ease-in-out motion-reduce:transition-none group-data-[variant=line]/tabs-list:block [clip-path:inset(0_var(--active-tab-right)_0_var(--active-tab-left))]"
      />
    </TabsPrimitive.Indicator>
  );
}

function TabsList({
  className,
  variant = "primary",
  children,
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      <TabsIndicator />
      {children}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative z-[1] inline-flex shrink-0 items-center justify-center gap-2 text-sm font-medium whitespace-nowrap outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-border-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        "group-data-[variant=primary]/tabs-list:h-9 group-data-[variant=primary]/tabs-list:rounded-[10px] group-data-[variant=primary]/tabs-list:px-3 group-data-[variant=primary]/tabs-list:text-fg-secondary group-data-[variant=primary]/tabs-list:hover:text-fg group-data-[variant=primary]/tabs-list:data-active:text-fg",
        "group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:px-0 group-data-[variant=line]/tabs-list:pt-1.5 group-data-[variant=line]/tabs-list:pb-2.5 group-data-[variant=line]/tabs-list:text-fg-secondary group-data-[variant=line]/tabs-list:hover:text-fg group-data-[variant=line]/tabs-list:data-active:text-fg",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  );
}

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TabsIndicator,
  tabsListVariants,
};
