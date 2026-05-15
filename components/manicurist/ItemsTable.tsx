"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/manicurist/DataTable";
import { cn } from "@/lib/utils";
import { formatMYR } from "@/lib/utils/formatPrice";
import type { Tables } from "@/types/database.types";

type Item = Tables<"items">;

function CategoryBadge({ category }: { category: Item["category"] }) {
  const isPackage = category === "package";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        isPackage
          ? "bg-[#EC4899] text-white"
          : "bg-[#F8BBD0] text-[#BE185D] ring-1 ring-[#F8BBD0]",
      )}
    >
      {isPackage ? "Package" : "Add-on"}
    </span>
  );
}

function ActiveBadge({ isActive }: { isActive: boolean | null }) {
  const active = isActive !== false;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1",
        active
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-muted text-muted-foreground ring-border",
      )}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

const columns: ColumnDef<Item>[] = [
  {
    key: "name",
    header: "Name",
    cell: (row) => (
      <span className="font-medium text-[#3D1A2A]">{row.name}</span>
    ),
  },
  {
    key: "category",
    header: "Category",
    cell: (row) => <CategoryBadge category={row.category} />,
  },
  {
    key: "price",
    header: "Price",
    cell: (row) => formatMYR(Number(row.price ?? 0)),
  },
  {
    key: "cost",
    header: "Cost",
    cell: (row) => (
      <span className="text-muted-foreground">
        {formatMYR(Number(row.cost ?? 0))}
      </span>
    ),
  },
  {
    key: "margin",
    header: "Margin",
    cell: (row) =>
      formatMYR(Number(row.price ?? 0) - Number(row.cost ?? 0)),
  },
  {
    key: "stock",
    header: "Stock",
    cell: (row) => (row.stock == null ? "-" : row.stock),
  },
  {
    key: "duration_min",
    header: "Duration",
    cell: (row) =>
      row.duration_min == null ? "-" : `${row.duration_min} min`,
  },
  {
    key: "is_active",
    header: "Status",
    cell: (row) => <ActiveBadge isActive={row.is_active} />,
  },
];

export function ItemsTable({ items }: { items: Item[] }) {
  return (
    <DataTable<Item>
      columns={columns}
      data={items}
      searchKey="name"
      searchPlaceholder="Search by name…"
      actions={(row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/items/${row.id}/edit`}>
            <Pencil />
            Edit
          </Link>
        </Button>
      )}
      mobileCard={(row) => {
        const price = Number(row.price ?? 0);
        const cost = Number(row.cost ?? 0);
        return (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#3D1A2A]">
                  {row.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <CategoryBadge category={row.category} />
                  <ActiveBadge isActive={row.is_active} />
                </div>
              </div>
              <span className="pmu-animated-gradient-text shrink-0 text-lg font-bold tracking-tight">
                {formatMYR(price)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-[#FFF5F8]/60 px-3 py-2 text-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C2D48]/70">
                  Cost
                </p>
                <p className="text-xs font-semibold text-[#3D1A2A]">
                  {formatMYR(cost)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C2D48]/70">
                  Margin
                </p>
                <p className="text-xs font-semibold text-[#3D1A2A]">
                  {formatMYR(price - cost)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C2D48]/70">
                  Duration
                </p>
                <p className="text-xs font-semibold text-[#3D1A2A]">
                  {row.duration_min == null ? "-" : `${row.duration_min}m`}
                </p>
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
