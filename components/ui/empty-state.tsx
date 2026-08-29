import { Children, cloneElement, isValidElement } from "react";

import { cn } from "@/lib/utils";

function EmptyState({
  className,
  align = "center",
  ...props
}: React.ComponentProps<"div"> & {
  align?: "center" | "start";
}) {
  return (
    <div
      data-slot="empty-state"
      data-align={align}
      role="status"
      className={cn(
        "flex w-full max-w-[360px] flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-stretch text-left",
        "[&_[data-slot=empty-state-title]+[data-slot=empty-state-status]]:-mt-2",
        "[&_[data-slot=empty-state-title]+[data-slot=empty-state-description]]:-mt-2",
        "[&_[data-slot=empty-state-status]+[data-slot=empty-state-description]]:-mt-2",
        className
      )}
      {...props}
    />
  );
}

function EmptyStateIcon({
  className,
  variant = "well",
  children,
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "well" | "plain";
}) {
  return (
    <div
      data-slot="empty-state-icon"
      data-variant={variant}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center text-fg [&_svg]:size-5",
        className
      )}
      {...props}
    >
      {Children.map(children, (child) =>
        isValidElement<{ fill?: "outlined" | "filled" }>(child)
          ? cloneElement(child, { fill: "filled" })
          : child
      )}
    </div>
  );
}

function EmptyStateTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="empty-state-title"
      className={cn("text-base font-medium text-fg", className)}
      {...props}
    />
  );
}

function EmptyStateStatus({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-state-status"
      className={cn("text-base font-medium text-warning-fg", className)}
      {...props}
    />
  );
}

function EmptyStateDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-state-description"
      className={cn("text-base text-pretty text-fg-secondary", className)}
      {...props}
    />
  );
}

function EmptyStateActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state-actions"
      className={cn("mt-3 flex flex-col items-center gap-2", className)}
      {...props}
    />
  );
}

export {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateStatus,
  EmptyStateTitle,
};
