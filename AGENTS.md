<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Smallest Design System — agent rules

This repo is the **source of truth** for Smallest UI. Components use **shadcn/ui Base UI (`base-nova`)** internals with **Smallest tokens and public APIs**.

## Import contract

- Components: `@/components/ui/<name>` (e.g. `@/components/ui/button`)
- Icons: `@/components/icons` (custom product set — never Lucide or Central Icons)
- Utils: `@/lib/utils` (`cn`, `controlSurfaceClass`, `floatingSurfaceClassName`)
- Tokens: `app/globals.css` — prefer Neutral primitives (`bg-neutral-0`, `bg-neutral-100`, `text-neutral-950`, `border-neutral-200`). `text-fg*` aliases map to neutrals. Neutral-100 surfaces are flat.

## Do NOT

- Run `shadcn init` or bulk theme/style installs (overwrites Smallest theme in `globals.css`)
- Bulk `shadcn add` without restyling each file to Smallest tokens
- Use shadcn variant names in app code (`default`, `outline`, `ghost`) — use Smallest names (`primary`, `secondary`, `tertiary`, etc.) where defined
- Add `font-semibold` (Aeonik has Regular 400 and Medium 500 only)
- Use `text-xs` in UI chrome (minimum `text-sm` / 14px)
- Add `@radix-ui/*` — this project is Base UI only
- Add a Sheet component — use Drawer (`@/components/ui/drawer`) for edge panels and nesting

## Adding a component from shadcn

1. `pnpm dlx shadcn@latest add <name>` (one at a time; project style is `base-nova`)
2. Restyle: Smallest tokens, `rounded-[10px]`, `text-sm font-medium`, `duration-150`, product icons from `@/components/icons`
3. Keep Smallest public props; do not add `pending` / `loading` to Button
4. Run `node scripts/restyle-shadcn.mjs` for token alias pass after adding

## Button API (locked)

Variants: `primary`, `secondary`, `tertiary`, `brand`, `danger`, `danger-subtle`, `link`, `link-primary`, `link-danger`, `transparent`

Sizes: `sm`, `md`, `lg`, `xl`. Shapes: `rounded`, `pill`. Split: `SplitButton`.

**Primary (locked):** `bg-neutral-950 text-on-inverted`. Hover `neutral-800`. Split chevron half gets a full-height 1px `border-on-inverted/20` seam.

**Secondary (locked):** `bg-neutral-100 text-fg shadow-none`; hover `neutral-150`, pressed `neutral-200`. **Tertiary:** `border-0 bg-neutral-0 text-fg shadow-sm`. Neutral-100 surfaces never use a shadow.

**Padding (horizontal / vertical):** sm 12/6, md 12/8, lg 16/10, xl 18/12. Icon-only buttons use the same square recipe (`icon-sm` … `icon-xl`). When a leading or trailing icon is present, that side’s horizontal padding is 2px less than text-only.

**Icon sizes (in progress):** Target is 16px at sm/md and 20px at lg/xl via button `[&_svg]` rules. Not fully locked yet — local overrides are in use where chrome needs a fixed 16px icon (e.g. header changelog `HistoryIcon` at `size="lg"`, command copy at `size="md"`). Prefer explicit `className="size-4"` on the icon until sizing is decoupled from button size.

Text-only md is `px-3 py-2`. With a leading icon at md: `pl-2.5 pr-3`.

`ghost` / `outline` exist only as internal aliases for shadcn-composed primitives (calendar, dialog). Do not use them in product or docs.

## Input-family API

Inputs, textareas, input groups, select triggers, combobox triggers, and date-picker triggers share the same surface mapping.

**Primary:** `bg-neutral-100 shadow-none`. **Secondary:** `bg-neutral-0 shadow-sm`. Primary is the default everywhere, including controls embedded in lists.

**Padding (matches buttons):** Text-only is `px-3`. Leading icon: `pl-2.5 pr-3`. Trailing icon: `pl-3 pr-2.5`. Both: `pl-2.5 pr-2.5`. Icon↔label gap is `gap-2` (`InputGroupAddon` uses the same outer pad + `pr-2`/`pl-2` between icon and field). Use `controlPaddingLeadingIconClassName` / `controlPaddingTrailingIconClassName` from `@/components/ui/input-group`.

## Switch API

Keep Base UI Switch; skin to the atoms-platform control.

Sizes: `default` is 55×26 with an oval thumb (32×22). `sm` is the same recipe scaled to 20px tall (`20/26`). Checked fill is `bg-fg`. Thumb uses `--shadow-switch-thumb`; track inset uses `--shadow-switch-inset`. Tables use `size="sm"`.

## Slider API

Keep the direct atoms-platform Motion slider implementation. It is controlled through `value` and `onChange`, has no visual variants, and changes only the original teal recipe to neutral fills with a black handle.

## Gauge API

Circular 0–100 meter inspired by Vercel Geist. Sizes: `sm` `md` `lg` `xl` (20 / 32 / 64 / 128). Props: `value`, `showValue`, `colors` (threshold map or `{ primary, secondary }`), `arcPriority="equal"`, `indeterminate` (static track + `SparkleIcon` at 16px), `children` for a center icon (10 / 16 / 32 / 64). Default fill scale: danger → warning → brand → positive at 25% steps. Track defaults to `neutral-200`.

## Catalog

Public components: Accordion, Avatar, Voice Avatar, Breadcrumb, Button, Calendar, Checkbox, Choicebox, Radio, Code, Command, Dialog, Dropdown, Empty State, Entity, Frame, Hover Card, Lists, Field, Fieldset, Label, Gauge, Input, Middle Truncate, Notification, Pills, Scroll Area, Drawer, Slider, Switch, Table, Tabs, Textarea, Toast, Toggle, Tooltip.

Internal: Popover, Spinner, IconButton, InputGroup, CheckboxGroup, Heading, Text, Flag.

## Typography

Aeonik Pro (`font-sans`), Geist Mono (`font-mono`). Scale: `text-sm` through `text-2xl`.

## Restyle checklist

- Replace `text-muted-foreground` → `text-fg-secondary` (or `text-neutral-600`)
- Replace `bg-background` / `bg-popover` → `bg-neutral-0`
- Replace `bg-muted` / `bg-accent` → `bg-neutral-100`
- Remove shadcn responsive size shrink (`sm:h-7` etc.) — fixed Smallest sizes
- Neutral-100 surfaces are always flat. Input-family primary is neutral-100; input-family secondary is white (`neutral-0`) with `shadow-sm`. Button secondary is neutral-100; button tertiary is white with `shadow-sm`
- Focus ring: `focus-visible:ring-2 focus-visible:ring-brand-border-focus`
- Floating panels: `floatingSurfaceClassName` from `@/lib/utils`
