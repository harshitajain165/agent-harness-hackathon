"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import type { RecordsArtifact } from "@/lib/agent/types";

export function RecordsTable({ artifact }: { artifact: RecordsArtifact }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Text size="sm" weight="medium">
        {artifact.title}
      </Text>
      <Table lines="end">
        <TableHeader>
          <TableRow>
            {artifact.columns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {artifact.rows.map((row, index) => (
            <TableRow key={`${row[artifact.columns[0]] ?? index}-${index}`}>
              {artifact.columns.map((column) => (
                <TableCell key={column}>{row[column] ?? "—"}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
