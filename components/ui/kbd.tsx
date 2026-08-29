import type { ComponentProps, ReactNode } from "react";

import {
  AltIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CmdIcon,
  ControlIcon,
  EnterIcon,
  EscIcon,
  OptionIcon,
  ShiftIcon,
  SpacebarIcon,
  type IconProps,
} from "@/components/icons";
import { cn } from "@/lib/utils";

const KBD_GLYPH_SIZE = 12;

const KEY_ICONS: Record<string, (props: IconProps) => ReactNode> = {
  "↵": EnterIcon,
  enter: EnterIcon,
  return: EnterIcon,
  "⌘": CmdIcon,
  cmd: CmdIcon,
  command: CmdIcon,
  meta: CmdIcon,
  "⎋": EscIcon,
  "⇧": ShiftIcon,
  shift: ShiftIcon,
  "⌥": OptionIcon,
  option: OptionIcon,
  alt: AltIcon,
  "⌃": ControlIcon,
  " ": SpacebarIcon,
  space: SpacebarIcon,
  spacebar: SpacebarIcon,
  "↑": ArrowUpIcon,
  "↓": ArrowDownIcon,
  "→": ArrowRightIcon,
};

function lookupKeyIcon(value: string) {
  return KEY_ICONS[value] ?? KEY_ICONS[value.trim().toLowerCase()];
}

export function resolveKbdTokens(value: ReactNode): ReactNode[] {
  if (typeof value !== "string") return [value];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (lookupKeyIcon(trimmed)) return [trimmed];
  if (/^[a-zA-Z0-9]$/.test(trimmed)) return [trimmed];
  if (/^[\p{L}\p{N}]+$/u.test(trimmed)) return [trimmed];
  return Array.from(trimmed);
}

function KbdGlyph({ value }: { value: string }) {
  const Glyph = lookupKeyIcon(value);
  if (Glyph) {
    return <Glyph size={KBD_GLYPH_SIZE} className="size-3" aria-hidden />;
  }
  return value;
}

function Kbd({ className, children, ...props }: ComponentProps<"kbd">) {
  const text = typeof children === "string" ? children.trim() : null;
  const icon = text != null ? lookupKeyIcon(text) : undefined;
  const wide = text != null && icon == null && text.length > 1;

  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 items-center justify-center rounded-md bg-neutral-0 font-sans text-xs font-medium leading-none text-fg-secondary shadow-sm tabular-nums [&_svg]:size-3 [&_svg]:shrink-0 [&_svg]:text-current",
        wide ? "min-w-5 px-1.5" : "w-5",
        className
      )}
      {...props}
    >
      {text != null ? <KbdGlyph value={text} /> : children}
    </kbd>
  );
}

export { Kbd };
