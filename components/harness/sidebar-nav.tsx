"use client";

import { useEffect, useRef, useState } from "react";
import { GlobeIcon, HomeIcon, PlayIcon, PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
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

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function useModKey() {
  const [modKey, setModKey] = useState("⌘");
  useEffect(() => {
    const apple =
      /Mac|iPhone|iPad|iPod/.test(navigator.platform) ||
      /Mac OS X/.test(navigator.userAgent);
    setModKey(apple ? "⌘" : "⌃");
  }, []);
  return modKey;
}

export function SidebarNav({
  chats,
  activeId,
  activeTab = null,
  onTab,
  onNewChat,
  onPick,
}: {
  chats: SidebarChat[];
  activeId: string;
  activeTab?: SidebarTab | null;
  onTab?: (tab: SidebarTab) => void;
  onNewChat: () => void;
  onPick: (id: string) => void;
}) {
  const onNewChatRef = useRef(onNewChat);
  onNewChatRef.current = onNewChat;
  const modKey = useModKey();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "KeyN" || !(event.metaKey || event.ctrlKey)) return;
      if (event.altKey || event.shiftKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      onNewChatRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <aside className="hidden h-full w-[240px] shrink-0 flex-col py-2 pl-2 lg:flex">
      <div className="flex items-center px-2 py-2">
        <Text size="2xl" weight="medium" className="min-w-0 leading-none">
          Nolan
          <span
            aria-hidden
            className="ml-px inline-block align-super text-lg leading-none"
          >
            ™
          </span>
        </Text>
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
                  ? "bg-neutral-0 text-fg"
                  : "text-fg-tertiary hover:bg-neutral-0 hover:text-fg"
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
        <Button
          variant="transparent"
          size="sm"
          className="w-full justify-start bg-transparent text-fg-tertiary shadow-none hover:bg-neutral-0 hover:text-fg data-pressed:bg-neutral-0"
          aria-keyshortcuts="Meta+N Control+N"
          onClick={onNewChat}
        >
          <PlusIcon className="size-4" />
          New chat
          <span className="ml-auto inline-flex items-center gap-0.5" aria-hidden>
            <Kbd>{modKey}</Kbd>
            <Kbd>N</Kbd>
          </span>
        </Button>
      </div>

      <div aria-hidden className="mx-1 mt-3 mb-2 h-px bg-neutral-150" />

      <ScrollArea className="min-h-0 flex-1 px-1" scrollFade>
        <Text size="sm" color="tertiary" className="px-2 py-1">
          Recents
        </Text>
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
                    : "text-fg-secondary hover:bg-neutral-100 hover:text-fg"
                )}
              >
                {title}
              </button>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
