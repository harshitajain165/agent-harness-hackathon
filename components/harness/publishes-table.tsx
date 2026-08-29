"use client";

import { useMemo, useState } from "react";
import {
  ChevronDownIcon,
  ChevronsUpDownIcon,
  FilterIcon,
  GrabberIcon,
  MoreHorizontalIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
} from "@/components/icons";
import { Pill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import {
  buildPublishRows,
  formatCompactCount,
  formatRevenue,
  seriesForMetric,
  sortPublishRows,
  type PublishRow,
  type PublishSort,
  type PublishStatus,
} from "@/lib/home/publishes";
import type { HomeRankedItem } from "@/lib/home/types";
import { cn, floatingSurfaceClassName } from "@/lib/utils";
import { SAMPLE_VIDEOS } from "./home-ranked-lists";
import { Sparkline } from "./sparkline";

const SORTS: { id: PublishSort; label: string }[] = [
  { id: "impressions", label: "Impressions" },
  { id: "likes", label: "Likes" },
  { id: "comments", label: "Comments" },
  { id: "revenue", label: "Trickle-down" },
  { id: "name", label: "Name" },
];

function VideoThumb({ name, hue }: { name: string; hue: number }) {
  return (
    <div
      className="relative h-10 w-[72px] shrink-0 overflow-hidden rounded-[8px] bg-neutral-950"
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 70% 42%) 0%, hsl(${hue + 28} 80% 18%) 100%)`,
        }}
      />
      <PlayIcon className="absolute inset-0 m-auto size-4 text-on-inverted" />
      <span className="sr-only">{name}</span>
    </div>
  );
}

function MetricPlot({
  row,
  metric,
  color,
  format,
}: {
  row: PublishRow;
  metric: "impressions" | "likes" | "comments" | "revenue";
  color: string;
  format: (value: number) => string;
}) {
  const values = useMemo(
    () => seriesForMetric(row.id, metric, row[metric]),
    [metric, row.id, row[metric]],
  );

  return (
    <div className="flex items-center gap-3">
      <Sparkline values={values} color={color} />
      <Text as="span" size="sm" className="min-w-10 tabular-nums">
        {format(row[metric])}
      </Text>
    </div>
  );
}

export function PublishesTable({ videos = SAMPLE_VIDEOS }: { videos?: HomeRankedItem[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<PublishSort>("impressions");
  const [overrides, setOverrides] = useState<
    Record<string, Partial<Pick<PublishRow, "featured" | "status">>>
  >({});
  const [selected, setSelected] = useState<string[]>([]);

  const incoming = useMemo(() => buildPublishRows(videos), [videos]);
  const rows = useMemo(
    () => incoming.map((row) => ({ ...row, ...overrides[row.id] })),
    [incoming, overrides],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((row) => row.name.toLowerCase().includes(needle))
      : rows;
    return sortPublishRows(filtered, sort);
  }, [query, rows, sort]);

  const allVisibleSelected =
    visible.length > 0 && visible.every((row) => selected.includes(row.id));

  const toggleAll = (checked: boolean) => {
    const visibleIds = visible.map((row) => row.id);
    setSelected((current) => {
      if (checked) return [...new Set([...current, ...visibleIds])];
      const hide = new Set(visibleIds);
      return current.filter((id) => !hide.has(id));
    });
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id),
    );
  };

  const setFeatured = (id: string, featured: boolean) => {
    setOverrides((current) => ({ ...current, [id]: { ...current[id], featured } }));
  };

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
      <Table lines="none">
        <TableHeader>
          <TableRow>
            <TableHead pin="start" className="w-16">
              <Checkbox
                size="sm"
                checked={allVisibleSelected}
                onCheckedChange={(checked) => toggleAll(checked === true)}
                aria-label="Select all publishes"
              />
            </TableHead>
            <TableHead pin="start" className="w-[104px]">
              Video
            </TableHead>
            <TableHead pin="start" className="min-w-[200px]">
              Name
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Featured</TableHead>
            <TableHead>Impressions</TableHead>
            <TableHead>Likes</TableHead>
            <TableHead>Comments</TableHead>
            <TableHead>Trickle-down</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((row) => (
            <TableRow
              key={row.id}
              data-selected={selected.includes(row.id) ? "true" : undefined}
            >
              <TableCell pin="start" className="w-16">
                <div className="flex items-center gap-2">
                  <GrabberIcon className="size-4 cursor-grab text-fg-tertiary" />
                  <Checkbox
                    size="sm"
                    checked={selected.includes(row.id)}
                    onCheckedChange={(checked) => toggleOne(row.id, checked === true)}
                    aria-label={`Select ${row.name}`}
                  />
                </div>
              </TableCell>
              <TableCell pin="start" className="w-[104px]">
                <VideoThumb name={row.name} hue={row.hue} />
              </TableCell>
              <TableCell pin="start" className="min-w-[200px]">
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
              <TableCell>
                <Switch
                  size="sm"
                  checked={row.featured}
                  onCheckedChange={(checked) => setFeatured(row.id, checked)}
                  aria-label={`Feature ${row.name}`}
                />
              </TableCell>
              <TableCell>
                <MetricPlot
                  row={row}
                  metric="impressions"
                  color="#f37a2d"
                  format={formatCompactCount}
                />
              </TableCell>
              <TableCell>
                <MetricPlot
                  row={row}
                  metric="likes"
                  color="#171717"
                  format={formatCompactCount}
                />
              </TableCell>
              <TableCell>
                <MetricPlot
                  row={row}
                  metric="comments"
                  color="#737373"
                  format={formatCompactCount}
                />
              </TableCell>
              <TableCell>
                <MetricPlot
                  row={row}
                  metric="revenue"
                  color="#171717"
                  format={formatRevenue}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}
    </div>
  );
}
