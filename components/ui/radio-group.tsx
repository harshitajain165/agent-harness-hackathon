"use client"

import * as React from "react"
import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

type RadioVariant = "primary" | "brand"

const RadioVariantContext = React.createContext<RadioVariant>("primary")

const radioItemVariants = cva(
  "group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-border-default bg-neutral-0 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-2 focus-visible:ring-brand-border-focus disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger-solid aria-invalid:ring-2 aria-invalid:ring-danger-solid",
  {
    variants: {
      variant: {
        primary: "data-checked:border-neutral-950 data-checked:bg-neutral-950",
        brand: "data-checked:border-brand-solid data-checked:bg-brand-solid",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
)

function RadioGroup({
  className,
  variant = "primary",
  ...props
}: RadioGroupPrimitive.Props & { variant?: RadioVariant }) {
  return (
    <RadioVariantContext.Provider value={variant}>
      <RadioGroupPrimitive
        data-slot="radio-group"
        data-variant={variant}
        className={cn("grid w-full gap-2", className)}
        {...props}
      />
    </RadioVariantContext.Provider>
  )
}

function RadioGroupItem({
  className,
  variant,
  ...props
}: RadioPrimitive.Root.Props & VariantProps<typeof radioItemVariants>) {
  const groupVariant = React.useContext(RadioVariantContext)
  const resolvedVariant = variant ?? groupVariant

  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      data-variant={resolvedVariant}
      className={cn(radioItemVariants({ variant: resolvedVariant }), className)}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex size-4 items-center justify-center"
      >
        <span
          className={cn(
            "absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full",
            resolvedVariant === "brand" ? "bg-on-brand" : "bg-on-inverted"
          )}
        />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  )
}

const radioChoiceClasses =
  "group flex w-full cursor-pointer gap-3 rounded-[10px] bg-neutral-100 outline-none shadow-none ring-1 ring-inset ring-transparent transition-[background-color,box-shadow] duration-150 hover:bg-neutral-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-border-focus has-[[data-checked]]:bg-blue-50 has-[[data-checked]]:ring-brand-border-focus has-[[data-checked]]:hover:bg-blue-50 has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-50"

const radioCardVariants = cva(radioChoiceClasses, {
  variants: {
    layout: {
      card: "p-4",
      row: "items-center px-3 py-2.5",
    },
  },
})

type RadioChoiceProps = Omit<RadioPrimitive.Root.Props, "children" | "className" | "id"> & {
  title: React.ReactNode
  description?: React.ReactNode
  className?: string
  id?: string
  variant?: RadioVariant
}

function RadioChoice({
  title,
  description,
  className,
  id: providedId,
  ...props
}: RadioChoiceProps & { layout: "card" | "row" }) {
  const generatedId = React.useId()
  const id = providedId ?? generatedId
  const { layout, ...radioProps } = props

  return (
    <label
      htmlFor={id}
      data-slot={`radio-${layout}`}
      className={cn(radioCardVariants({ layout }), className)}
    >
      <RadioGroupItem id={id} className="mt-0.5" {...radioProps} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-medium text-fg">{title}</span>
        {description ? <span className="text-sm text-fg-secondary">{description}</span> : null}
      </span>
    </label>
  )
}

function RadioCard(props: RadioChoiceProps) {
  return <RadioChoice {...props} layout="card" />
}

function RadioRow(props: RadioChoiceProps) {
  return <RadioChoice {...props} layout="row" />
}

export { RadioCard, RadioGroup, RadioGroupItem, RadioGroupItem as Radio, RadioRow, type RadioChoiceProps, type RadioVariant }
