import type React from "react";
import { LoaderIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export function Spinner({
  className,
  ...props
}: React.ComponentProps<typeof LoaderIcon>): React.ReactElement {
  return (
    <span className="inline-flex" role="status">
      <LoaderIcon
        aria-label="Loading"
        className={cn("size-3.5 animate-spin", className)}
        {...props}
      />
    </span>
  );
}
