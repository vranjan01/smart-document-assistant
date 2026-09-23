"use client";

import type { ExtractedTable } from "@/lib/types";

export function TableRenderer({ table, index }: { table: ExtractedTable; index: number }) {
  if (!table.rows || table.rows.length === 0) {
    return null;
  }

  const headers = table.rows[0];
  const dataRows = table.rows.slice(1);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h4 className="text-sm font-medium">
          Table {index + 1}
        </h4>

        <span className="text-xs text-muted-foreground">
          Page {table.page}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="whitespace-nowrap border-b border-border px-4 py-2 text-left font-medium"
                >
                  {header ?? `Column ${i + 1}`}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {dataRows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-border last:border-0"
              >
                {headers.map((_, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-4 py-2 text-muted-foreground"
                  >
                    {row[colIndex] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}