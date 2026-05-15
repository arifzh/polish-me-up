"use client";

import Link from "next/link";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/manicurist/DataTable";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database.types";

type Customer = Tables<"customers">;

const currency = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function SourceBadge({ source }: { source: Customer["source"] }) {
  const isSystem = source === "system";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        isSystem
          ? "bg-[#FFF5F8] text-[#EC4899] ring-1 ring-[#F8BBD0]"
          : "bg-muted text-muted-foreground ring-1 ring-border",
      )}
    >
      {isSystem ? "System" : "Manual"}
    </span>
  );
}

const columns: ColumnDef<Customer>[] = [
  {
    key: "full_name",
    header: "Name",
    cell: (row) => (
      <span className="font-medium text-[#3D1A2A]">{row.full_name}</span>
    ),
  },
  {
    key: "phone",
    header: "Phone",
    cell: (row) => row.phone ?? "-",
  },
  {
    key: "email",
    header: "Email",
    cell: (row) => row.email ?? "-",
  },
  {
    key: "total_visits",
    header: "Visits",
    cell: (row) => row.total_visits ?? 0,
  },
  {
    key: "total_spent",
    header: "Spent",
    cell: (row) => currency.format(Number(row.total_spent ?? 0)),
  },
  {
    key: "source",
    header: "Source",
    cell: (row) => <SourceBadge source={row.source} />,
  },
  {
    key: "created_at",
    header: "Added",
    cell: (row) =>
      row.created_at
        ? dateFormatter.format(new Date(row.created_at))
        : "-",
  },
];

export function CustomersTable({ customers }: { customers: Customer[] }) {
  return (
    <DataTable<Customer>
      columns={columns}
      data={customers}
      searchKey="full_name"
      searchPlaceholder="Search by name…"
      actions={(row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/customers/${row.id}`}>
            <Eye />
            View
          </Link>
        </Button>
      )}
      mobileCard={(row) => (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-[#3D1A2A]">
                {row.full_name}
              </p>
              {row.phone && (
                <p className="text-xs text-[#5C2D48]/70">{row.phone}</p>
              )}
              {row.email && (
                <p className="truncate text-xs text-[#5C2D48]/70">{row.email}</p>
              )}
            </div>
            <SourceBadge source={row.source} />
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-[#FFF5F8]/60 px-3 py-2 text-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C2D48]/70">
                Visits
              </p>
              <p className="text-sm font-semibold text-[#3D1A2A]">
                {row.total_visits ?? 0}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C2D48]/70">
                Spent
              </p>
              <p className="text-sm font-semibold text-[#3D1A2A]">
                {currency.format(Number(row.total_spent ?? 0))}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C2D48]/70">
                Added
              </p>
              <p className="text-sm font-semibold text-[#3D1A2A]">
                {row.created_at
                  ? dateFormatter.format(new Date(row.created_at))
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      )}
    />
  );
}
