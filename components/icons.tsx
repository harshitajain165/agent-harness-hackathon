"use client";

import { useId } from "react";
import { CentralIcon } from "@central-icons-react/all";
import type { CentralIconName } from "@central-icons-react/all/icons";
import { cn } from "@/lib/utils";

const iconDefaults = {
  join: "round",
  fill: "outlined",
  radius: "2",
  stroke: "2",
} as const;

export type { CentralIconName };

export type IconProps = {
  className?: string;
  size?: number | string;
  fill?: "outlined" | "filled";
  radius?: "0" | "1" | "2";
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
  "data-slot"?: string;
};

export function Icon({
  name,
  className,
  size = 16,
  ...props
}: IconProps & { name: CentralIconName }) {
  const maskId = useId().replace(/:/g, "");
  return (
    <CentralIcon
      {...iconDefaults}
      mode="raw"
      maskId={maskId}
      name={name}
      size={size}
      data-slot="icon"
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

export function PlusIcon(props: IconProps) {
  return <Icon name="IconPlusSmall" {...props} />;
}

export function MinusIcon(props: IconProps) {
  return <Icon name="IconMinusSmall" {...props} />;
}

export function LoaderIcon(props: IconProps) {
  return <Icon name="IconLoader" {...props} />;
}

export function SettingsIcon(props: IconProps) {
  return <Icon name="IconSettingsGear2" {...props} />;
}

export function TrashIcon(props: IconProps) {
  return <Icon name="IconTrashCan" {...props} />;
}

export function CloseIcon(props: IconProps) {
  return <Icon name="IconCrossSmall" {...props} />;
}

export function MenuIcon(props: IconProps) {
  return <Icon name="IconBarsThree" {...props} />;
}

export function CircleCheckIcon(props: IconProps) {
  return <Icon name="IconCircleCheck" {...props} />;
}

export function CirclePlaceholderOnIcon(props: IconProps) {
  return <Icon name="IconCirclePlaceholderOn" {...props} />;
}

export function CheckCircleIcon(props: IconProps) {
  return <Icon name="IconCheckCircle2" {...props} />;
}

export function CircleInfoIcon(props: IconProps) {
  return <Icon name="IconCircleInfo" {...props} />;
}

export function TriangleAlertIcon(props: IconProps) {
  return <Icon name="IconExclamationTriangle" {...props} />;
}

export function CircleXIcon(props: IconProps) {
  return <Icon name="IconCircleX" {...props} />;
}

export function ChevronDownIcon(props: IconProps) {
  return <Icon name="IconChevronDownSmall" {...props} />;
}

export function ChevronUpIcon(props: IconProps) {
  return <Icon name="IconChevronTopSmall" {...props} />;
}

export function ChevronLeftIcon(props: IconProps) {
  return <Icon name="IconChevronLeftSmall" {...props} />;
}

export function ChevronRightIcon(props: IconProps) {
  return <Icon name="IconChevronRightSmall" {...props} />;
}

export function ArrowUpIcon(props: IconProps) {
  return <Icon name="IconArrowUp" {...props} />;
}

export function ArrowDownIcon(props: IconProps) {
  return <Icon name="IconArrowDown" {...props} />;
}

export function ArrowRightIcon(props: IconProps) {
  return <Icon name="IconArrowRight" {...props} />;
}

export function ChevronsUpDownIcon(props: IconProps) {
  return <Icon name="IconChevronGrabberVertical" {...props} />;
}

export function SearchIcon(props: IconProps) {
  return <Icon name="IconMagnifyingGlass" {...props} />;
}

export function FilterIcon(props: IconProps) {
  return <Icon name="IconFilter2" {...props} />;
}

export function CircleIcon(props: IconProps) {
  return <Icon name="IconCircle" {...props} />;
}

export function SunIcon(props: IconProps) {
  return <Icon name="IconSun" {...props} />;
}

export function MoonIcon(props: IconProps) {
  return <Icon name="IconMoon" {...props} />;
}

export function MonitorIcon(props: IconProps) {
  return <Icon name="IconStudioDisplay" {...props} />;
}

export function GlobeIcon(props: IconProps) {
  return <Icon name="IconGlobe" {...props} />;
}

export function FlagIcon(props: IconProps) {
  return <Icon name="IconFlag2" {...props} />;
}

export function ChipIcon(props: IconProps) {
  return <Icon name="IconProcessor" {...props} />;
}

export function BrowserIcon(props: IconProps) {
  return <Icon name="IconCompassRound" {...props} />;
}

export function MoreHorizontalIcon(props: IconProps) {
  return <Icon name="IconDotGrid1x3Horizontal" {...props} />;
}

export function GrabberIcon(props: IconProps) {
  return <Icon name="IconDotGrid2x3" {...props} />;
}

export function MoreVerticalIcon({ className, ...props }: IconProps) {
  return <MoreHorizontalIcon className={cn("rotate-90", className)} {...props} />;
}

export function CheckIcon(props: IconProps) {
  return <Icon name="IconCheckmark1Small" {...props} />;
}

export function Checkmark2MediumIcon(props: IconProps) {
  return <Icon name="IconCheckmark2Medium" {...props} />;
}

export function CalendarIcon(props: IconProps) {
  return <Icon name="IconCalendar1" {...props} />;
}

export function CopyIcon(props: IconProps) {
  return <Icon name="IconSquareBehindSquare2" {...props} />;
}

export function ArrowCornerDownLeftIcon(props: IconProps) {
  return <Icon name="IconArrowCornerDownLeft" {...props} />;
}

export function HistoryIcon(props: IconProps) {
  return <Icon name="IconHistory" {...props} />;
}

export function BellIcon(props: IconProps) {
  return <Icon name="IconBell2" {...props} />;
}

export function SparkleCentralIcon(props: IconProps) {
  return <Icon name="IconSparkleCentral" {...props} />;
}

export function SparkleIcon(props: IconProps) {
  return <SparkleCentralIcon {...props} />;
}

export function BoldIcon(props: IconProps) {
  return <Icon name="IconBold" {...props} />;
}

export function ItalicIcon(props: IconProps) {
  return <Icon name="IconItalic" {...props} />;
}

export function UnderlineIcon(props: IconProps) {
  return <Icon name="IconUnderline" {...props} />;
}

export function HomeIcon(props: IconProps) {
  return <Icon name="IconHomeLine" {...props} />;
}

export function PlayIcon(props: IconProps) {
  return <Icon name="IconPlay" {...props} />;
}

export function PauseIcon(props: IconProps) {
  return <Icon name="IconPause" {...props} />;
}

export function EnterIcon(props: IconProps) {
  return <Icon name="IconEnter" {...props} />;
}

export function CmdIcon(props: IconProps) {
  return <Icon name="IconCmd" {...props} />;
}

export function EscIcon(props: IconProps) {
  return <Icon name="IconEsc" {...props} />;
}

export function ShiftIcon(props: IconProps) {
  return <Icon name="IconShift" {...props} />;
}

export function OptionIcon(props: IconProps) {
  return <Icon name="IconOptionKey" {...props} />;
}

export function AltIcon(props: IconProps) {
  return <Icon name="IconAlt" {...props} />;
}

export function ControlIcon(props: IconProps) {
  return <Icon name="IconControlKeyLeft" {...props} />;
}

export function SpacebarIcon(props: IconProps) {
  return <Icon name="IconSpacebar" {...props} />;
}

ArrowCornerDownLeftIcon.displayName = "ArrowCornerDownLeftIcon";
ArrowDownIcon.displayName = "ArrowDownIcon";
ArrowRightIcon.displayName = "ArrowRightIcon";
ArrowUpIcon.displayName = "ArrowUpIcon";
AltIcon.displayName = "AltIcon";
BellIcon.displayName = "BellIcon";
BoldIcon.displayName = "BoldIcon";
BrowserIcon.displayName = "BrowserIcon";
CalendarIcon.displayName = "CalendarIcon";
CheckCircleIcon.displayName = "CheckCircleIcon";
CheckIcon.displayName = "CheckIcon";
Checkmark2MediumIcon.displayName = "Checkmark2MediumIcon";
ChevronDownIcon.displayName = "ChevronDownIcon";
ChevronLeftIcon.displayName = "ChevronLeftIcon";
ChevronRightIcon.displayName = "ChevronRightIcon";
ChevronUpIcon.displayName = "ChevronUpIcon";
ChevronsUpDownIcon.displayName = "ChevronsUpDownIcon";
ChipIcon.displayName = "ChipIcon";
CircleCheckIcon.displayName = "CircleCheckIcon";
CircleIcon.displayName = "CircleIcon";
CircleInfoIcon.displayName = "CircleInfoIcon";
CirclePlaceholderOnIcon.displayName = "CirclePlaceholderOnIcon";
CircleXIcon.displayName = "CircleXIcon";
CloseIcon.displayName = "CloseIcon";
CmdIcon.displayName = "CmdIcon";
ControlIcon.displayName = "ControlIcon";
CopyIcon.displayName = "CopyIcon";
EnterIcon.displayName = "EnterIcon";
EscIcon.displayName = "EscIcon";
FilterIcon.displayName = "FilterIcon";
FlagIcon.displayName = "FlagIcon";
GlobeIcon.displayName = "GlobeIcon";
GrabberIcon.displayName = "GrabberIcon";
HistoryIcon.displayName = "HistoryIcon";
HomeIcon.displayName = "HomeIcon";
ItalicIcon.displayName = "ItalicIcon";
LoaderIcon.displayName = "LoaderIcon";
MenuIcon.displayName = "MenuIcon";
MinusIcon.displayName = "MinusIcon";
MonitorIcon.displayName = "MonitorIcon";
MoonIcon.displayName = "MoonIcon";
MoreHorizontalIcon.displayName = "MoreHorizontalIcon";
MoreVerticalIcon.displayName = "MoreVerticalIcon";
OptionIcon.displayName = "OptionIcon";
PauseIcon.displayName = "PauseIcon";
PlayIcon.displayName = "PlayIcon";
PlusIcon.displayName = "PlusIcon";
SearchIcon.displayName = "SearchIcon";
SettingsIcon.displayName = "SettingsIcon";
ShiftIcon.displayName = "ShiftIcon";
SpacebarIcon.displayName = "SpacebarIcon";
SparkleCentralIcon.displayName = "SparkleCentralIcon";
SparkleIcon.displayName = "SparkleIcon";
SunIcon.displayName = "SunIcon";
TrashIcon.displayName = "TrashIcon";
TriangleAlertIcon.displayName = "TriangleAlertIcon";
UnderlineIcon.displayName = "UnderlineIcon";

export { CloseIcon as XIcon };
