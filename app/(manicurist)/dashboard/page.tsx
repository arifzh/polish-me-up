import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  DollarSign,
  Package,
  Star,
  UserPlus,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/manicurist/StatsCard";
import { PageHeader } from "@/components/manicurist/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { formatMYR } from "@/lib/utils/formatPrice";
import type { Database } from "@/types/database.types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

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

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function to12Hour(
  hhmm: string | null,
): { time: string; period: "AM" | "PM" | "" } {
  if (!hhmm) return { time: "TBD", period: "" };
  const [h, m] = hhmm.slice(0, 5).split(":");
  const hour = Number(h);
  const period: "AM" | "PM" = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return { time: `${display}:${m}`, period };
}

function monthBounds(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { start: toISODate(start), end: toISODate(end) };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const now = new Date();
  const { start: monthStart, end: monthEnd } = monthBounds(now);
  const today = toISODate(now);
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);
  const ninetyDaysAgoISO = toISODate(ninetyDaysAgo);

  const [
    customersRes,
    bookingsThisMonthRes,
    revenueRowsRes,
    topPackageRowsRes,
    todayBookingsRes,
    recentBookingsRes,
  ] = await Promise.all([
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("booking_date", monthStart)
      .lte("booking_date", monthEnd),
    supabase
      .from("bookings")
      .select("total")
      .eq("status", "completed")
      .gte("booking_date", monthStart)
      .lte("booking_date", monthEnd),
    supabase
      .from("booking_items")
      .select(
        "quantity, items!inner(name, category), bookings!inner(booking_date)",
      )
      .eq("items.category", "package")
      .gte("bookings.booking_date", ninetyDaysAgoISO),
    supabase
      .from("bookings")
      .select(
        "id, booking_number, booking_time, total, status, customers(full_name)",
      )
      .eq("booking_date", today)
      .order("booking_time", { ascending: true, nullsFirst: false }),
    supabase
      .from("bookings")
      .select(
        "id, booking_number, booking_date, total, status, customers(full_name), booking_items(id)",
      )
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const customersCount = customersRes.count ?? 0;
  const bookingsThisMonth = bookingsThisMonthRes.count ?? 0;
  const revenueThisMonth = (revenueRowsRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.total ?? 0),
    0,
  );

  type TopRow = {
    quantity: number;
    items: { name: string } | { name: string }[] | null;
  };
  const tally = new Map<string, number>();
  for (const r of (topPackageRowsRes.data ?? []) as TopRow[]) {
    const itemRel = Array.isArray(r.items) ? r.items[0] : r.items;
    const name = itemRel?.name;
    if (!name) continue;
    tally.set(name, (tally.get(name) ?? 0) + Number(r.quantity ?? 0));
  }
  let topPackageName = "-";
  let topPackageCount = 0;
  for (const [name, count] of tally) {
    if (count > topPackageCount) {
      topPackageName = name;
      topPackageCount = count;
    }
  }

  type TodayBooking = {
    id: string;
    booking_number: string | null;
    booking_time: string | null;
    total: number;
    status: BookingStatus | null;
    customers: { full_name: string } | { full_name: string }[] | null;
  };
  const todayBookings = (todayBookingsRes.data ?? []) as TodayBooking[];

  type RecentBooking = {
    id: string;
    booking_number: string | null;
    booking_date: string;
    total: number;
    status: BookingStatus | null;
    customers: { full_name: string } | { full_name: string }[] | null;
    booking_items: { id: string }[] | null;
  };
  const recentBookings = (recentBookingsRes.data ?? []) as RecentBooking[];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle={dateFormatter.format(now)}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatsCard
          label="Total Customers"
          value={customersCount}
          icon={Users}
          accent="violet"
        />
        <StatsCard
          label="Bookings This Month"
          value={bookingsThisMonth}
          icon={Calendar}
          accent="rose"
        />
        <StatsCard
          label="Revenue This Month"
          value={formatMYR(revenueThisMonth)}
          icon={DollarSign}
          accent="emerald"
        />
        <StatsCard
          label="Top Package"
          value={topPackageName}
          icon={Star}
          accent="amber"
          subtext={
            topPackageCount > 0
              ? `${topPackageCount} ${topPackageCount === 1 ? "booking" : "bookings"} (last 90 days)`
              : "Last 90 days"
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4 rounded-2xl border border-[#F8BBD0] bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:p-6">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white">
                <CalendarClock className="size-5" />
              </span>
              <h2 className="text-lg font-semibold text-[#3D1A2A]">
                Today&apos;s appointments
              </h2>
            </div>
            <span className="rounded-full bg-[#FFE4EC] px-2.5 py-0.5 text-xs font-medium text-[#BE185D]">
              {todayBookings.length}
            </span>
          </header>

          {todayBookings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#F8BBD0] bg-[#FFF5F8]/40 px-4 py-8 text-center">
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-white text-[#EC4899] shadow-sm">
                <CalendarClock className="size-5" />
              </span>
              <p className="text-sm font-medium text-[#3D1A2A]">
                No appointments today
              </p>
              <p className="max-w-xs text-xs text-[#5C2D48]/70">
                Enjoy the breather. New bookings will appear here as customers
                confirm.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {todayBookings.map((b) => {
                const cust = Array.isArray(b.customers)
                  ? b.customers[0]
                  : b.customers;
                const status = (b.status ?? "pending") as BookingStatus;
                const s = STATUS_STYLES[status];
                return (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F8BBD0]/60 bg-[#FFF5F8]/40 px-3 py-3 transition-colors hover:bg-[#FFF5F8] sm:flex-nowrap sm:gap-4 sm:px-4"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {(() => {
                        const t = to12Hour(b.booking_time);
                        return (
                          <div className="flex min-w-[56px] shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br from-[#EC4899] to-[#DB2777] px-2.5 py-1.5 text-white sm:min-w-[64px] sm:px-3">
                            <span className="text-sm font-bold leading-tight">
                              {t.time}
                            </span>
                            {t.period && (
                              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                                {t.period}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#3D1A2A]">
                          {cust?.full_name ?? "-"}
                        </p>
                        <p className="font-mono text-xs text-[#5C2D48]/60">
                          {b.booking_number ?? "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-sm font-semibold text-[#3D1A2A]">
                        {formatMYR(Number(b.total))}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 sm:px-2.5 sm:text-xs ${s.chip}`}
                      >
                        <span className={`size-1.5 rounded-full ${s.dot}`} />
                        {STATUS_LABELS[status]}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-4 rounded-2xl border border-[#F8BBD0] bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:p-6">
          <h2 className="text-lg font-semibold text-[#3D1A2A]">
            Quick actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              href="/customers/new"
              label="Add customer"
              icon={UserPlus}
            />
            <QuickAction href="/items/new" label="Add item" icon={Package} />
            <QuickAction
              href="/bookings"
              label="All bookings"
              icon={CalendarDays}
            />
            <QuickAction
              href="/availability"
              label="My schedule"
              icon={CalendarPlus}
            />
          </div>
        </section>
      </div>

      <section className="space-y-4 rounded-2xl border border-[#F8BBD0] bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:p-6">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#3D1A2A]">
            Recent bookings
          </h2>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-[#BE185D] hover:bg-[#FFE4EC] hover:text-[#BE185D]"
          >
            <Link href="/bookings">
              View all
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </header>

        {recentBookings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#F8BBD0] bg-[#FFF5F8]/40 px-4 py-8 text-center">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-white text-[#EC4899] shadow-sm">
              <CalendarDays className="size-5" />
            </span>
            <p className="text-sm font-medium text-[#3D1A2A]">No bookings yet</p>
            <p className="max-w-xs text-xs text-[#5C2D48]/70">
              When customers book, you&apos;ll see their appointments here.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <ul className="space-y-2 md:hidden">
              {recentBookings.map((b) => {
                const cust = Array.isArray(b.customers)
                  ? b.customers[0]
                  : b.customers;
                const itemsCount = b.booking_items?.length ?? 0;
                const status = (b.status ?? "pending") as BookingStatus;
                const s = STATUS_STYLES[status];
                return (
                  <li
                    key={b.id}
                    className="rounded-xl border border-[#F8BBD0]/60 bg-[#FFF5F8]/40 px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-[#5C2D48]/60">
                          {b.booking_number ?? "-"}
                        </p>
                        <p className="truncate font-medium text-[#3D1A2A]">
                          {cust?.full_name ?? "-"}
                        </p>
                        <p className="text-xs text-[#5C2D48]/70">
                          {dateFormatter.format(
                            new Date(`${b.booking_date}T00:00:00`),
                          )}
                          {" · "}
                          {itemsCount} {itemsCount === 1 ? "item" : "items"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-semibold text-[#3D1A2A]">
                          {formatMYR(Number(b.total))}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${s.chip}`}
                        >
                          <span className={`size-1.5 rounded-full ${s.dot}`} />
                          {STATUS_LABELS[status]}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border border-[#F8BBD0]/60 md:block">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-[#FFE4EC] to-[#FFD1DC] text-left text-[10px] font-bold uppercase tracking-wider text-[#BE185D]">
                <tr>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8BBD0]/40">
                {recentBookings.map((b) => {
                  const cust = Array.isArray(b.customers)
                    ? b.customers[0]
                    : b.customers;
                  const itemsCount = b.booking_items?.length ?? 0;
                  const status = (b.status ?? "pending") as BookingStatus;
                  const s = STATUS_STYLES[status];
                  return (
                    <tr
                      key={b.id}
                      className="text-[#3D1A2A] transition-colors hover:bg-[#FFF5F8]/40"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-[#5C2D48]/70">
                        {b.booking_number ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        {dateFormatter.format(
                          new Date(`${b.booking_date}T00:00:00`),
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {cust?.full_name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-[#5C2D48]">{itemsCount}</td>
                      <td className="px-4 py-3 font-semibold">
                        {formatMYR(Number(b.total))}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${s.chip}`}
                        >
                          <span className={`size-1.5 rounded-full ${s.dot}`} />
                          {STATUS_LABELS[status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function QuickAction({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-start gap-2 rounded-xl border border-[#F8BBD0]/60 bg-gradient-to-br from-[#FFF5F8] to-white p-4 transition-all hover:-translate-y-0.5 hover:border-[#F8BBD0] hover:shadow-md"
    >
      <span className="inline-flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white shadow-sm transition-transform group-hover:scale-110">
        <Icon className="size-4" />
      </span>
      <span className="text-sm font-medium text-[#3D1A2A]">{label}</span>
    </Link>
  );
}
