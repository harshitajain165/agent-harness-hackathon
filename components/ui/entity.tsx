import { cn } from "@/lib/utils";

function Entity({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="entity"
      className={cn("flex min-w-0 flex-1 items-center gap-3", className)}
      {...props}
    />
  );
}

function EntityMedia({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="entity-media"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        children ? null : "size-10 bg-neutral-150",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function EntityContent({
  className,
  title,
  description,
  children,
  weight = "regular",
  ...props
}: React.ComponentProps<"div"> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  weight?: "regular" | "medium";
}) {
  return (
    <div
      data-slot="entity-content"
      className={cn("flex min-w-0 flex-1 flex-col items-stretch", className)}
      {...props}
    >
      {title ? <EntityTitle weight={weight}>{title}</EntityTitle> : null}
      {description ? <EntityDescription>{description}</EntityDescription> : null}
      {children}
    </div>
  );
}

function EntityTitle({
  className,
  weight = "regular",
  ...props
}: React.ComponentProps<"div"> & {
  weight?: "regular" | "medium";
}) {
  return (
    <div
      data-slot="entity-title"
      className={cn(
        "truncate text-sm leading-5 text-fg",
        weight === "medium" ? "font-medium" : "font-normal",
        className
      )}
      {...props}
    />
  );
}

function EntityDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="entity-description"
      className={cn(
        "truncate text-sm leading-5 font-normal text-neutral-900/50",
        className
      )}
      {...props}
    />
  );
}

function EntityAside({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="entity-aside"
      className={cn("ml-auto flex shrink-0 items-center gap-2", className)}
      {...props}
    />
  );
}

export {
  Entity,
  EntityMedia,
  EntityContent,
  EntityTitle,
  EntityDescription,
  EntityAside,
};
