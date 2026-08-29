import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const textVariants = cva("text-fg", {
  variants: {
    size: {
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
      xl: "text-xl",
      "2xl": "text-2xl",
    },
    weight: {
      regular: "font-normal",
      medium: "font-medium",
    },
    color: {
      default: "text-fg",
      secondary: "text-fg-secondary",
      tertiary: "text-fg-tertiary",
      quaternary: "text-text-quaternary",
      disabled: "text-text-disabled",
    },
  },
  defaultVariants: {
    size: "base",
    weight: "regular",
    color: "default",
  },
});

function Text({
  className,
  size,
  weight,
  color,
  as: Comp = "p",
  ...props
}: Omit<React.ComponentProps<"p">, "color"> &
  VariantProps<typeof textVariants> & {
    as?: "p" | "span" | "div";
  }) {
  return (
    <Comp
      data-slot="text"
      className={cn(textVariants({ size, weight, color }), className)}
      {...props}
    />
  );
}

export { Text, textVariants };
