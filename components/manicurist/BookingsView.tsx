"use client";

import * as React from "react";
import { ChevronDown, Download, SlidersHorizontal } from "lucide-react";

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
import { BookingDetailDialog } from "@/components/manicurist/BookingDetailDialog";
import { exportToCSV } from "@/lib/utils/csvExport";
import { formatMYR } from "@/lib/utils/formatPrice";
import type { Database } from "@/types/database.types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];
type RecordSource = Database["public"]["Enums"]["record_source"];

type CustomerRel = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
} | null;

type ManicuristRel = {
  id: string;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
} | null;

type LineRel = {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  items: { id: string; name: string; cost: number | null } | { id: string; name: string; cost: number | null }[] | null;
};

export type BookingRow = {
  id: string;
  booking_number: string | null;
  booking_date: string;
  booking_time: string | null;
  service_mode: Database["public"]["Enums"]["service_mode"] | null;
  location_type: Database["public"]["Enums"]["location_type"];
  address: string | null;
  address_lat: number | null;
  address_lng: number | null;
  notes: string | null;
  subtotal: number;
  discount_amount: number | null;
  discount_type: Database["public"]["Enums"]["discount_type"] | null;
  total: number;
  status: BookingStatus | null;
  payment_status: PaymentStatus | null;
  source: RecordSource | null;
  customer_id: string;
  manicurist_id: string | null;
  created_at: string | null;
  customers: CustomerRel | CustomerRel[];
  manicurists: ManicuristRel | ManicuristRel[];
  booking_items: LineRel[] | null;
};

