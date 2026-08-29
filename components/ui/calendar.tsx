"use client"

import * as React from "react"
import { format, setHours, setMinutes } from "date-fns"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type DateRange,
  type Locale,
} from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants, type ButtonProps } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, CalendarIcon } from "@/components/icons"
import {
  controlPaddingLeadingIconClassName,
  inputGroupVariants,
} from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { VariantProps } from "class-variance-authority"

function CalendarView({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: ButtonProps["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-neutral-0 p-2 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(7)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative rounded-(--cell-radius)",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute inset-0 bg-neutral-0 opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "font-medium select-none",
          captionLayout === "label"
            ? "text-sm"
            : "flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-fg-secondary",
          defaultClassNames.caption_label
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 rounded-(--cell-radius) text-sm font-normal text-fg-secondary select-none",
          defaultClassNames.weekday
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-sm text-fg-secondary select-none",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-(--cell-radius)"
            : "[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)",
          defaultClassNames.day
        ),
        range_start: cn(
          "relative isolate z-0 rounded-l-(--cell-radius) bg-neutral-100 after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-neutral-100",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn(
          "relative isolate z-0 rounded-r-(--cell-radius) bg-neutral-100 after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-neutral-100",
          defaultClassNames.range_end
        ),
        today: cn(
          "rounded-(--cell-radius) bg-neutral-100 text-fg data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-fg-secondary aria-selected:text-fg-secondary",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-fg-secondary opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className={cn("size-4", className)} />
          }

          if (orientation === "right") {
            return <ChevronRightIcon className={cn("size-4", className)} />
          }

          return <ChevronDownIcon className={cn("size-4", className)} />
        },
        DayButton: ({ ...props }) => (
          <CalendarDayButton locale={locale} {...props} />
        ),
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 border-0 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-2 group-data-[focused=true]/day:ring-brand-border-focus data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-r-(--cell-radius) data-[range-end=true]:bg-neutral-950 data-[range-end=true]:text-on-inverted data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-neutral-100 data-[range-middle=true]:text-fg data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-l-(--cell-radius) data-[range-start=true]:bg-neutral-950 data-[range-start=true]:text-on-inverted data-[selected-single=true]:bg-neutral-950 data-[selected-single=true]:text-on-inverted dark:hover:text-fg",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

type CalendarSurfaceProps = VariantProps<typeof inputGroupVariants> & {
  className?: string
  placeholder?: string
}

type CalendarPickerProps = Omit<
  React.ComponentProps<typeof CalendarView>,
  "captionLayout" | "mode" | "selected" | "onSelect" | "numberOfMonths"
> & {
  navigation?: "buttons" | "dropdown"
}

function captionLayoutFor(navigation: CalendarPickerProps["navigation"]) {
  return navigation === "dropdown" ? "dropdown" : "label"
}

function CalendarTrigger({
  className,
  variant = "primary",
  size = "sm",
  children,
}: CalendarSurfaceProps & { children: React.ReactNode }) {
  return (
    <PopoverTrigger
      render={<button type="button" />}
      className={cn(
        inputGroupVariants({ variant, size }),
        controlPaddingLeadingIconClassName,
        "cursor-pointer items-center text-left outline-none transition-[box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-brand-border-focus data-popup-open:ring-2 data-popup-open:ring-brand-border-focus disabled:cursor-not-allowed",
        className
      )}
    >
      <CalendarIcon radius="0" className="size-4 shrink-0 text-fg-tertiary" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </PopoverTrigger>
  )
}

function Calendar({
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select date",
  variant = "primary",
  size = "sm",
  className,
  navigation,
  ...calendarProps
}: CalendarPickerProps &
  CalendarSurfaceProps & {
    value?: Date
    defaultValue?: Date
    onValueChange?: (value: Date | undefined) => void
  }) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState<Date | undefined>(defaultValue)
  const selected = value === undefined ? uncontrolledValue : value

  function handleSelect(next: Date | undefined) {
    if (value === undefined) setUncontrolledValue(next)
    onValueChange?.(next)
  }

  return (
    <Popover>
      <CalendarTrigger className={className} variant={variant} size={size}>
        {selected ? format(selected, "MMM d, yyyy") : <span className="text-fg-tertiary">{placeholder}</span>}
      </CalendarTrigger>
      <PopoverContent align="start" className="w-fit gap-0 p-0">
        <CalendarView
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          captionLayout={captionLayoutFor(navigation)}
          className="bg-neutral-0 p-3"
          {...calendarProps}
        />
      </PopoverContent>
    </Popover>
  )
}

function formatDateRange(value: DateRange | undefined, placeholder: string) {
  if (!value?.from) return placeholder
  if (!value.to) return `${format(value.from, "MMM d, yyyy")} –`
  return `${format(value.from, "MMM d")} – ${format(value.to, "MMM d, yyyy")}`
}

function CalendarRange({
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select date range",
  variant = "primary",
  size = "sm",
  className,
  navigation,
  ...calendarProps
}: CalendarPickerProps &
  CalendarSurfaceProps & {
    value?: DateRange
    defaultValue?: DateRange
    onValueChange?: (value: DateRange | undefined) => void
  }) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState<DateRange | undefined>(defaultValue)
  const selected = value === undefined ? uncontrolledValue : value

  function handleSelect(next: DateRange | undefined) {
    if (value === undefined) setUncontrolledValue(next)
    onValueChange?.(next)
  }

  return (
    <Popover>
      <CalendarTrigger className={className} variant={variant} size={size}>
        {formatDateRange(selected, placeholder)}
      </CalendarTrigger>
      <PopoverContent align="start" className="w-fit gap-0 p-0">
        <CalendarView
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={size === "md" ? 2 : 1}
          captionLayout={captionLayoutFor(navigation)}
          className="bg-neutral-0 p-3"
          {...calendarProps}
        />
      </PopoverContent>
    </Popover>
  )
}

