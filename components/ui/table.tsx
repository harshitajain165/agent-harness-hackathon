"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";

import { Frame } from "@/components/ui/frame";
import { cn } from "@/lib/utils";

type TableLines = "none" | "all" | "start" | "end";
type TablePin = "start" | "end";
type TableCellVariant = "default" | "agent";
type TableLane = "start" | "middle" | "end";

const innerRadiusClass = "rounded-[16px]";

function useTableOverflow(ref: RefObject<HTMLDivElement | null>) {
  const [overflowStart, setOverflowStart] = useState(false);
  const [overflowEnd, setOverflowEnd] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = node;
      setOverflowStart(scrollLeft > 1);
      setOverflowEnd(scrollLeft + clientWidth < scrollWidth - 1);
    };

    update();
    node.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(node);
    const table = node.querySelector("[data-slot=table]");
    if (table) observer.observe(table);

    return () => {
      node.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [ref]);

  return { overflowStart, overflowEnd };
}

function usePassVerticalWheel(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

      const { overflowY } = getComputedStyle(node);
      const canScrollY =
        (overflowY === "auto" || overflowY === "scroll") &&
        node.scrollHeight > node.clientHeight + 1;

      if (canScrollY) {
        const atTop = node.scrollTop <= 0;
        const atBottom =
          node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
        const scrollingUp = event.deltaY < 0;
        const scrollingDown = event.deltaY > 0;

        if ((scrollingUp && !atTop) || (scrollingDown && !atBottom)) return;
        return;
      }

      const scrollRoot = document.scrollingElement;
      if (!scrollRoot) return;

      event.preventDefault();
      scrollRoot.scrollTop += event.deltaY;
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [ref]);
}

function usePaneMetrics(
  startRef: RefObject<HTMLDivElement | null>,
  middleRef: RefObject<HTMLDivElement | null>,
  endRef: RefObject<HTMLDivElement | null>
) {
  useLayoutEffect(() => {
    const panes = [startRef.current, middleRef.current, endRef.current].filter(
      (node): node is HTMLDivElement => Boolean(node)
    );
    if (!panes.length) return;

    const sync = () => {
      const headerTables = panes.map((pane) =>
        pane.querySelector("[data-slot=table-header-table]")
      );
      const bodyTables = panes.map((pane) =>
        pane.querySelector("[data-slot=table]")
      );

      panes.forEach((_, paneIndex) => {
        const headerTable = headerTables[paneIndex];
        const bodyTable = bodyTables[paneIndex];
        if (!headerTable || !bodyTable) return;

        const headerCells = headerTable.querySelectorAll("thead th");
        const bodyCells = bodyTable.querySelectorAll("tbody tr:first-child td");
        bodyCells.forEach((cell, index) => {
          const head = headerCells[index] as HTMLElement | undefined;
          if (!head) return;
          const width = `${Math.ceil(cell.getBoundingClientRect().width)}px`;
          const el = cell as HTMLElement;
          head.style.width = width;
          head.style.minWidth = width;
          head.style.maxWidth = width;
          el.style.width = width;
          el.style.minWidth = width;
          el.style.maxWidth = width;
        });
      });

      const rowLists = bodyTables.map((table) =>
        table ? Array.from(table.querySelectorAll("tbody tr")) : []
      );
      const rowCount = Math.max(0, ...rowLists.map((rows) => rows.length));

      for (let index = 0; index < rowCount; index += 1) {
        const rows = rowLists
          .map((list) => list[index] as HTMLElement | undefined)
          .filter((row): row is HTMLElement => Boolean(row));
        rows.forEach((row) => {
          row.style.height = "";
        });
        const height = Math.ceil(
          Math.max(...rows.map((row) => row.getBoundingClientRect().height))
        );
        rows.forEach((row) => {
          row.style.height = `${height}px`;
        });
      }
    };

    sync();
    const observer = new ResizeObserver(sync);
    panes.forEach((pane) => observer.observe(pane));
    return () => observer.disconnect();
  }, [startRef, middleRef, endRef]);
}

function cellPin(node: ReactElement): TablePin | undefined {
  const pin = (node.props as { pin?: TablePin }).pin;
  return pin === "start" || pin === "end" ? pin : undefined;
}

