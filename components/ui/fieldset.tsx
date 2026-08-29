"use client"

import { Fieldset as FieldsetPrimitive } from "@base-ui/react/fieldset"
import type React from "react"

import { cn } from "@/lib/utils"

export function Fieldset({ className, ...props }: FieldsetPrimitive.Root.Props): React.ReactElement {
  return <FieldsetPrimitive.Root data-slot="fieldset" className={cn("flex flex-col gap-4", className)} {...props} />
}

export function FieldsetLegend({ className, ...props }: FieldsetPrimitive.Legend.Props): React.ReactElement {
  return <FieldsetPrimitive.Legend data-slot="fieldset-legend" className={cn("text-sm leading-5 font-medium text-fg", className)} {...props} />
}

export { FieldsetPrimitive }
