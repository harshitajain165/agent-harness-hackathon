"use client";

import { BrandMark } from "@/components/brand-mark";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HistoryIcon,
  GlobeIcon,
  HomeIcon,
  PlayIcon,
  PlusIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export type SidebarChat = {
  id: string;
  title: string | null;
};

export type SidebarTab = "home" | "publishes" | "channels";

const TABS: { id: SidebarTab; label: string; icon: typeof HomeIcon }[] = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "publishes", label: "Publishes", icon: PlayIcon },
  { id: "channels", label: "Channels", icon: GlobeIcon },
];

export function SidebarNav({
  chats,
  activeId,
  activeTab = null,
  onTab,
  onNewChat,
  onPick,
  collapsed,
  onToggle,
}: {
  chats: SidebarChat[];
  activeId: string;
  activeTab?: SidebarTab | null;
  onTab?: (tab: SidebarTab) => void;
  onNewChat: () => void;
  onPick: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col py-2 pl-2 lg:flex",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      <div className="flex items-center gap-2 px-2 py-1.5">
        <BrandMark size={18} />
        {!collapsed ? (
          <Text size="sm" weight="medium" className="min-w-0 flex-1 truncate">
            Agent
          </Text>
        ) : null}
        <IconButton
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          variant="transparent"
          size="sm"
          onClick={onToggle}
        >
          {collapsed ? (
            <ChevronRightIcon className="size-4" />
          ) : (
            <ChevronLeftIcon className="size-4" />
          )}
        </IconButton>
      </div>

      <div className="mt-2 flex flex-col gap-1 px-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={active ? "page" : undefined}
              title={tab.label}
              onClick={() => onTab?.(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-[10px] px-2 py-2 text-left text-sm transition-colors duration-150",
                active
                  ? "bg-neutral-100 text-fg"
                  : "text-fg-secondary hover:bg-neutral-100 hover:text-fg",
                collapsed && "justify-center px-0"
              )}
            >
              <Icon className="size-4" />
              {!collapsed ? tab.label : null}
            </button>
          );
        })}
        <Button
          variant="secondary"
          size="sm"
          className={cn("justify-start", collapsed && "px-0")}
          onClick={onNewChat}
        >
          <PlusIcon className="size-4" />
          {!collapsed ? "New chat" : null}
        </Button>
      </div>

      <div aria-hidden className="mx-1 mt-3 mb-2 h-px bg-neutral-150" />

      <ScrollArea className="min-h-0 flex-1 px-1" scrollFade>
        {!collapsed ? (
          <Text size="sm" color="tertiary" className="px-2 py-1">
            Recents
          </Text>
        ) : (
          <div className="flex justify-center py-1">
            <HistoryIcon className="size-4 text-fg-tertiary" />
          </div>
        )}
        <nav className="flex flex-col gap-0.5">
          {chats.map((chat) => {
            const title = chat.title ?? "New chat";
            const active = chat.id === activeId;
            return (
              <button
                key={chat.id}
                type="button"
                title={title}
                onClick={() => onPick(chat.id)}
                className={cn(
                  "truncate rounded-[10px] px-2 py-2 text-left text-sm transition-colors duration-150",
                  active
                    ? "bg-neutral-100 text-fg"
                    : "text-fg-secondary hover:bg-neutral-100 hover:text-fg",
                  collapsed && "px-0 text-center"
                )}
              >
                {collapsed ? title.slice(0, 1).toUpperCase() : title}
              </button>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
