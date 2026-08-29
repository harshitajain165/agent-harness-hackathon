"use client";

import { useMemo, useState } from "react";
import {
  ChevronDownIcon,
  ChevronsUpDownIcon,
  FilterIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
} from "@/components/icons";
import { Pill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { useLiveImpressions } from "@/lib/home/live-impressions";
import { usePublishedChannels } from "@/lib/home/published-channels";
import {
  addedImpressionChannels,
  applyChannelPresence,
  buildPublishRows,
  formatCompactCount,
  formatRevenue,
  PUBLISH_IMPRESSION_COLUMNS,
  publishedUrlsForRow,
  sortPublishRows,
  type PublishRow,
  type PublishSort,
  type PublishStatus,
} from "@/lib/home/publishes";
import type { HomeRankedItem } from "@/lib/home/types";
import { cn, floatingSurfaceClassName } from "@/lib/utils";
import { SAMPLE_VIDEOS } from "./home-ranked-lists";

const SORTS: { id: PublishSort; label: string }[] = [
  { id: "impressions", label: "Impressions" },
  { id: "likes", label: "Likes" },
  { id: "comments", label: "Comments" },
  { id: "revenue", label: "Trickle-down" },
  { id: "name", label: "Name" },
];

function VideoThumb({ name, src }: { name: string; src: string }) {
  return (
    <img
      src={src}
      alt={name}
      className="h-10 w-[72px] shrink-0 rounded-[8px] bg-neutral-100 object-cover"
    />
  );
}

function MetricValue({ children }: { children: string }) {
  return (
    <Text as="span" size="sm" className="tabular-nums">
      {children}
    </Text>
  );
}

function ChannelHead({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <img
        src={icon}
        alt=""
        width={16}
        height={16}
        className="size-4 shrink-0 rounded-[3px] object-cover"
      />
      {label}
    </span>
  );
}

export function PublishesTable({ videos: videosProp }: { videos?: HomeRankedItem[] }) {
  const live = useLiveImpressions();
  const publishedByVideo = usePublishedChannels();
  const liveMode = videosProp == null;
  const seed = videosProp ?? SAMPLE_VIDEOS;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<PublishSort>("impressions");
  const [overrides, setOverrides] = useState<
    Record<string, Partial<Pick<PublishRow, "status">>>
  >({});

  const incoming = useMemo(() => buildPublishRows(seed), [seed]);
  const liveById = useMemo(
    () => Object.fromEntries(live.videos.map((video) => [video.id, video.impressions])),
    [live.videos],
  );
  const rows = useMemo(
    () =>
      incoming.map((row) => {
        const total = liveMode ? (liveById[row.id] ?? row.impressionTotal) : row.impressionTotal;
        const extra = addedImpressionChannels(publishedUrlsForRow(row, publishedByVideo));
        return applyChannelPresence({ ...row, ...overrides[row.id] }, total, extra);
      }),
    [incoming, liveById, liveMode, overrides, publishedByVideo],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((row) => row.name.toLowerCase().includes(needle))
      : rows;
    return sortPublishRows(filtered, sort);
  }, [query, rows, sort]);

  const setStatus = (id: string, status: PublishStatus) => {
    setOverrides((current) => ({ ...current, [id]: { ...current[id], status } }));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          <IconButton aria-label="New publish" variant="tertiary" size="sm">
            <PlusIcon className="size-4" />
          </IconButton>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<IconButton aria-label="Sort publishes" variant="tertiary" size="sm" />}
            >
              <ChevronsUpDownIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className={cn(floatingSurfaceClassName, "w-44 rounded-[10px]")}
            >
              {SORTS.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  selected={item.id === sort}
                  onClick={() => setSort(item.id)}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <IconButton aria-label="Filter publishes" variant="tertiary" size="sm">
            <FilterIcon className="size-4" />
          </IconButton>
          <InputGroup className="w-[200px]">
            <InputGroupAddon align="inline-start">
              <SearchIcon className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search publishes"
            />
          </InputGroup>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<IconButton aria-label="More actions" variant="tertiary" size="sm" />}
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={cn(floatingSurfaceClassName, "w-44 rounded-[10px]")}
          >
            <DropdownMenuItem>Export</DropdownMenuItem>
            <DropdownMenuItem>Customize columns</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {visible.length === 0 ? (
        <EmptyState className="mx-auto py-12">
          <EmptyStateTitle className="text-sm font-normal text-fg-secondary">
            No publishes match
          </EmptyStateTitle>
          <EmptyStateDescription className="text-sm text-fg-tertiary">
            Try a different search or clear the filter.
          </EmptyStateDescription>
        </EmptyState>
      ) : null}

      {visible.length === 0 ? null : (
      <Table key="publishes-no-select" lines="none" well={false}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[104px]">
              Video
            </TableHead>
            <TableHead className="min-w-[200px]">
              Name
            </TableHead>
            <TableHead>Status</TableHead>
            {PUBLISH_IMPRESSION_COLUMNS.map((column) => (
              <TableHead key={column.id} className="w-28">
                <ChannelHead icon={column.icon} label={column.label} />
              </TableHead>
            ))}
            <TableHead className="w-24">Likes</TableHead>
            <TableHead className="w-28">Comments</TableHead>
            <TableHead className="w-28">Trickle-down</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="w-[104px]">
                <VideoThumb name={row.name} src={row.thumb} />
              </TableCell>
              <TableCell className="min-w-[200px]">
                <Text as="span" size="sm" className="whitespace-normal">
                  {row.name}
                </Text>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="transparent" size="sm" className="h-auto px-0" />
                    }
                  >
                    <Pill variant={row.status === "live" ? "positive" : "secondary"}>
                      {row.status === "live" ? "Live" : "Draft"}
                      <ChevronDownIcon className="size-3.5" />
                    </Pill>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className={cn(floatingSurfaceClassName, "w-32 rounded-[10px]")}
                  >
                    <DropdownMenuItem
                      selected={row.status === "live"}
                      onClick={() => setStatus(row.id, "live")}
                    >
                      Live
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      selected={row.status === "draft"}
                      onClick={() => setStatus(row.id, "draft")}
                    >
                      Draft
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
              {PUBLISH_IMPRESSION_COLUMNS.map((column) => {
                const value = row.channels[column.id];
                return (
                  <TableCell key={column.id} className="w-28">
                    {value == null ? null : <MetricValue>{formatCompactCount(value)}</MetricValue>}
                  </TableCell>
                );
              })}
              <TableCell className="w-24">
                <MetricValue>{formatCompactCount(row.likes)}</MetricValue>
              </TableCell>
              <TableCell className="w-28">
                <MetricValue>{formatCompactCount(row.comments)}</MetricValue>
              </TableCell>
              <TableCell className="w-28">
                <MetricValue>{formatRevenue(row.revenue)}</MetricValue>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}
    </div>
  );
}
