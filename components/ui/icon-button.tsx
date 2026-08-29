import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

const iconSizeMap = {
  sm: "icon-sm",
  md: "icon",
  lg: "icon-lg",
  xl: "icon-xl",
  default: "icon",
  icon: "icon",
  "icon-sm": "icon-sm",
  "icon-lg": "icon-lg",
  "icon-xl": "icon-xl",
  "icon-xs": "icon-xs",
} as const;

function IconButton({
  className,
  size: sizeProp = "md",
  "aria-label": ariaLabel,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, "size"> &
  Pick<VariantProps<typeof buttonVariants>, "variant" | "shape" | "size"> & {
    "aria-label": string;
  }) {
  const size = iconSizeMap[sizeProp as keyof typeof iconSizeMap] ?? "icon";

  return (
    <Button
      aria-label={ariaLabel}
      size={size}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}

export { IconButton };