type CalendarRangeTimeValue = {
  from?: Date
  to?: Date
}

function updateTime(date: Date | undefined, time: string) {
  if (!date || !time) return date
  const [hours, minutes] = time.split(":").map(Number)
  return setMinutes(setHours(date, hours), minutes)
}

function CalendarRangeTime({
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select date range",
  variant = "primary",
  size = "md",
  className,
  navigation,
  ...calendarProps
}: CalendarPickerProps &
  CalendarSurfaceProps & {
    value?: CalendarRangeTimeValue
    defaultValue?: CalendarRangeTimeValue
    onValueChange?: (value: CalendarRangeTimeValue | undefined) => void
  }) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState<CalendarRangeTimeValue | undefined>(defaultValue)
  const selected = value === undefined ? uncontrolledValue : value
  const range = React.useMemo<DateRange | undefined>(() => selected && ({ from: selected.from, to: selected.to }), [selected])

  function commit(next: CalendarRangeTimeValue | undefined) {
    if (value === undefined) setUncontrolledValue(next)
    onValueChange?.(next)
  }

  return (
    <Popover>
      <CalendarTrigger className={className} variant={variant} size={size}>
        {formatDateRange(range, placeholder)}
      </CalendarTrigger>
      <PopoverContent align="start" className="w-fit gap-0 p-0">
        <CalendarView
          mode="range"
          selected={range}
          onSelect={(next) => commit(next && { from: next.from, to: next.to })}
          numberOfMonths={2}
          captionLayout={captionLayoutFor(navigation)}
          className="bg-neutral-0 p-3"
          {...calendarProps}
        />
        <div className="grid grid-cols-2 gap-1.5 border-t border-neutral-150 p-3">
          <CalendarTimeField label="Start time" value={selected?.from} onChange={(time) => commit({ ...selected, from: updateTime(selected?.from, time) })} />
          <CalendarTimeField label="End time" value={selected?.to} onChange={(time) => commit({ ...selected, to: updateTime(selected?.to, time) })} />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function CalendarTimeField({ label, value, onChange }: { label: string; value?: Date; onChange: (time: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
      {label}
      <input
        type="time"
        value={value ? format(value, "HH:mm") : ""}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-[10px] bg-neutral-100 px-2 text-sm font-normal text-fg outline-none focus-visible:ring-2 focus-visible:ring-brand-border-focus"
      />
    </label>
  )
}

export { Calendar, CalendarRange, CalendarRangeTime, type CalendarRangeTimeValue }
