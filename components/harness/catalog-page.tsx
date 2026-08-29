"use client";

import { useState } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HomeMetricKind } from "@/lib/home/types";
import { RankedColumn, SAMPLE_CHANNELS } from "./home-ranked-lists";
import { PublishesTable } from "./publishes-table";

export function CatalogPage({
  title,
  kind,
}: {
  title: string;
  kind: "publishes" | "channels";
}) {
  const [metric, setMetric] = useState<HomeMetricKind>("impressions");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-11 shrink-0 items-center px-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-fg-secondary">{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <ScrollArea className="min-h-0 flex-1" scrollFade>
        {kind === "publishes" ? (
          <div className="px-4 py-6">
            <PublishesTable />
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[820px] px-6 py-8">
            <div className="rounded-[14px] bg-neutral-0">
              <RankedColumn
                title="Channels"
                items={SAMPLE_CHANNELS}
                metric={metric}
                onMetricChange={setMetric}
                fallbackIcon="none"
                empty="Channels a video is live on will show here."
              />
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
