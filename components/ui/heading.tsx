import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const headingVariants = cva("font-heading font-medium text-fg", {
  variants: {
    size: {
      "2xl": "text-2xl",
      xl: "text-xl",
      lg: "text-lg",
      base: "text-base",
    },
    weight: {
      regular: "font-normal",
      medium: "font-medium",
    },
  },
  defaultVariants: {
    size: "2xl",
    weight: "medium",
  },
});

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

function Heading({
  className,
  size = "2xl",
  weight = "medium",
  as,
  ...props
}: React.ComponentProps<"h2"> &
  VariantProps<typeof headingVariants> & {
    as?: HeadingTag;
  }) {
  const tagBySize: Record<NonNullable<typeof size>, HeadingTag> = {
    "2xl": "h1",
    xl: "h2",
    lg: "h3",
    base: "h4",
  };
  const Comp = as ?? tagBySize[size ?? "2xl"];

  return (
    <Comp
      data-slot="heading"
      className={cn(headingVariants({ size, weight }), className)}
      {...props}
    />
  );
}

export { Heading, headingVariants };
