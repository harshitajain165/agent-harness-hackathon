"use client";

import flags from "react-phone-number-input/flags";

import { cn } from "@/lib/utils";

export type FlagCountry = keyof typeof flags;

function Flag({
  country,
  title,
  className,
  ...props
}: React.ComponentProps<"span"> & {
  country: FlagCountry;
  title?: string;
}) {
  const Svg = flags[country];
  if (!Svg) return null;

  return (
    <span
      data-slot="flag"
      className={cn(
        "inline-flex h-[15px] w-5 shrink-0 overflow-hidden rounded-[2px] [&_svg]:!size-full",
        className
      )}
      {...props}
    >
      <Svg title={title ?? country} />
    </span>
  );
}

export { Flag };