function laneOfPin(pin?: TablePin): TableLane {
  if (pin === "start") return "start";
  if (pin === "end") return "end";
  return "middle";
}

function splitRow(
  row: ReactElement,
  lane: TableLane,
  rowIndex: number,
  hoveredRow: number | null,
  onHoverRow: (index: number | null) => void
) {
  const cells = Children.toArray(
    (row.props as { children?: ReactNode }).children
  ).filter(isValidElement);
  const nextCells = cells.filter(
    (cell) => laneOfPin(cellPin(cell)) === lane
  );
  if (!nextCells.length) return null;

  return cloneElement(
    row as ReactElement<Record<string, unknown>>,
    {
      children: nextCells,
      "data-row-hover": hoveredRow === rowIndex ? "true" : undefined,
      onMouseEnter: () => onHoverRow(rowIndex),
      onMouseLeave: () => onHoverRow(null),
    }
  );
}

function splitSection(
  section: ReactElement | null,
  lane: TableLane,
  hoveredRow: number | null,
  onHoverRow: (index: number | null) => void
) {
  if (!section) return null;

  const rows = Children.toArray(
    (section.props as { children?: ReactNode }).children
  ).filter(isValidElement);
  const nextRows = rows
    .map((row, index) =>
      splitRow(row, lane, index, hoveredRow, onHoverRow)
    )
    .filter(Boolean);

  if (!nextRows.length) return null;
  return cloneElement(section as ReactElement<{ children?: ReactNode }>, {
    children: nextRows,
  });
}

function getTableParts(children: ReactNode) {
  let header: ReactElement | null = null;
  let body: ReactElement | null = null;
  let footer: ReactElement | null = null;

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === TableHeader) header = child as ReactElement;
    else if (child.type === TableBody) body = child as ReactElement;
    else if (child.type === TableFooter) footer = child as ReactElement;
  });

  return { header, body, footer };
}

function pinFadeClassName(pin?: TablePin, surface: "head" | "cell" = "cell") {
  if (!pin) return undefined;

  const fadeBase =
    "after:pointer-events-none after:absolute after:inset-y-0 after:w-8 after:to-transparent after:opacity-0 after:transition-[opacity,color] after:duration-150";

  if (surface === "head") {
    return cn(
      "relative isolate",
      pin === "start" && [
        fadeBase,
        "after:left-full after:bg-linear-to-r after:from-neutral-100",
        "group-data-[overflow-start=true]/table-scroll:after:opacity-100",
      ],
      pin === "end" && [
        fadeBase,
        "after:right-full after:bg-linear-to-l after:from-neutral-100",
        "group-data-[overflow-end=true]/table-scroll:after:opacity-100",
      ]
    );
  }

  return cn(
    "relative isolate",
    pin === "start" && [
      fadeBase,
      "after:left-full after:bg-linear-to-r after:from-container group-hover/row:after:from-neutral-50 group-data-selected/row:after:from-neutral-50 group-data-[row-hover=true]/row:after:from-neutral-50",
      "group-data-[overflow-start=true]/table-scroll:after:opacity-100",
    ],
    pin === "end" && [
      fadeBase,
      "after:right-full after:bg-linear-to-l after:from-container group-hover/row:after:from-neutral-50 group-data-selected/row:after:from-neutral-50 group-data-[row-hover=true]/row:after:from-neutral-50",
      "group-data-[overflow-end=true]/table-scroll:after:opacity-100",
    ]
  );
}

function bodyTableClassName(lines: TableLines, className?: string) {
  return cn(
    "w-max min-w-full table-fixed border-separate border-spacing-0 text-sm",
    "[&_tbody_tr]:cursor-pointer",
    "[&_tbody_tr:hover>td]:bg-neutral-50",
    "[&_tbody_tr[data-row-hover]>td]:bg-neutral-50",
    "[&_tbody_tr[data-selected]>td]:bg-neutral-50",
    "[&_tbody_tr:not(:last-child)>td]:border-b [&_tbody_tr:not(:last-child)>td]:border-b-neutral-150",
    lines === "all" && [
      "[&_tbody_tr>td:not(:last-child)]:border-r [&_tbody_tr>td:not(:last-child)]:border-r-neutral-150",
    ],
    lines === "start" && [
      "[&_tbody_tr>td:first-child]:border-r [&_tbody_tr>td:first-child]:border-r-neutral-150",
    ],
    lines === "end" && [
      "[&_tbody_tr>td:last-child]:border-l [&_tbody_tr>td:last-child]:border-l-neutral-150",
    ],
    className
  );
}

