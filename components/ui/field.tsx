"use client"

import { Field as FieldPrimitive } from "@base-ui/react/field"
import type React from "react"

import { cn } from "@/lib/utils"

export function Field({ className, ...props }: FieldPrimitive.Root.Props): React.ReactElement {
  return <FieldPrimitive.Root data-slot="field" className={cn("flex flex-col items-start gap-2", className)} {...props} />
}

export function FieldLabel({ className, ...props }: FieldPrimitive.Label.Props): React.ReactElement {
  return <FieldPrimitive.Label data-slot="field-label" className={cn("inline-flex items-center gap-2 text-sm leading-5 font-medium text-fg data-disabled:opacity-50", className)} {...props} />
}

export function FieldItem({ className, ...props }: FieldPrimitive.Item.Props): React.ReactElement {
  return <FieldPrimitive.Item data-slot="field-item" className={cn("flex", className)} {...props} />
}

export function FieldDescription({ className, ...props }: FieldPrimitive.Description.Props): React.ReactElement {
  return <FieldPrimitive.Description data-slot="field-description" className={cn("text-sm leading-5 text-fg-secondary", className)} {...props} />
}

export function FieldError({ className, children, ...props }: FieldPrimitive.Error.Props): React.ReactElement {
  return (
    <FieldPrimitive.Error
      data-slot="field-error"
      className={className}
      {...props}
      render={(errorProps) => {
        const { children: message, ...rootProps } = errorProps
        return (
          <div {...rootProps}>
            <div data-slot="field-error-clip">
              <div data-slot="field-error-message" className="text-sm leading-5 text-danger-fg">
                {message}
              </div>
            </div>
          </div>
        )
      }}
    >
      {children}
    </FieldPrimitive.Error>
  )
}

export const FieldControl: typeof FieldPrimitive.Control = FieldPrimitive.Control
export const FieldValidity: typeof FieldPrimitive.Validity = FieldPrimitive.Validity
export { FieldPrimitive }
