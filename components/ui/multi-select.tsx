"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";

import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectMultipleValue,
  SelectSeparator,
  SelectTrigger,
} from "@/components/ui/select";

/**
 * A fixed-list control for choosing more than one value.
 *
 * `Select` remains intentionally single-select; use `Combobox` when the list
 * needs search instead of placing that responsibility on this component.
 */
function MultiSelect<Value>({ ...props }: Omit<SelectPrimitive.Root.Props<Value, true>, "multiple">) {
  return <SelectPrimitive.Root multiple {...props} />;
}

function MultiSelectItem({ ...props }: SelectPrimitive.Item.Props & {
  indicatorPosition?: "leading" | "trailing";
  leading?: React.ReactNode;
}) {
  return <SelectItem selection="multiple" {...props} />;
}

export {
  MultiSelect,
  MultiSelectItem,
  SelectContent as MultiSelectContent,
  SelectGroup as MultiSelectGroup,
  SelectLabel as MultiSelectLabel,
  SelectMultipleValue as MultiSelectValue,
  SelectSeparator as MultiSelectSeparator,
  SelectTrigger as MultiSelectTrigger,
};
