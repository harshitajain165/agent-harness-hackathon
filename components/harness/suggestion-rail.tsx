"use client";

import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { SearchIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type Category = "recommended" | "launch" | "educational";

type Card = {
  id: string;
  category: Category[];
  prompt: string;
  title: string;
  description: string;
  brand?: { name: string; logo: string };
  preview:
    | { kind: "upload" }
    | { kind: "image"; src: string }
    | { kind: "video"; src: string; poster: string };
};

const CARDS: Card[] = [
  {
    id: "upload-style",
    category: ["recommended", "educational"],
    prompt: "Create a film from this brief: [paste notes]",
    title: "Upload your own style",
    description: "Upload a .md file that guides the type of animations and designs",
    preview: { kind: "upload" },
  },
  {
    id: "linear-video",
    category: ["recommended", "launch"],
    prompt: [
      "Create a Linear-style product walkthrough video for [product name].",
      "",
      "Release: [release]",
      "Audience: [audience]",
      "Tone: [calm, precise]",
      "Voiceover: [English]",
      "Show: issue triage and the launch of [feature]",
      "Length: [30 seconds]",
    ].join("\n"),
    title: "Linear",
    description: "Add your own prompt, configure voice, language and more",
    brand: { name: "Linear", logo: "/recommended/linear-logo.svg" },
    preview: {
      kind: "video",
      src: "/recommended/linear.mp4",
      poster: "/recommended/linear-thumb.png",
    },
  },
  {
    id: "interfere-video",
    category: ["recommended", "launch"],
    prompt: [
      "Create an Interfere-style launch video for [product name].",
      "",
      "Audience: [audience]",
      "The problem we interrupt: [status quo]",
      "Tone: [bold, kinetic]",
      "Voiceover: [English]",
      "Show: the before and after of [workflow]",
      "Length: [30 seconds]",
    ].join("\n"),
    title: "Interfere",
    description: "Add your own prompt, configure voice, language and more",
    brand: { name: "Interfere", logo: "/recommended/interfere-logo.jpg" },
    preview: {
      kind: "video",
      src: "/recommended/interfere.mp4",
      poster: "/recommended/interfere-thumb.jpg",
    },
  },
];

const FILTERS: { id: Category; label: string }[] = [
  { id: "recommended", label: "Recommended" },
  { id: "launch", label: "Feature Launch" },
  { id: "educational", label: "Educational" },
];

function canPreviewPlay() {
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function CardPreview({
  card,
  videoRef,
}: {
  card: Card;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  if (card.preview.kind === "upload") {
    return (
      <div className="flex h-[145px] w-full items-center justify-center overflow-clip rounded-[25px] bg-neutral-100">
        <Text as="span" size="base" weight="medium" color="tertiary">
          .md
        </Text>
      </div>
    );
  }

  if (card.preview.kind === "video") {
    return (
      <div className="relative h-[145px] w-full overflow-clip rounded-[25px] bg-neutral-0">
        <video
          ref={videoRef}
          src={card.preview.src}
          poster={card.preview.poster}
          muted
          playsInline
          preload="metadata"
          className="pointer-events-none size-full object-cover"
          width={241}
          height={145}
        />
      </div>
    );
  }

  return (
    <div className="relative h-[145px] w-full overflow-clip rounded-[25px] bg-neutral-0">
      <img
        src={card.preview.src}
        alt=""
        width={241}
        height={145}
        className="size-full object-cover"
      />
    </div>
  );
}

function SuggestionCard({
  card,
  onSelect,
}: {
  card: Card;
  onSelect: (prompt: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  function playPreview() {
    if (!canPreviewPlay()) return;
    void videoRef.current?.play()?.catch(() => {});
  }

  function pausePreview() {
    videoRef.current?.pause();
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(card.prompt)}
      onPointerEnter={playPreview}
      onPointerLeave={pausePreview}
      onPointerCancel={pausePreview}
      onBlur={pausePreview}
      className="w-[241px] shrink-0 text-left outline-none focus-visible:rounded-[10px] focus-visible:ring-2 focus-visible:ring-brand-border-focus"
    >
      <CardPreview card={card} videoRef={videoRef} />
      <div className="mt-8 flex flex-col items-start gap-3">
        {card.brand ? (
          <span className="flex items-center gap-2">
            <span className="relative size-6 shrink-0 overflow-clip rounded-[6px]">
              <img
                src={card.brand.logo}
                alt=""
                width={24}
                height={24}
                className="size-full object-cover"
              />
            </span>
            <Text as="span" size="base">
              {card.brand.name}
            </Text>
          </span>
        ) : (
          <Text as="span" size="base">
            {card.title}
          </Text>
        )}
        <Text size="base" color="quaternary" className="leading-6">
          {card.description}
        </Text>
      </div>
    </button>
  );
}

function useRailEdges(category: Category) {
  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const update = () => {
      const { scrollLeft, clientWidth, scrollWidth } = rail;
      setAtStart(scrollLeft <= 1);
      setAtEnd(scrollLeft + clientWidth >= scrollWidth - 1);
    };

    rail.scrollLeft = 0;
    update();

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const canLeft = rail.scrollLeft > 0;
      const canRight = rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 1;
      if ((event.deltaY > 0 && !canRight) || (event.deltaY < 0 && !canLeft)) return;
      event.preventDefault();
      rail.scrollLeft += event.deltaY;
    };

    const observer = new ResizeObserver(update);
    observer.observe(rail);
    rail.addEventListener("scroll", update, { passive: true });
    rail.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      observer.disconnect();
      rail.removeEventListener("scroll", update);
      rail.removeEventListener("wheel", onWheel);
    };
  }, [category]);

  return { railRef, atStart, atEnd };
}

export function SuggestionRail({
  onPrefill,
}: {
  onPrefill: (prompt: string) => void;
}) {
  const [category, setCategory] = useState<Category>("recommended");
  const cards = useMemo(
    () => CARDS.filter((card) => card.category.includes(category)),
    [category]
  );
  const { railRef, atStart, atEnd } = useRailEdges(category);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {FILTERS.map((filter) => {
            const selected = filter.id === category;
            return (
              <Button
                key={filter.id}
                type="button"
                variant="transparent"
                size="lg"
                shape="pill"
                aria-pressed={selected}
                onClick={() => setCategory(filter.id)}
                className={cn(
                  "shadow-none",
                  selected
                    ? "bg-neutral-100 text-fg hover:bg-neutral-100"
                    : "text-fg-tertiary hover:bg-transparent hover:text-fg"
                )}
              >
                {filter.label}
              </Button>
            );
          })}
        </div>
        <IconButton
          aria-label="Search"
          variant="transparent"
          size="lg"
          shape="pill"
          className="text-fg shadow-none hover:bg-transparent"
        >
          <SearchIcon className="size-[18px]" />
        </IconButton>
      </div>

      <div className="relative mt-10">
        <div
          ref={railRef}
          className="flex gap-7 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {cards.map((card) => (
            <SuggestionCard key={card.id} card={card} onSelect={onPrefill} />
          ))}
        </div>
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-[120px] bg-gradient-to-l from-transparent to-neutral-0 transition-opacity duration-150 ease-[var(--ease-out)]",
            atStart ? "opacity-0" : "opacity-100"
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-[120px] bg-gradient-to-r from-transparent to-neutral-0 transition-opacity duration-150 ease-[var(--ease-out)]",
            atEnd ? "opacity-0" : "opacity-100"
          )}
        />
      </div>
    </div>
  );
}