const STATUS_STYLES: Record<BookingStatus, { dot: string; chip: string }> = {
  pending: {
    dot: "bg-amber-400",
    chip: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  confirmed: {
    dot: "bg-[#EC4899]",
    chip: "bg-[#FFF5F8] text-[#BE185D] ring-[#F8BBD0]",
  },
  in_progress: {
    dot: "bg-violet-500",
    chip: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  completed: {
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  cancelled: {
    dot: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  unpaid: "bg-gray-100 text-gray-700 ring-gray-200",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  refunded: "bg-amber-50 text-amber-800 ring-amber-200",
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  refunded: "Refunded",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function pickCustomer(row: BookingRow): CustomerRel {
  return Array.isArray(row.customers) ? row.customers[0] ?? null : row.customers;
}

export function pickManicuristName(row: BookingRow): string {
  const m = Array.isArray(row.manicurists) ? row.manicurists[0] : row.manicurists;
  if (!m) return "-";
  const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
  return profile?.full_name ?? "Unnamed manicurist";
}

function formatDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00`));
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function BookingsView({ bookings }: { bookings: BookingRow[] }) {
  const [statusFilter, setStatusFilter] = React.useState<BookingStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = React.useState<RecordSource | "all">("all");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");
  const [selected, setSelected] = React.useState<BookingRow | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (sourceFilter !== "all" && b.source !== sourceFilter) return false;
      if (dateFrom && b.booking_date < dateFrom) return false;
      if (dateTo && b.booking_date > dateTo) return false;
      return true;
    });
  }, [bookings, statusFilter, sourceFilter, dateFrom, dateTo]);

  const selectedFresh = React.useMemo(() => {
    if (!selected) return null;
    return bookings.find((b) => b.id === selected.id) ?? null;
  }, [bookings, selected]);

  function handleExport() {
    const rows = filtered.map((b) => {
      const cust = pickCustomer(b);
      return {
        booking_number: b.booking_number ?? "",
        booking_date: b.booking_date,
        booking_time: b.booking_time ?? "",
        customer: cust?.full_name ?? "",
        manicurist: pickManicuristName(b),
        items: b.booking_items?.length ?? 0,
        total: Number(b.total),
        status: b.status ?? "",
        payment_status: b.payment_status ?? "",
        source: b.source ?? "",
      };
    });
    exportToCSV(rows, `bookings-${todayISO()}.csv`, [
      { key: "booking_number", label: "Booking #" },
      { key: "booking_date", label: "Date" },
      { key: "booking_time", label: "Time" },
      { key: "customer", label: "Customer" },
      { key: "manicurist", label: "Manicurist" },
      { key: "items", label: "Items" },
      { key: "total", label: "Total" },
      { key: "status", label: "Status" },
      { key: "payment_status", label: "Payment" },
      { key: "source", label: "Source" },
    ]);
  }

  const columns: ColumnDef<BookingRow>[] = [
    {
      key: "booking_number",
      header: "Booking #",
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.booking_number ?? "-"}
        </span>
      ),
    },
    {
      key: "booking_date",
      header: "Date",
      cell: (row) => (
        <span>
          {formatDate(row.booking_date)}
          {row.booking_time ? (
            <span className="ml-1 text-xs text-muted-foreground">
              {row.booking_time.slice(0, 5)}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (row) => pickCustomer(row)?.full_name ?? "-",
    },
    {
      key: "manicurist",
      header: "Manicurist",
      cell: (row) => pickManicuristName(row),
    },
    {
      key: "items",
      header: "Items",
      cell: (row) => row.booking_items?.length ?? 0,
    },
    {
      key: "total",
      header: "Total",
      cell: (row) => (
        <span className="font-medium text-[#3D1A2A]">
          {formatMYR(Number(row.total))}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const status = (row.status ?? "pending") as BookingStatus;
        const s = STATUS_STYLES[status];
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${s.chip}`}
          >
            <span className={`size-1.5 rounded-full ${s.dot}`} />
            {STATUS_LABELS[status]}
          </span>
        );
      },
    },
    {
      key: "payment_status",
      header: "Payment",
      cell: (row) => {
        const payment = (row.payment_status ?? "unpaid") as PaymentStatus;
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${PAYMENT_STYLES[payment]}`}
          >
            {PAYMENT_LABELS[payment]}
          </span>
        );
      },
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

  const filtersActive =
    statusFilter !== "all" || sourceFilter !== "all" || !!dateFrom || !!dateTo;
  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (sourceFilter !== "all" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  return (
    <div className="space-y-6">
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
                Status
              </label>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as BookingStatus | "all")}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                  setStatusFilter("all");
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
        Showing {filtered.length} of {bookings.length} bookings
      </p>

      <DataTable<BookingRow>
        columns={columns}
        data={filtered}
        onRowClick={(row) => setSelected(row)}
        emptyMessage="No bookings match the current filters"
        mobileCard={(row) => {
          const status = (row.status ?? "pending") as BookingStatus;
          const payment = (row.payment_status ?? "unpaid") as PaymentStatus;
          const s = STATUS_STYLES[status];
          const cust = pickCustomer(row);
          return (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#5C2D48]/60">
                    {row.booking_number ?? "-"}
                  </p>
                  <p className="truncate font-semibold text-[#3D1A2A]">
                    {cust?.full_name ?? "-"}
                  </p>
                  <p className="text-xs text-[#5C2D48]/70">
                    {formatDate(row.booking_date)}
                    {row.booking_time ? ` · ${row.booking_time.slice(0, 5)}` : ""}
                  </p>
                </div>
                <span className="pmu-animated-gradient-text shrink-0 text-lg font-bold tracking-tight">
                  {formatMYR(Number(row.total))}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${s.chip}`}
                >
                  <span className={`size-1.5 rounded-full ${s.dot}`} />
                  {STATUS_LABELS[status]}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${PAYMENT_STYLES[payment]}`}
                >
                  {PAYMENT_LABELS[payment]}
                </span>
                {row.source && (
                  <span className="text-[10px] uppercase tracking-wider text-[#5C2D48]/60">
                    {row.source}
                  </span>
                )}
              </div>
            </div>
          );
        }}
      />

      <BookingDetailDialog
        booking={selectedFresh}
        open={selectedFresh != null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
