import { cn } from "@/lib/utils";

function MiddleTruncate({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="middle-truncate"
      className={cn("inline-block max-w-full truncate", className)}
      {...props}
    >
      {children}
    </span>
  );
}

export { MiddleTruncate };
