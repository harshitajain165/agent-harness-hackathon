"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Text } from "@/components/ui/text";
import type { ImagePostArtifact } from "@/lib/agent/types";
import { cn } from "@/lib/utils";

/** Renders a single image, or a carousel with prev/next + dot navigation — one slide visible
 *  at a time, mirroring how real social platforms actually present a carousel post. Captions
 *  render as plain text under the image, not burned into it (create-image-post.ts doesn't
 *  overlay text onto the pixels — this ffmpeg build has no drawtext/font support, and it's
 *  also just how real posts work: caption is separate from image content). */
export function ImagePostViewer({ artifact }: { artifact: ImagePostArtifact }) {
  const [index, setIndex] = useState(0);
  const images = artifact.images;
  const current = images[index];
  const isCarousel = artifact.format === "carousel" && images.length > 1;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative mx-3 mt-3 aspect-square overflow-hidden rounded-[10px] bg-neutral-950">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element -- locally generated screenshot, not a Next-optimizable remote asset
          <img src={current.src} alt={current.caption ?? artifact.title} className="h-full w-full object-cover" />
        ) : null}

        {isCarousel ? (
          <>
            <IconButton
              aria-label="Previous slide"
              variant="secondary"
              size="sm"
              className="absolute left-2 top-1/2 -translate-y-1/2"
              disabled={index === 0}
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
            >
              <ChevronLeftIcon className="size-4" />
            </IconButton>
            <IconButton
              aria-label="Next slide"
              variant="secondary"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              disabled={index === images.length - 1}
              onClick={() => setIndex((value) => Math.min(images.length - 1, value + 1))}
            >
              <ChevronRightIcon className="size-4" />
            </IconButton>
            <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
              {images.map((image, i) => (
                <button
                  key={image.src}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index ? "w-4 bg-on-inverted" : "w-1.5 bg-on-inverted/40"
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-3 px-3 py-2.5">
        <Text size="sm" color="secondary" className="min-w-0 flex-1">
          {current?.caption}
        </Text>
        {isCarousel ? (
          <Text size="sm" color="tertiary" className="shrink-0 tabular-nums">
            {index + 1}/{images.length}
          </Text>
        ) : null}
      </div>
    </div>
  );
}
