import { cn } from "@/lib/utils";

function CodeBlock({
  className,
  ...props
}: React.ComponentProps<"pre">) {
  return (
    <pre
      data-slot="code-block"
      className={cn(
        "overflow-x-auto rounded-[10px] bg-neutral-100 p-4 font-mono text-sm text-fg",
        className
      )}
      {...props}
    />
  );
}

export { CodeBlock };