function TablePane({
  lane,
  hasStart,
  hasEnd,
  overflowStart,
  overflowEnd,
  header,
  body,
  footer,
  lines,
  well,
  className,
  tableProps,
  paneRef,
  scrollRef,
}: {
  lane: TableLane;
  hasStart: boolean;
  hasEnd: boolean;
  overflowStart: boolean;
  overflowEnd: boolean;
  header: ReactElement | null;
  body: ReactElement | null;
  footer: ReactElement | null;
  lines: TableLines;
  well: boolean;
  className?: string;
  tableProps: ComponentProps<"table">;
  paneRef: RefObject<HTMLDivElement | null>;
  scrollRef?: RefObject<HTMLDivElement | null>;
}) {
  const isStart = lane === "start";
  const isEnd = lane === "end";
  const isMiddle = lane === "middle";

  const bodyShell = (
    <div
      data-slot="table-inner"
      className={cn(
        "bg-neutral-0",
        well && "border-y border-neutral-200",
        well && isStart && "rounded-l-[16px] border-l",
        well && isEnd && "rounded-r-[16px] border-r",
        isMiddle && "overflow-hidden",
        well && isMiddle && !hasStart && "border-l",
        well && isMiddle && !hasEnd && "border-r",
        well && isMiddle && !hasStart && !hasEnd && innerRadiusClass,
        !well && "border-t border-neutral-200"
      )}
    >
      <table
        data-slot="table"
        data-lines={lines}
        className={bodyTableClassName(
          lines,
          cn(
            className,
            well &&
              isStart &&
              "[&_tbody_tr:first-child>td]:rounded-tl-[16px] [&_tbody_tr:last-child>td]:rounded-bl-[16px]",
            well &&
              isEnd &&
              "[&_tbody_tr:first-child>td]:rounded-tr-[16px] [&_tbody_tr:last-child>td]:rounded-br-[16px]"
          )
        )}
        {...tableProps}
      >
        {body}
        {footer}
      </table>
    </div>
  );

  const headerTable = header ? (
    <table
      data-slot="table-header-table"
      className="w-max min-w-full table-fixed border-separate border-spacing-0 text-sm"
    >
      {header}
    </table>
  ) : null;

  const stackClass = well ? "flex-col gap-1" : "flex-col";

  return (
    <div
      ref={paneRef}
      data-slot={`table-pane-${lane}`}
      className={cn(
        "relative flex",
        stackClass,
        isMiddle ? "min-w-0 flex-1" : "z-10 shrink-0",
        well && !isMiddle && "bg-neutral-100"
      )}
    >
      {isMiddle ? (
        <div
          ref={scrollRef}
          data-slot="table-scroll"
          data-overflow-start={overflowStart ? "true" : undefined}
          data-overflow-end={overflowEnd ? "true" : undefined}
          className={cn(
            "min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            well && !hasStart && !hasEnd && innerRadiusClass,
            well && hasStart && !hasEnd && "rounded-r-[16px]",
            well && !hasStart && hasEnd && "rounded-l-[16px]"
          )}
        >
          <div className={cn("flex w-max min-w-full", stackClass)}>
            {headerTable}
            {bodyShell}
          </div>
        </div>
      ) : (
        <>
          {headerTable}
          {bodyShell}
        </>
      )}
      {isStart ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-20 w-px bg-neutral-150"
        />
      ) : null}
    </div>
  );
}

