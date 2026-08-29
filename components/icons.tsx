"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type IconProps = {
  className?: string;
  size?: number | string;
  fill?: "outlined" | "filled";
  radius?: "0" | "1" | "2";
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
  "data-slot"?: string;
};

function Svg({
  className,
  size = 16,
  filled = false,
  children,
  ...props
}: IconProps & { children: ReactNode; filled?: boolean }) {
  const dim = typeof size === "number" ? size : undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      width={dim ?? size}
      height={dim ?? size}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={filled ? undefined : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-slot={props["data-slot"] ?? "icon"}
      aria-hidden={props["aria-label"] ? undefined : (props["aria-hidden"] ?? true)}
      aria-label={props["aria-label"]}
      className={cn("shrink-0", className)}
    >
      {children}
    </svg>
  );
}

function icon(name: string, children: ReactNode, filled = false) {
  function IconComponent(props: IconProps) {
    return (
      <Svg {...props} filled={props.fill === "filled" || filled}>
        {children}
      </Svg>
    );
  }
  IconComponent.displayName = name;
  return IconComponent;
}

export const PlusIcon = icon("PlusIcon", <path d="M12 5v14M5 12h14" />);
export const LoaderIcon = icon(
  "LoaderIcon",
  <path d="M12 3a9 9 0 1 1-6.36 2.64" />
);
export const SettingsIcon = icon(
  "SettingsIcon",
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2.2M12 18.3v2.2M4.8 6.5l1.6 1.6M17.6 15.9l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.8 17.5l1.6-1.6M17.6 8.1l1.6-1.6" />
  </>
);
export const TrashIcon = icon(
  "TrashIcon",
  <path d="M4 7h16M9 7V5h6v2M8 7l.8 12h6.4L16 7" />
);
export const CloseIcon = icon("CloseIcon", <path d="M18 6 6 18M6 6l12 12" />);
export const MenuIcon = icon("MenuIcon", <path d="M4 7h16M4 12h16M4 17h16" />);
export const CircleCheckIcon = icon(
  "CircleCheckIcon",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 2.5 2.5L16 9" />
  </>
);
export const CircleInfoIcon = icon(
  "CircleInfoIcon",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 8h.01" />
  </>
);
export const TriangleAlertIcon = icon(
  "TriangleAlertIcon",
  <>
    <path d="m12 4 9 16H3z" />
    <path d="M12 10v5M12 17.5h.01" />
  </>
);
export const CircleXIcon = icon(
  "CircleXIcon",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </>
);
export const ChevronDownIcon = icon("ChevronDownIcon", <path d="m6 9 6 6 6-6" />);
export const ChevronUpIcon = icon("ChevronUpIcon", <path d="m6 15 6-6 6 6" />);
export const ChevronLeftIcon = icon("ChevronLeftIcon", <path d="m15 6-6 6 6 6" />);
export const ChevronRightIcon = icon(
  "ChevronRightIcon",
  <path d="m9 6 6 6-6 6" />
);
export const ArrowUpIcon = icon("ArrowUpIcon", <path d="M12 19V5M6 11l6-6 6 6" />);
export const ArrowDownIcon = icon(
  "ArrowDownIcon",
  <path d="M12 5v14M6 13l6 6 6-6" />
);
export const ArrowRightIcon = icon(
  "ArrowRightIcon",
  <path d="M5 12h14M13 6l6 6-6 6" />
);
export const ChevronsUpDownIcon = icon(
  "ChevronsUpDownIcon",
  <path d="m7 9 5-5 5 5M7 15l5 5 5-5" />
);
export const SearchIcon = icon(
  "SearchIcon",
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </>
);
export const FilterIcon = icon(
  "FilterIcon",
  <path d="M4 6h16l-6 7v6l-4-2v-4z" />
);
export const SunIcon = icon(
  "SunIcon",
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
  </>
);
export const MoonIcon = icon(
  "MoonIcon",
  <path d="M16 3a8 8 0 1 0 5 13 7 7 0 0 1-5-13z" />
);
export const MonitorIcon = icon(
  "MonitorIcon",
  <>
    <rect x="3" y="4" width="18" height="13" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </>
);
export const GlobeIcon = icon(
  "GlobeIcon",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </>
);
export const FlagIcon = icon(
  "FlagIcon",
  <path d="M5 21V4h10l-1.5 4L19 12H5" />
);
export const ChipIcon = icon(
  "ChipIcon",
  <>
    <rect x="7" y="7" width="10" height="10" rx="1.5" />
    <path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4" />
  </>
);
export const BrowserIcon = icon(
  "BrowserIcon",
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 10h18M7 7.5h.01M9.5 7.5h.01" />
  </>
);
export const MoreHorizontalIcon = icon(
  "MoreHorizontalIcon",
  <>
    <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </>
);
export function MoreVerticalIcon({ className, ...props }: IconProps) {
  return <MoreHorizontalIcon className={cn("rotate-90", className)} {...props} />;
}
MoreVerticalIcon.displayName = "MoreVerticalIcon";

