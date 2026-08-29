"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChartIcon,
  BookmarkIcon,
  ChatBubbleIcon,
  CheckCircleIcon,
  CloseIcon,
  GlobeIcon,
  HeartIcon,
  MoreHorizontalIcon,
  PlayIcon,
  PlusIcon,
  RepeatIcon,
  SendIcon,
  ShareIcon,
  SparkleIcon,
  ThumbsUpIcon,
} from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text } from "@/components/ui/text";
import type { VideoArtifact } from "@/lib/agent/types";
import { cn } from "@/lib/utils";

export type ChannelId = "x" | "linkedin";

type Author = {
  name: string;
  handle: string;
  headline: string;
  avatar?: string;
  verified: boolean;
};

const NOLAN_LINE = "Spend your time building what's next, not fixing what's broken.";

function clock(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function seed(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function metric(input: string, min: number, max: number) {
  return min + (seed(input) % (max - min + 1));
}

function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return String(value);
}

function haystack(artifact: VideoArtifact, prompt?: string) {
  return `${artifact.title} ${artifact.src ?? ""} ${prompt ?? ""}`.toLowerCase();
}

function resolveAuthor(artifact: VideoArtifact, prompt?: string): Author {
  const hay = haystack(artifact, prompt);
  if (/\binterfere\b/.test(hay)) {
    return {
      name: "Interfere",
      handle: "interfere_",
      headline: "Autonomous production engineering",
      avatar: "/recommended/interfere-logo.jpg",
      verified: true,
    };
  }
  if (/\blinear\b/.test(hay)) {
    return {
      name: "Linear",
      handle: "linear",
      headline: "The issue tracking tool you'll enjoy using",
      avatar: "/recommended/linear-logo.svg",
      verified: true,
    };
  }
  return {
    name: "Nolan",
    handle: "nolan",
    headline: "AI product-marketing agent",
    verified: false,
  };
}

function firstUsefulLine(prompt?: string) {
  if (!prompt) return null;
  for (const raw of prompt.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^create (a |an )/i.test(line)) continue;
    if (/^(release|audience|tone|voiceover|show|length|the problem we interrupt)\b/i.test(line)) {
      continue;
    }
    if (line.includes("[") && line.includes("]")) continue;
    if (line.length < 8) continue;
    return line;
  }
  return null;
}

function resolveCopy(artifact: VideoArtifact, prompt?: string, author?: Author) {
  if (author?.name === "Interfere") {
    return [
      "Introducing Interfere.",
      "",
      "Interfere observes everything that happens in production, investigates what's broken and fixes problems before your users notice them.",
      "",
      "Spend your time building what's next, not fixing what's broken.",
      "",
      "Get early access today.",
    ].join("\n");
  }
  if (author?.name === "Linear") {
    return "Issue tracking that stays out of the way — so you can ship.";
  }
  const fromPrompt = firstUsefulLine(prompt);
  if (fromPrompt) return fromPrompt;
  const title = artifact.title.trim();
  if (title && !/^demo\b/i.test(title) && title !== "Product walkthrough") return title;
  return NOLAN_LINE;
}

function PreviewPlayer({
  artifact,
  radiusClass,
  active,
}: {
  artifact: VideoArtifact;
  radiusClass: string;
  active: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [label, setLabel] = useState(clock(artifact.durationMs));

  useEffect(() => {
    if (active) return;
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setPlaying(false);
  }, [active]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video || !artifact.src) return;
    if (video.paused) {
      void video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <button
      type="button"
      aria-label={playing ? "Pause video" : "Play video"}
      onClick={toggle}
      className={cn(
        "relative block w-full overflow-hidden bg-neutral-950 text-left outline-none",
        "focus-visible:ring-2 focus-visible:ring-brand-border-focus",
        radiusClass
      )}
    >
      {artifact.src ? (
        <video
          ref={videoRef}
          src={artifact.src}
          playsInline
          preload="metadata"
          className="aspect-video h-auto w-full object-contain"
          onTimeUpdate={(event) => {
            const remaining = (event.currentTarget.duration - event.currentTarget.currentTime) * 1000;
            if (Number.isFinite(remaining)) setLabel(clock(remaining));
          }}
          onLoadedMetadata={(event) => {
            const ms = event.currentTarget.duration * 1000;
            if (Number.isFinite(ms)) setLabel(clock(ms));
          }}
          onEnded={() => {
            setPlaying(false);
            setLabel(clock(artifact.durationMs));
          }}
        />
      ) : (
        <div className="flex aspect-video items-center justify-center">
          <Text size="sm" weight="medium" className="text-on-inverted">
            {artifact.title}
          </Text>
        </div>
      )}
      {!playing && artifact.src ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-neutral-950/70 text-on-inverted">
            <PlayIcon className="size-4" />
          </span>
        </span>
      ) : null}
      <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-neutral-950/70 px-2 py-0.5 text-sm font-medium tabular-nums text-on-inverted">
        {label}
      </span>
    </button>
  );
}

