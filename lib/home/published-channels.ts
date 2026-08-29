"use client";

import { useSyncExternalStore } from "react";
import type { PublishedChannelUrl } from "@/components/harness/publish-channels-dialog";

export type PublishedByVideo = Record<string, PublishedChannelUrl[]>;

const EMPTY: PublishedByVideo = {};

let state: PublishedByVideo = EMPTY;
const listeners = new Set<() => void>();

function emit(next: PublishedByVideo) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function publishRowAliases(video?: { src?: string; title?: string } | null): string[] {
  if (!video) return [];
  const aliases = new Set<string>();
  const src = video.src?.trim();
  const title = video.title?.trim();
  if (src) aliases.add(src);
  if (title) aliases.add(title);
  if (src) {
    const base = src.split("/").pop()?.replace(/\.[^.]+$/, "");
    if (base) aliases.add(base);
  }
  return [...aliases];
}

export function setPublishedUrlsForVideo(
  key: string,
  urls: PublishedChannelUrl[],
  aliases: string[] = [],
) {
  const next: PublishedByVideo = { ...state, [key]: urls };
  for (const alias of aliases) {
    if (alias && alias !== key) next[alias] = urls;
  }
  emit(next);
}

export function usePublishedChannels(): PublishedByVideo {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}