export const CheckIcon = icon("CheckIcon", <path d="m5 12 5 5L20 7" />);
export const Checkmark2MediumIcon = icon(
  "Checkmark2MediumIcon",
  <path d="m5 12 5 5L20 7" />
);
export const CalendarIcon = icon(
  "CalendarIcon",
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </>
);
export const CopyIcon = icon(
  "CopyIcon",
  <>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </>
);
export const ArrowCornerDownLeftIcon = icon(
  "ArrowCornerDownLeftIcon",
  <path d="M20 5v6a4 4 0 0 1-4 4H5M9 11l-4 4 4 4" />
);
export const HistoryIcon = icon(
  "HistoryIcon",
  <>
    <path d="M4 12a8 8 0 1 0 2.3-5.6" />
    <path d="M4 5v4h4M12 8v5l3 2" />
  </>
);
export const BellIcon = icon(
  "BellIcon",
  <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5zM10 20a2 2 0 0 0 4 0" />
);
export const SparkleIcon = icon(
  "SparkleIcon",
  <path d="M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z" />
);
export function SparkleCentralIcon(props: IconProps) {
  return <SparkleIcon {...props} />;
}
SparkleCentralIcon.displayName = "SparkleCentralIcon";

export const BoldIcon = icon(
  "BoldIcon",
  <path d="M7 5h7a3.5 3.5 0 0 1 0 7H7zM7 12h8a3.5 3.5 0 0 1 0 7H7z" />
);
export const ItalicIcon = icon("ItalicIcon", <path d="M15 5H9M13 19H7M14 5 10 19" />);
export const UnderlineIcon = icon(
  "UnderlineIcon",
  <path d="M7 5v7a5 5 0 0 0 10 0V5M6 20h12" />
);
export const EnterIcon = icon(
  "EnterIcon",
  <path d="M19 6v6a3 3 0 0 1-3 3H6M10 11 6 15l4 4" />
);
export const CmdIcon = icon(
  "CmdIcon",
  <path d="M9 9V7a2 2 0 1 0-2 2h2zm0 0h6M9 9v6m6-6V7a2 2 0 1 1 2 2h-2zm0 0v6m0 0h2a2 2 0 1 1-2 2v-2zm0 0H9m0 0v2a2 2 0 1 1-2-2h2z" />
);
export const EscIcon = icon(
  "EscIcon",
  <>
    <rect x="4" y="6" width="16" height="12" rx="2" />
    <path d="m9 10 6 4M15 10l-6 4" />
  </>
);
export const ShiftIcon = icon(
  "ShiftIcon",
  <path d="m12 5 7 8h-4v6H9v-6H5z" />
);
export const OptionIcon = icon("OptionIcon", <path d="M4 8h5l6 8h5M15 8h5" />);
export const AltIcon = icon(
  "AltIcon",
  <path d="M5 16h4l3-8 3 8h4" />
);
export const ControlIcon = icon(
  "ControlIcon",
  <path d="m8 14 4-4 4 4" />
);
export const SpacebarIcon = icon(
  "SpacebarIcon",
  <path d="M5 14v2h14v-2" />
);
export const PlayIcon = icon(
  "PlayIcon",
  <path d="M8 6.5v11l10-5.5-10-5.5z" />
);
export const PauseIcon = icon(
  "PauseIcon",
  <>
    <path d="M8 6h3v12H8z" />
    <path d="M13 6h3v12h-3z" />
  </>
);