function AuthorAvatar({ author, className }: { author: Author; className?: string }) {
  return (
    <Avatar className={cn("size-10", className)}>
      {author.avatar ? <AvatarImage src={author.avatar} alt="" /> : null}
      <AvatarFallback>{author.name.slice(0, 1)}</AvatarFallback>
    </Avatar>
  );
}

function XPost({
  artifact,
  author,
  copy,
  active,
}: {
  artifact: VideoArtifact;
  author: Author;
  copy: string;
  active: boolean;
}) {
  const key = `${author.handle}:${artifact.title}`;
  return (
    <article className="rounded-[10px] bg-neutral-0 p-4 shadow-sm">
      <div className="flex gap-3">
        <AuthorAvatar author={author} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1">
                <Text as="span" size="sm" weight="medium" className="truncate">
                  {author.name}
                </Text>
                {author.verified ? (
                  <CheckCircleIcon fill="filled" className="size-4 shrink-0 text-amber-400" />
                ) : null}
                <Text as="span" size="sm" color="secondary" className="truncate">
                  @{author.handle} · Just now
                </Text>
              </div>
            </div>
            <MoreHorizontalIcon className="size-4 shrink-0 text-fg-tertiary" />
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-fg">{copy}</p>
          <div className="mt-3">
            <PreviewPlayer artifact={artifact} radiusClass="rounded-[16px]" active={active} />
          </div>
          <div className="mt-3 flex items-center justify-between text-fg-tertiary">
            <span className="inline-flex items-center gap-1.5">
              <ChatBubbleIcon className="size-4" />
              <Text as="span" size="sm" color="tertiary">
                {formatCount(metric(`${key}:reply`, 12, 86))}
              </Text>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <RepeatIcon className="size-4" />
              <Text as="span" size="sm" color="tertiary">
                {formatCount(metric(`${key}:rt`, 24, 180))}
              </Text>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <HeartIcon className="size-4" />
              <Text as="span" size="sm" color="tertiary">
                {formatCount(metric(`${key}:like`, 80, 920))}
              </Text>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BarChartIcon className="size-4" />
              <Text as="span" size="sm" color="tertiary">
                {formatCount(metric(`${key}:views`, 12_000, 880_000))}
              </Text>
            </span>
            <span className="inline-flex items-center gap-3">
              <BookmarkIcon className="size-4" />
              <ShareIcon className="size-4" />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function LinkedInPost({
  artifact,
  author,
  copy,
  active,
}: {
  artifact: VideoArtifact;
  author: Author;
  copy: string;
  active: boolean;
}) {
  const key = `${author.handle}:${artifact.title}`;
  return (
    <article className="overflow-hidden rounded-[10px] bg-neutral-0 shadow-sm">
      <div className="flex items-start gap-3 px-4 pt-4">
        <AuthorAvatar author={author} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <Text as="span" size="sm" weight="medium" className="truncate">
              {author.name}
            </Text>
            {author.verified ? (
              <CheckCircleIcon fill="filled" className="size-3.5 shrink-0 text-brand-solid" />
            ) : null}
          </div>
          <Text size="sm" color="secondary" className="truncate">
            {author.headline}
          </Text>
          <span className="mt-0.5 flex items-center gap-1 text-fg-tertiary">
            <Text as="span" size="sm" color="tertiary">
              Just now ·
            </Text>
            <GlobeIcon className="size-3.5" />
          </span>
        </div>
        <Button type="button" variant="link-primary" size="sm" className="shrink-0">
          <PlusIcon className="size-4" />
          Follow
        </Button>
        <MoreHorizontalIcon className="size-4 shrink-0 text-fg-tertiary" />
      </div>
      <p className="mt-3 whitespace-pre-wrap px-4 text-sm leading-relaxed text-fg">{copy}</p>
      <div className="mt-3 bg-neutral-100 px-3 py-3">
        <PreviewPlayer artifact={artifact} radiusClass="rounded-[10px]" active={active} />
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4 text-fg-tertiary">
          <span className="inline-flex items-center gap-1.5">
            <ThumbsUpIcon className="size-4" />
            <Text as="span" size="sm" color="tertiary">
              {formatCount(metric(`${key}:li-like`, 40, 340))}
            </Text>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ChatBubbleIcon className="size-4" />
            <Text as="span" size="sm" color="tertiary">
              {formatCount(metric(`${key}:li-cmt`, 8, 90))}
            </Text>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <RepeatIcon className="size-4" />
            <Text as="span" size="sm" color="tertiary">
              {formatCount(metric(`${key}:li-rt`, 2, 24))}
            </Text>
          </span>
          <SendIcon className="size-4" />
        </div>
        <div className="flex items-center -space-x-1">
          <span className="flex size-5 items-center justify-center rounded-full bg-brand-solid text-on-inverted ring-2 ring-neutral-0">
            <ThumbsUpIcon className="size-2.5" />
          </span>
          <span className="flex size-5 items-center justify-center rounded-full bg-positive-solid text-on-inverted ring-2 ring-neutral-0">
            <SparkleIcon className="size-2.5" />
          </span>
          <span className="flex size-5 items-center justify-center rounded-full bg-danger-solid text-on-inverted ring-2 ring-neutral-0">
            <HeartIcon className="size-2.5" />
          </span>
        </div>
      </div>
    </article>
  );
}

export function ChannelPreviews({
  artifact,
  prompt,
  onClose,
}: {
  artifact: VideoArtifact;
  prompt?: string;
  onClose: () => void;
}) {
  const [channel, setChannel] = useState<ChannelId>("x");
  const author = resolveAuthor(artifact, prompt);
  const copy = resolveCopy(artifact, prompt, author);

  return (
    <Tabs
      value={channel}
      onValueChange={(value) => setChannel(value as ChannelId)}
      className="flex h-full min-h-0 flex-col gap-0"
    >
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border-default px-3">
        <TabsList variant="primary">
          <TabsTrigger value="x">X</TabsTrigger>
          <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
        </TabsList>
        <IconButton aria-label="Close pane" variant="transparent" size="sm" onClick={onClose}>
          <CloseIcon className="size-3.5" />
        </IconButton>
      </div>
      <ScrollArea className="min-h-0 flex-1 bg-neutral-100" scrollFade>
        <div className="grid p-4">
          <div
            className={cn(
              "col-start-1 row-start-1 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none",
              channel === "x" ? "z-10 translate-y-0 opacity-100" : "pointer-events-none z-0 translate-y-1 opacity-0"
            )}
            aria-hidden={channel !== "x"}
          >
            <XPost artifact={artifact} author={author} copy={copy} active={channel === "x"} />
          </div>
          <div
            className={cn(
              "col-start-1 row-start-1 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none",
              channel === "linkedin"
                ? "z-10 translate-y-0 opacity-100"
                : "pointer-events-none z-0 translate-y-1 opacity-0"
            )}
            aria-hidden={channel !== "linkedin"}
          >
            <LinkedInPost artifact={artifact} author={author} copy={copy} active={channel === "linkedin"} />
          </div>
        </div>
      </ScrollArea>
    </Tabs>
  );
}
