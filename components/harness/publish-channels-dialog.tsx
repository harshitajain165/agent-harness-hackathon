"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { VideoArtifact } from "@/lib/agent/types";

export type PublishChannelId = "x" | "linkedin" | "youtube" | "instagram" | "tiktok";

export type PublishedChannelUrl = {
  channel: PublishChannelId;
  url: string;
};

const CHANNELS: {
  id: PublishChannelId;
  label: string;
  icon: string;
  placeholder: string;
}[] = [
  { id: "x", label: "X", icon: "/home/channels/x.png", placeholder: "https://x.com/…" },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: "/home/channels/linkedin.png",
    placeholder: "https://www.linkedin.com/posts/…",
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: "/home/channels/youtube.svg",
    placeholder: "https://www.youtube.com/watch?v=…",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: "/home/channels/instagram.png",
    placeholder: "https://www.instagram.com/p/…",
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: "/home/channels/tiktok.png",
    placeholder: "https://www.tiktok.com/@…",
  },
];

const DEFAULT_CHANNEL_IDS: PublishChannelId[] = ["x", "linkedin"];

type Row = { channel: PublishChannelId; url: string };

export function publishVideoKey(video?: Pick<VideoArtifact, "src" | "title"> | null) {
  if (!video) return "video";
  return video.src?.trim() || video.title;
}

function rowsFromSaved(saved?: PublishedChannelUrl[]): Row[] {
  if (!saved || saved.length === 0) {
    return DEFAULT_CHANNEL_IDS.map((channel) => ({ channel, url: "" }));
  }
  return saved.map((row) => ({ channel: row.channel, url: row.url }));
}

function channelMeta(id: PublishChannelId) {
  return CHANNELS.find((item) => item.id === id) ?? CHANNELS[0];
}

export function PublishChannelsDialog({
  open,
  onOpenChange,
  video,
  savedUrls,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video?: Pick<VideoArtifact, "src" | "title"> | null;
  savedUrls?: PublishedChannelUrl[];
  onSave: (urls: PublishedChannelUrl[]) => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => rowsFromSaved(savedUrls));
  const nextChannel = CHANNELS.find((item) => !rows.some((row) => row.channel === item.id));

  useEffect(() => {
    if (!open) return;
    setRows(rowsFromSaved(savedUrls));
  }, [open, savedUrls, video?.src, video?.title]);

  const updateUrl = (channel: PublishChannelId, url: string) => {
    setRows((current) => current.map((row) => (row.channel === channel ? { ...row, url } : row)));
  };

  const addChannel = () => {
    if (!nextChannel) return;
    setRows((current) => [...current, { channel: nextChannel.id, url: "" }]);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(rows);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={submit}>
          <DialogBody>
            <DialogHeader>
              <DialogTitle>Publish to channels</DialogTitle>
              <DialogDescription>
                Paste the live post URLs after publishing so we can track them.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 flex flex-col gap-4">
              {rows.map((row) => {
                const meta = channelMeta(row.channel);
                const inputId = `publish-url-${row.channel}`;
                return (
                  <Field key={row.channel} className="w-full">
                    <FieldLabel htmlFor={inputId}>
                      <img
                        src={meta.icon}
                        alt=""
                        width={16}
                        height={16}
                        className="size-4 shrink-0 rounded-[3px] object-cover"
                      />
                      {meta.label}
                    </FieldLabel>
                    <Input
                      id={inputId}
                      value={row.url}
                      onChange={(event) => updateUrl(row.channel, event.target.value)}
                      placeholder={meta.placeholder}
                      inputMode="url"
                      autoComplete="url"
                      spellCheck={false}
                    />
                  </Field>
                );
              })}
              {nextChannel ? (
                <Button type="button" variant="tertiary" size="sm" className="self-start" onClick={addChannel}>
                  <PlusIcon className="size-4" />
                  Add another channel
                </Button>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="secondary" />}>Cancel</DialogClose>
            <Button type="submit" variant="primary">
              Track posts
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
