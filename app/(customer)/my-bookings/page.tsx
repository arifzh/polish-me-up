import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarCheck,
  CalendarDays,
  Clock,
  History,
  MapPin,
  Sparkle,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CancelBookingButton } from "@/components/customer/CancelBookingButton";
import { createClient } from "@/lib/supabase/server";
import { formatMYR } from "@/lib/utils/formatPrice";
import type { Database } from "@/types/database.types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const LOCATION_LABELS: Record<string, string> = {
  home: "Home",
  booth: "Booth",
  other: "Other",
};

const STATUS_STYLES: Record<
  BookingStatus,
  { dot: string; chip: string; stripe: string }
> = {
  pending: {
    dot: "bg-amber-400",
    chip: "bg-amber-50 text-amber-700 ring-amber-200",
    stripe: "from-amber-400 to-amber-300",
  },
  confirmed: {
    dot: "bg-[#EC4899]",
    chip: "bg-[#FFF5F8] text-[#BE185D] ring-[#F8BBD0]",
    stripe: "from-[#EC4899] to-[#DB2777]",
  },
  in_progress: {
    dot: "bg-violet-500",
    chip: "bg-violet-50 text-violet-700 ring-violet-200",
    stripe: "from-violet-500 to-violet-400",
  },
  completed: {
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    stripe: "from-emerald-500 to-emerald-400",
  },
  cancelled: {
    dot: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 ring-rose-200",
    stripe: "from-rose-500 to-rose-400",
  },
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Booking = {
  id: string;
  booking_number: string | null;
  booking_date: string;
  booking_time: string | null;
  location_type: Database["public"]["Enums"]["location_type"];
  total: number;
  status: BookingStatus | null;
  manicurists: unknown;
  booking_items: unknown;
};

function manicuristName(b: Booking): string {
  type ManicuristRel = {
    profiles:
      | { full_name: string | null }
      | { full_name: string | null }[]
      | null;
  };
  const mRel = (Array.isArray(b.manicurists)
    ? b.manicurists[0]
    : b.manicurists) as ManicuristRel | null;
  const mProfile = mRel
    ? Array.isArray(mRel.profiles)
      ? mRel.profiles[0]
      : mRel.profiles
    : null;
  return mProfile?.full_name ?? "Unassigned";
}

function lineItems(b: Booking) {
  type LineRow = {
    quantity: number;
    items: { name: string } | { name: string }[] | null;
  };
  return (b.booking_items ?? []) as LineRow[];
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.slice(0, 5).split(":");
  const hr = Number(h);
  const period = hr >= 12 ? "PM" : "AM";
  const hour12 = hr % 12 === 0 ? 12 : hr % 12;
  return `${hour12}:${m} ${period}`;
}

function BookingCard({ b, faded = false }: { b: Booking; faded?: boolean }) {
  const date = new Date(`${b.booking_date}T00:00:00`);
  const weekday = date
    .toLocaleDateString("en-GB", { weekday: "short" })
    .toUpperCase();
  const day = date.getDate();
  const month = date
    .toLocaleDateString("en-GB", { month: "short" })
    .toUpperCase();

  const status = (b.status ?? "pending") as BookingStatus;
  const s = STATUS_STYLES[status];
  const lines = lineItems(b);

  return (
    <li
      className={`group relative flex overflow-hidden rounded-2xl border border-[#F8BBD0] bg-white/95 shadow-[0_4px_18px_-12px_rgba(236,72,153,0.35)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-14px_rgba(236,72,153,0.45)] ${
        faded ? "opacity-90" : ""
      }`}
    >
      {/* Left status-coloured stripe */}
      <div
        className={`w-1.5 shrink-0 bg-gradient-to-b ${s.stripe}`}
        aria-hidden
      />

      <div className="flex flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-stretch sm:p-5">
        {/* Date column */}
        <div className="flex shrink-0 items-baseline gap-2 sm:flex-col sm:items-center sm:justify-center sm:gap-0 sm:border-r sm:border-[#F8BBD0]/60 sm:pr-5">
          <span className="text-[10px] font-semibold tracking-widest text-[#BE185D] uppercase">
            {weekday}
          </span>
          <span className="pmu-animated-gradient-text text-2xl font-bold tracking-tight sm:text-4xl">
            {day}
          </span>
          <span className="text-[10px] font-semibold tracking-widest text-[#5C2D48]/70 uppercase">
            {month}
          </span>
        </div>

        {/* Details */}
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-0.5">
              {b.booking_number && (
                <p className="font-mono text-[10px] tracking-wider text-[#5C2D48]/60 uppercase">
                  {b.booking_number}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#3D1A2A]">
                {b.booking_time && (
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Clock className="size-4 text-[#EC4899]" />
                    {formatTime(b.booking_time)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <User className="size-4 text-[#EC4899]" />
                  {manicuristName(b)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 text-[#EC4899]" />
                  {LOCATION_LABELS[b.location_type] ?? b.location_type}
                </span>
              </div>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${s.chip}`}
            >
              <span className={`size-1.5 rounded-full ${s.dot}`} />
              {STATUS_LABELS[status]}
            </span>
          </div>

          {lines.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {lines.map((line, i) => {
                const itemRel = Array.isArray(line.items)
                  ? line.items[0]
                  : line.items;
                return (
                  <li
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-[#FFF5F8] px-2.5 py-0.5 text-[11px] font-medium text-[#5C2D48]"
                  >
                    <Sparkle className="size-3 text-[#EC4899]" />
                    {itemRel?.name ?? "Item"}
                    {line.quantity > 1 ? ` × ${line.quantity}` : ""}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#F8BBD0]/60 pt-3">
            <div className="leading-tight">
              <p className="text-[10px] font-semibold tracking-widest text-[#5C2D48]/70 uppercase">
                Total
              </p>
              <p className="pmu-animated-gradient-text text-lg font-bold">
                {formatMYR(Number(b.total))}
              </p>
            </div>
            {(status === "pending" || status === "confirmed") && (
              <CancelBookingButton bookingId={b.id} />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export default async function MyBookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const bookings = customer
    ? ((
        await supabase
          .from("bookings")
          .select(
            `
              id,
              booking_number,
              booking_date,
              booking_time,
              location_type,
              total,
              status,
              manicurists(profiles(full_name)),
              booking_items(quantity, items(name))
            `,
          )
          .eq("customer_id", customer.id)
          .order("booking_date", { ascending: false })
          .order("booking_time", { ascending: false, nullsFirst: false })
      ).data ?? [])
    : [];

  if (!customer || bookings.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-[#F8BBD0] bg-gradient-to-br from-white to-[#FFE4EC]/60 p-10 text-center shadow-[0_10px_30px_-15px_rgba(236,72,153,0.35)]">
        <div className="pmu-float-soft mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white shadow-md">
          <CalendarCheck className="size-7" />
        </div>
        <h1 className="text-xl font-bold text-[#3D1A2A]">No bookings yet</h1>
        <p className="text-sm text-[#5C2D48]/75">
          Treat yourself - browse our packages and book your first appointment.
        </p>
        <Button
          asChild
          size="lg"
          className="rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] px-6 text-white shadow-md hover:from-[#DB2777] hover:to-[#BE185D] hover:shadow-lg"
        >
          <Link href="/order/start">Start an order</Link>
        </Button>
      </div>
    );
  }

  const today = todayISO();
  const scheduled = (bookings as Booking[])
    .filter((b) => b.booking_date >= today)
    .sort((a, b) =>
      a.booking_date === b.booking_date
        ? (a.booking_time ?? "").localeCompare(b.booking_time ?? "")
        : a.booking_date.localeCompare(b.booking_date),
    );
  const history = (bookings as Booking[]).filter(
    (b) => b.booking_date < today,
  );

  const nextUp = scheduled[0];

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <header className="space-y-2 sm:space-y-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
          My <span className="pmu-animated-gradient-text">bookings</span>
        </h1>
        <p className="text-sm text-[#5C2D48]/75 sm:text-base">
          Upcoming appointments and past visits in one place.
        </p>
        {nextUp && (
          <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#F8BBD0] bg-white px-3 py-1.5 text-xs text-[#3D1A2A] shadow-sm">
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white">
              <Sparkle className="size-3" />
            </span>
            <span>
              Next up:{" "}
              <span className="font-semibold">
                {new Date(`${nextUp.booking_date}T00:00:00`).toLocaleDateString(
                  "en-GB",
                  { weekday: "short", day: "numeric", month: "short" },
                )}
              </span>
              {nextUp.booking_time && (
                <>
                  {" · "}
                  <span className="font-semibold">
                    {formatTime(nextUp.booking_time)}
                  </span>
                </>
              )}
            </span>
          </div>
        )}
      </header>

      {/* Scheduled */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-[#F8BBD0]/60 pb-2">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-[#3D1A2A] sm:text-xl">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white shadow-sm">
              <CalendarDays className="size-4" />
            </span>
            Scheduled
          </h2>
          <span className="rounded-full bg-gradient-to-r from-[#FFE4EC] to-[#FFD1DC] px-3 py-1 text-xs font-semibold text-[#BE185D]">
            {scheduled.length} upcoming
          </span>
        </div>
        {scheduled.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#F8BBD0] bg-white/60 p-8 text-center">
            <p className="text-sm text-[#5C2D48]/70">
              No upcoming appointments. Book a new one any time.
            </p>
            <Button
              asChild
              size="sm"
              className="mt-3 rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white shadow-md hover:from-[#DB2777] hover:to-[#BE185D]"
            >
              <Link href="/order/start">Book again</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {scheduled.map((b) => (
              <BookingCard key={b.id} b={b} />
            ))}
          </ul>
        )}
      </section>

      {/* History */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-[#F8BBD0]/60 pb-2">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-[#3D1A2A] sm:text-xl">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#5C2D48] to-[#3D1A2A] text-white shadow-sm">
              <History className="size-4" />
            </span>
            History
          </h2>
          <span className="rounded-full bg-[#FFF5F8] px-3 py-1 text-xs font-semibold text-[#5C2D48]">
            {history.length} past
          </span>
        </div>
        {history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#F8BBD0] bg-white/60 p-8 text-center text-sm text-[#5C2D48]/70">
            No past appointments yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {history.map((b) => (
              <BookingCard key={b.id} b={b} faded />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
