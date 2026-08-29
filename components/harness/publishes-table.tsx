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
import { Input } from "@/components/ui/input";
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
  const [rows, setRows] = useState(() => buildPublishRows(videos));
  const [selected, setSelected] = useState<string[]>([]);

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
    setSelected(checked ? visible.map((row) => row.id) : []);
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id),
    );
  };

  const setFeatured = (id: string, featured: boolean) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, featured } : row)),
    );
  };

  const setStatus = (id: string, status: PublishStatus) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, status } : row)),
    );
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
            <DropdownMenuContent align="start" className="w-44">
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
          <div className="relative w-[200px]">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-fg-tertiary" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search publishes"
              className="pl-8"
            />
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<IconButton aria-label="More actions" variant="tertiary" size="sm" />}
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
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
                  <DropdownMenuContent align="start" className="w-32">
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
