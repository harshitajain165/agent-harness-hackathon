import { cn } from "@/lib/utils";

function Code({ className, ...props }: React.ComponentProps<"code">) {
  return (
    <code
      data-slot="code"
      className={cn(
        "rounded-md bg-neutral-100 px-1 py-0.5 font-mono text-[0.92em] text-fg",
        className
      )}
      {...props}
    />
  );
}

export { Code };
