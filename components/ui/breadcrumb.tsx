import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";

import { ChevronRightIcon, MoreHorizontalIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const crumbClassName =
  "inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150";

function Breadcrumb({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      aria-label="breadcrumb"
      data-slot="breadcrumb"
      className={cn(className)}
      {...props}
    />
  );
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "flex flex-wrap items-center gap-1 text-sm wrap-break-word",
        className
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center", className)}
      {...props}
    />
  );
}

function BreadcrumbLink({
  className,
  render,
  ...props
}: useRender.ComponentProps<"a">) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn(
          crumbClassName,
          "text-fg-quaternary hover:bg-neutral-100",
          className
        ),
      },
      props
    ),
    render,
    state: {
      slot: "breadcrumb-link",
    },
  });
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn(crumbClassName, "text-fg", className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("flex items-center text-fg-quaternary [&>svg]:size-4", className)}
      {...props}
    >
      {children ?? <ChevronRightIcon aria-hidden />}
    </li>
  );
}

function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="breadcrumb-ellipsis"
      aria-label="Show collapsed breadcrumbs"
      className={cn(
        crumbClassName,
        "cursor-pointer text-fg-quaternary outline-none hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-brand-border-focus [&>svg]:size-4",
        className
      )}
      {...props}
    >
      <MoreHorizontalIcon aria-hidden />
      <span className="sr-only">More</span>
    </button>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
