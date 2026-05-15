"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronDown,
  DollarSign,
  Download,
  ListChecks,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type ColumnDef } from "@/components/manicurist/DataTable";
import { StatsCard } from "@/components/manicurist/StatsCard";
import { exportToCSV } from "@/lib/utils/csvExport";
import { formatMYR } from "@/lib/utils/formatPrice";
import type { Database } from "@/types/database.types";

type RecordSource = Database["public"]["Enums"]["record_source"];

type BookingRel =
  | { id: string; booking_number: string | null }
  | { id: string; booking_number: string | null }[]
  | null;

export type SalesRow = {
  id: string;
  date: string;
  gross_sales: number;
  refunds: number | null;
  discounts: number | null;
  net_sales: number | null;
  cost_of_goods: number | null;
  gross_profit: number | null;
  source: RecordSource | null;
  booking_id: string | null;
  bookings: BookingRel;
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00`));
}

function pickBooking(row: SalesRow): { id: string; booking_number: string | null } | null {
  if (!row.bookings) return null;
  if (Array.isArray(row.bookings)) return row.bookings[0] ?? null;
  return row.bookings;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SalesView({ sales }: { sales: SalesRow[] }) {
  const [sourceFilter, setSourceFilter] = React.useState<RecordSource | "all">("all");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    return sales.filter((s) => {
      if (sourceFilter !== "all" && s.source !== sourceFilter) return false;
      if (dateFrom && s.date < dateFrom) return false;
      if (dateTo && s.date > dateTo) return false;
      return true;
    });
  }, [sales, sourceFilter, dateFrom, dateTo]);

  const summary = React.useMemo(() => {
    const totalNet = filtered.reduce(
      (sum, s) => sum + Number(s.net_sales ?? 0),
      0,
    );
    const totalProfit = filtered.reduce(
      (sum, s) => sum + Number(s.gross_profit ?? 0),
      0,
    );
    const bookingsCount = filtered.filter((s) => s.booking_id).length;
    const avg = bookingsCount === 0 ? 0 : totalNet / bookingsCount;
    return { totalNet, totalProfit, bookingsCount, avg };
  }, [filtered]);

  function handleExport() {
    const rows = filtered.map((s) => {
      const booking = pickBooking(s);
      return {
        date: s.date,
        booking_number: booking?.booking_number ?? "",
        gross_sales: Number(s.gross_sales ?? 0),
        discounts: Number(s.discounts ?? 0),
        refunds: Number(s.refunds ?? 0),
        net_sales: Number(s.net_sales ?? 0),
        cost_of_goods: Number(s.cost_of_goods ?? 0),
        gross_profit: Number(s.gross_profit ?? 0),
        source: s.source ?? "",
      };
    });
    exportToCSV(rows, `sales-${todayISO()}.csv`, [
      { key: "date", label: "Date" },
      { key: "booking_number", label: "Booking #" },
      { key: "gross_sales", label: "Gross Sales" },
      { key: "discounts", label: "Discounts" },
      { key: "refunds", label: "Refunds" },
      { key: "net_sales", label: "Net Sales" },
      { key: "cost_of_goods", label: "COGS" },
      { key: "gross_profit", label: "Gross Profit" },
      { key: "source", label: "Source" },
    ]);
  }

  const columns: ColumnDef<SalesRow>[] = [
    {
      key: "date",
      header: "Date",
      cell: (row) => formatDate(row.date),
    },
    {
      key: "booking_number",
      header: "Booking",
      cell: (row) => {
        const booking = pickBooking(row);
        if (!booking) {
          return <span className="text-xs text-muted-foreground">-</span>;
        }
        return (
          <Link
            href="/bookings"
            className="font-mono text-xs text-[#EC4899] hover:underline"
          >
            {booking.booking_number ?? booking.id.slice(0, 8)}
          </Link>
        );
      },
    },
    {
      key: "gross_sales",
      header: "Gross",
      cell: (row) => formatMYR(Number(row.gross_sales ?? 0)),
    },
    {
      key: "discounts",
      header: "Discounts",
      cell: (row) => formatMYR(Number(row.discounts ?? 0)),
    },
    {
      key: "net_sales",
      header: "Net",
      cell: (row) => (
        <span className="font-medium text-[#3D1A2A]">
          {formatMYR(Number(row.net_sales ?? 0))}
        </span>
      ),
    },
    {
      key: "cost_of_goods",
      header: "COGS",
      cell: (row) => formatMYR(Number(row.cost_of_goods ?? 0)),
    },
    {
      key: "gross_profit",
      header: "Profit",
      cell: (row) => (
        <span className="font-medium text-emerald-700">
          {formatMYR(Number(row.gross_profit ?? 0))}
        </span>
      ),
    },
    {
      key: "source",
      header: "Source",
      cell: (row) => (
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {row.source ?? "-"}
        </span>
      ),
    },
  ];

  const filtersActive = sourceFilter !== "all" || dateFrom || dateTo;
  const activeFilterCount =
    (sourceFilter !== "all" ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        <StatsCard
          label="Net Sales"
          value={formatMYR(summary.totalNet)}
          icon={DollarSign}
          accent="emerald"
        />
        <StatsCard
          label="Gross Profit"
          value={formatMYR(summary.totalProfit)}
          icon={TrendingUp}
          accent="rose"
        />
        <StatsCard
          label="Bookings"
          value={summary.bookingsCount}
          icon={ListChecks}
          accent="violet"
        />
        <StatsCard
          label="Average Booking"
          value={formatMYR(summary.avg)}
          icon={Calendar}
          accent="amber"
        />
      </div>

      <div className="rounded-2xl border border-[#F8BBD0] bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:p-5">
        {/* Mobile filter toggle bar */}
        <div className="flex items-center justify-between gap-2 sm:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            aria-expanded={mobileFiltersOpen}
            className="gap-2"
          >
            <SlidersHorizontal className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EC4899] px-1.5 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={`size-4 transition-transform ${mobileFiltersOpen ? "rotate-180" : ""}`}
            />
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleExport}
            className="bg-white hover:bg-[#FFE4EC]"
          >
            <Download />
            Export
          </Button>
        </div>

        <div
          className={`flex-col gap-4 sm:flex sm:flex-row sm:flex-wrap sm:items-end sm:justify-between ${
            mobileFiltersOpen ? "mt-4 flex" : "hidden sm:flex"
          }`}
        >
          <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:flex sm:flex-wrap sm:items-end sm:gap-x-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium tracking-wide text-[#5C2D48]">
                Source
              </label>
              <Select
                value={sourceFilter}
                onValueChange={(v) => setSourceFilter(v as RecordSource | "all")}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium tracking-wide text-[#5C2D48]">
                From
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 sm:w-44"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium tracking-wide text-[#5C2D48]">
                To
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 sm:w-44"
              />
            </div>

            {filtersActive && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="col-span-2 sm:col-span-1"
                onClick={() => {
                  setSourceFilter("all");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Reset
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={handleExport}
            className="hidden bg-white hover:bg-[#FFE4EC] sm:inline-flex"
          >
            <Download />
            Export CSV
          </Button>
        </div>
      </div>

      <p className="px-1 text-xs text-[#5C2D48]/70">
        Showing {filtered.length} of {sales.length} sales rows
      </p>

      <DataTable<SalesRow>
        columns={columns}
        data={filtered}
        emptyMessage="No sales match the current filters"
        mobileCard={(row) => {
          const booking = pickBooking(row);
          return (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-[#5C2D48]/70">
                    {formatDate(row.date)}
                  </p>
                  {booking ? (
                    <Link
                      href="/bookings"
                      className="block font-mono text-xs text-[#EC4899] hover:underline"
                    >
                      {booking.booking_number ?? booking.id.slice(0, 8)}
                    </Link>
                  ) : (
                    <p className="font-mono text-xs text-[#5C2D48]/50">-</p>
                  )}
                </div>
                <span className="pmu-animated-gradient-text shrink-0 text-lg font-bold tracking-tight">
                  {formatMYR(Number(row.net_sales ?? 0))}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-[#FFF5F8]/60 px-3 py-2 text-center">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C2D48]/70">
                    Gross
                  </p>
                  <p className="text-xs font-semibold text-[#3D1A2A]">
                    {formatMYR(Number(row.gross_sales ?? 0))}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C2D48]/70">
                    COGS
                  </p>
                  <p className="text-xs font-semibold text-[#3D1A2A]">
                    {formatMYR(Number(row.cost_of_goods ?? 0))}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C2D48]/70">
                    Profit
                  </p>
                  <p className="text-xs font-semibold text-emerald-700">
                    {formatMYR(Number(row.gross_profit ?? 0))}
                  </p>
                </div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
