"use client";

import * as React from "react";
import { Inbox, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type ColumnDef<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: ColumnDef<T>[];
  data: T[];
  searchKey?: keyof T;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  pageSize?: number;
  emptyMessage?: string;
  /**
   * Optional renderer for narrow viewports. When provided, the table is
   * hidden on <md and a stack of these cards renders instead. Pagination
   * and search behave the same in both layouts.
   */
  mobileCard?: (row: T) => React.ReactNode;
};

export function DataTable<T>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search…",
  onRowClick,
  actions,
  pageSize = 10,
  emptyMessage = "No records found",
  mobileCard,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(0);

  const filtered = React.useMemo(() => {
    if (!searchKey || !query.trim()) return data;
    const needle = query.trim().toLowerCase();
    return data.filter((row) => {
      const value = row[searchKey];
      return value != null && String(value).toLowerCase().includes(needle);
    });
  }, [data, query, searchKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);
  const showingFrom = filtered.length === 0 ? 0 : start + 1;
  const showingTo = Math.min(start + pageSize, filtered.length);

  return (
    <div className="space-y-3">
      {searchKey && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            className="pl-8"
          />
        </div>
      )}

      {mobileCard && (
        <div className="space-y-3 md:hidden">
          {pageRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#F8BBD0] bg-white/70 p-8 text-muted-foreground">
              <Inbox className="size-6" />
              <span className="text-sm">{emptyMessage}</span>
            </div>
          ) : (
            pageRows.map((row, idx) => (
              <div
                key={idx}
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                className={cn(
                  "rounded-2xl border border-[#F8BBD0] bg-white/95 p-4 shadow-[0_4px_18px_-12px_rgba(236,72,153,0.3)] backdrop-blur-sm",
                  onRowClick && "cursor-pointer active:scale-[0.99]",
                )}
              >
                {mobileCard(row)}
                {actions && (
                  <div
                    className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-[#F8BBD0]/60 pt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actions(row)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-[#F8BBD0] bg-white/90 shadow-sm backdrop-blur-sm",
          mobileCard && "hidden md:block",
        )}
      >
        <Table>
          <TableHeader className="bg-gradient-to-r from-[#FFE4EC] to-[#FFD1DC]">
            <TableRow className="border-b-[#F8BBD0]/60 hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#BE185D]",
                    col.className,
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
              {actions && (
                <TableHead className="w-px px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[#BE185D]">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Inbox className="size-6" />
                    <span className="text-sm">{emptyMessage}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row, idx) => (
                <TableRow
                  key={idx}
                  className={cn(
                    "border-t border-[#F8BBD0]/40 transition-colors hover:bg-[#FFF5F8]/50",
                    onRowClick && "cursor-pointer",
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn("px-4 py-3 text-[#3D1A2A]", col.className)}
                    >
                      {col.cell(row)}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actions(row)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground sm:text-sm">
          <span>
            Showing {showingFrom}-{showingTo} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Prev
            </Button>
            <span className="whitespace-nowrap">
              {safePage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