function Table({
  className,
  lines = "none",
  well = true,
  children,
  ...props
}: ComponentProps<"table"> & {
  lines?: TableLines;
  well?: boolean;
}) {
  const startPaneRef = useRef<HTMLDivElement>(null);
  const middlePaneRef = useRef<HTMLDivElement>(null);
  const endPaneRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { overflowStart, overflowEnd } = useTableOverflow(scrollRef);
  const { header, body, footer } = getTableParts(children);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const startHeader = splitSection(header, "start", hoveredRow, setHoveredRow);
  const middleHeader = splitSection(header, "middle", hoveredRow, setHoveredRow);
  const endHeader = splitSection(header, "end", hoveredRow, setHoveredRow);
  const startBody = splitSection(body, "start", hoveredRow, setHoveredRow);
  const middleBody = splitSection(body, "middle", hoveredRow, setHoveredRow);
  const endBody = splitSection(body, "end", hoveredRow, setHoveredRow);
  const startFooter = splitSection(footer, "start", hoveredRow, setHoveredRow);
  const middleFooter = splitSection(footer, "middle", hoveredRow, setHoveredRow);
  const endFooter = splitSection(footer, "end", hoveredRow, setHoveredRow);

  const hasStart = Boolean(startHeader || startBody);
  const hasEnd = Boolean(endHeader || endBody);
  const hasMiddle = Boolean(middleHeader || middleBody);

  usePaneMetrics(startPaneRef, middlePaneRef, endPaneRef);
  usePassVerticalWheel(scrollRef);

  const panes = (
    <div className="flex min-w-0 items-stretch">
      {hasStart ? (
        <TablePane
          lane="start"
          hasStart={hasStart}
          hasEnd={hasEnd}
          overflowStart={overflowStart}
          overflowEnd={overflowEnd}
          header={startHeader}
          body={startBody}
          footer={startFooter}
          lines={lines}
          well={well}
          className={className}
          tableProps={props}
          paneRef={startPaneRef}
        />
      ) : null}
      {hasMiddle ? (
        <TablePane
          lane="middle"
          hasStart={hasStart}
          hasEnd={hasEnd}
          overflowStart={overflowStart}
          overflowEnd={overflowEnd}
          header={middleHeader}
          body={middleBody}
          footer={middleFooter}
          lines={lines}
          well={well}
          className={className}
          tableProps={props}
          paneRef={middlePaneRef}
          scrollRef={scrollRef}
        />
      ) : null}
      {hasEnd ? (
        <TablePane
          lane="end"
          hasStart={hasStart}
          hasEnd={hasEnd}
          overflowStart={overflowStart}
          overflowEnd={overflowEnd}
          header={endHeader}
          body={endBody}
          footer={endFooter}
          lines={lines}
          well={well}
          className={className}
          tableProps={props}
          paneRef={endPaneRef}
        />
      ) : null}
    </div>
  );

  const wellProps = {
    className: "group/table-scroll",
    "data-overflow-start": overflowStart ? "true" : undefined,
    "data-overflow-end": overflowEnd ? "true" : undefined,
  } as const;

  if (!well) {
    return (
      <div data-slot="table-flush" {...wellProps}>
        {panes}
      </div>
    );
  }

  return (
    <Frame data-slot="table-well" variant="default" {...wellProps}>
      {panes}
    </Frame>
  );
}

function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn(className)} {...props} />;
}

function TableFooter({ className, ...props }: ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("[&_td]:border-b-0 [&_td]:bg-neutral-100", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("group/row transition-colors duration-150", className)}
      {...props}
    />
  );
}

function TableHead({
  className,
  pin,
  lined = false,
  ...props
}: ComponentProps<"th"> & {
  pin?: TablePin;
  lined?: boolean;
}) {
  return (
    <th
      data-slot="table-head"
      data-pin={pin}
      className={cn(
        "h-11 bg-neutral-100 px-4 py-3 text-left align-middle text-sm font-medium whitespace-nowrap text-fg",
        pinFadeClassName(pin, "head"),
        lined && "border-r border-neutral-150",
        className
      )}
      {...props}
    />
  );
}

function TableCell({
  className,
  pin,
  lined = false,
  variant = "default",
  ...props
}: ComponentProps<"td"> & {
  pin?: TablePin;
  lined?: boolean;
  variant?: TableCellVariant;
}) {
  return (
    <td
      data-slot="table-cell"
      data-pin={pin}
      data-variant={variant === "default" ? undefined : variant}
      className={cn(
        "relative bg-neutral-0 px-4 py-3 text-left align-middle text-sm leading-5 font-normal text-fg",
        variant === "agent" ? "whitespace-normal" : "whitespace-nowrap",
        pinFadeClassName(pin, "cell"),
        lined && "border-r border-neutral-150",
        className
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-2 caption-bottom text-sm text-fg-secondary", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
};
export type { TableCellVariant, TableLines, TablePin };
