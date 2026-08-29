import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  size = 20,
  inverted = false,
}: {
  className?: string;
  size?: number;
  inverted?: boolean;
}) {
  const cell = inverted ? "bg-on-inverted" : "bg-fg";
  const muted = inverted ? "bg-on-inverted/40" : "bg-fg/40";

  return (
    <span
      className={cn("grid grid-cols-2 grid-rows-2 gap-px", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className={cell} />
      <span className={muted} />
      <span className={muted} />
      <span />
    </span>
  );
}