export { CloseIcon as XIcon };

export const productIcons = [
  { exportName: "PlusIcon", Icon: PlusIcon },
  { exportName: "LoaderIcon", Icon: LoaderIcon },
  { exportName: "SettingsIcon", Icon: SettingsIcon },
  { exportName: "TrashIcon", Icon: TrashIcon },
  { exportName: "CloseIcon", Icon: CloseIcon },
  { exportName: "MenuIcon", Icon: MenuIcon },
  { exportName: "CircleCheckIcon", Icon: CircleCheckIcon },
  { exportName: "CircleInfoIcon", Icon: CircleInfoIcon },
  { exportName: "TriangleAlertIcon", Icon: TriangleAlertIcon },
  { exportName: "CircleXIcon", Icon: CircleXIcon },
  { exportName: "ChevronDownIcon", Icon: ChevronDownIcon },
  { exportName: "ChevronUpIcon", Icon: ChevronUpIcon },
  { exportName: "ChevronLeftIcon", Icon: ChevronLeftIcon },
  { exportName: "ChevronRightIcon", Icon: ChevronRightIcon },
  { exportName: "ArrowUpIcon", Icon: ArrowUpIcon },
  { exportName: "ArrowDownIcon", Icon: ArrowDownIcon },
  { exportName: "ArrowRightIcon", Icon: ArrowRightIcon },
  { exportName: "ChevronsUpDownIcon", Icon: ChevronsUpDownIcon },
  { exportName: "SearchIcon", Icon: SearchIcon },
  { exportName: "FilterIcon", Icon: FilterIcon },
  { exportName: "SunIcon", Icon: SunIcon },
  { exportName: "MoonIcon", Icon: MoonIcon },
  { exportName: "MonitorIcon", Icon: MonitorIcon },
  { exportName: "GlobeIcon", Icon: GlobeIcon },
  { exportName: "FlagIcon", Icon: FlagIcon },
  { exportName: "ChipIcon", Icon: ChipIcon },
  { exportName: "BrowserIcon", Icon: BrowserIcon },
  { exportName: "MoreHorizontalIcon", Icon: MoreHorizontalIcon },
  { exportName: "MoreVerticalIcon", Icon: MoreVerticalIcon },
  { exportName: "CheckIcon", Icon: CheckIcon },
  { exportName: "Checkmark2MediumIcon", Icon: Checkmark2MediumIcon },
  { exportName: "CalendarIcon", Icon: CalendarIcon },
  { exportName: "CopyIcon", Icon: CopyIcon },
  { exportName: "ArrowCornerDownLeftIcon", Icon: ArrowCornerDownLeftIcon },
  { exportName: "HistoryIcon", Icon: HistoryIcon },
  { exportName: "BellIcon", Icon: BellIcon },
  { exportName: "SparkleIcon", Icon: SparkleIcon },
  { exportName: "BoldIcon", Icon: BoldIcon },
  { exportName: "ItalicIcon", Icon: ItalicIcon },
  { exportName: "UnderlineIcon", Icon: UnderlineIcon },
  { exportName: "EnterIcon", Icon: EnterIcon },
  { exportName: "CmdIcon", Icon: CmdIcon },
  { exportName: "EscIcon", Icon: EscIcon },
  { exportName: "ShiftIcon", Icon: ShiftIcon },
  { exportName: "OptionIcon", Icon: OptionIcon },
  { exportName: "AltIcon", Icon: AltIcon },
  { exportName: "ControlIcon", Icon: ControlIcon },
  { exportName: "SpacebarIcon", Icon: SpacebarIcon },
  { exportName: "PlayIcon", Icon: PlayIcon },
  { exportName: "PauseIcon", Icon: PauseIcon },
] as const;

export type IconName = (typeof productIcons)[number]["exportName"];
