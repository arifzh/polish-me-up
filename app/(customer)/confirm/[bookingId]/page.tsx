import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CalendarCheck,
  CheckCircle,
  Clock,
  Hourglass,
  MapPin,
  User,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatMYR } from "@/lib/utils/formatPrice";

const LOCATION_LABELS: Record<string, string> = {
  home: "Home visit",
  booth: "At our booth",
  other: "Other",
};

export default async function ConfirmBookingPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      `
        id,
        booking_number,
        booking_date,
        booking_time,
        location_type,
        address,
        notes,
        subtotal,
        discount_amount,
        discount_type,
        total,
        status,
        customer_id,
        customers!inner(profile_id),
        manicurists(profiles(full_name)),
        booking_items(quantity, unit_price, subtotal, items(name))
      `,
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) notFound();

  type CustomerRel = { profile_id: string | null };
  const customerRel = (Array.isArray(booking.customers)
    ? booking.customers[0]
    : booking.customers) as CustomerRel | null;
  if (customerRel?.profile_id !== user.id) {
    notFound();
  }

  type ManicuristRel = {
    profiles: { full_name: string | null } | { full_name: string | null }[] | null;
  };
  const manicuristRel = (Array.isArray(booking.manicurists)
    ? booking.manicurists[0]
    : booking.manicurists) as ManicuristRel | null;
  const manicuristProfile = manicuristRel
    ? Array.isArray(manicuristRel.profiles)
      ? manicuristRel.profiles[0]
      : manicuristRel.profiles
    : null;
  const manicuristName = manicuristProfile?.full_name ?? "-";

  type LineRow = {
    quantity: number;
    unit_price: number;
    subtotal: number;
    items: { name: string } | { name: string }[] | null;
  };
  const lines = (booking.booking_items ?? []) as LineRow[];

  const dateLabel = new Date(`${booking.booking_date}T00:00:00`).toLocaleDateString(
    "en-GB",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );

  const status = booking.status ?? "pending";
  const banner =
    status === "confirmed" || status === "in_progress" || status === "completed"
      ? {
          icon: CheckCircle,
          tint: "text-emerald-600",
          chipBg: "bg-emerald-50 ring-emerald-200 text-emerald-700",
          title: "Your booking is scheduled",
          subtitle:
            "We've confirmed your appointment - see you soon. Save your booking number for reference.",
        }
      : status === "cancelled"
        ? {
            icon: XCircle,
            tint: "text-rose-600",
            chipBg: "bg-rose-50 ring-rose-200 text-rose-700",
            title: "Booking cancelled",
            subtitle: "This appointment was cancelled.",
          }
        : {
            icon: Hourglass,
            tint: "text-[#EC4899]",
            chipBg: "bg-amber-50 ring-amber-200 text-amber-700",
            title: "Booking sent to your manicurist for confirmation",
            subtitle:
              "Your manicurist will review and confirm the appointment shortly. We'll keep this page in sync.",
          };
  const BannerIcon = banner.icon;

  return (
    <div className="mx-auto max-w-2xl space-y-5 sm:space-y-6">
      <div className="rounded-2xl bg-white p-5 text-center ring-1 ring-[#F8BBD0] sm:p-8">
        <div
          className={`mx-auto inline-flex size-14 items-center justify-center rounded-full bg-[#FFF5F8] ${banner.tint}`}
        >
          <BannerIcon className="size-7" />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-[#3D1A2A] sm:text-2xl md:text-3xl">
          {banner.title}
        </h1>
        <p className="mt-2 text-sm text-[#5C2D48]/80">{banner.subtitle}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ${banner.chipBg}`}
          >
            Status: {status === "in_progress" ? "in progress" : status}
          </span>
          {booking.booking_number && (
            <span className="inline-block rounded-full bg-[#FFF5F8] px-4 py-1 font-mono text-sm font-semibold text-[#BE185D] ring-1 ring-[#F8BBD0]">
              {booking.booking_number}
            </span>
          )}
        </div>
        <div className="mt-6 flex justify-center">
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white shadow-md hover:from-[#DB2777] hover:to-[#BE185D]"
          >
            <Link href="/my-bookings">Go to my bookings</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-[#F8BBD0] bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-[#3D1A2A]">Appointment</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <CalendarCheck className="mt-0.5 size-4 text-[#EC4899]" />
            <div>
              <dt className="text-xs text-muted-foreground">Date</dt>
              <dd className="font-medium text-[#3D1A2A]">{dateLabel}</dd>
            </div>
          </div>
          {booking.booking_time && (
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 size-4 text-[#EC4899]" />
              <div>
                <dt className="text-xs text-muted-foreground">Time</dt>
                <dd className="font-medium text-[#3D1A2A]">
                  {booking.booking_time.slice(0, 5)}
                </dd>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <User className="mt-0.5 size-4 text-[#EC4899]" />
            <div>
              <dt className="text-xs text-muted-foreground">Manicurist</dt>
              <dd className="font-medium text-[#3D1A2A]">{manicuristName}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 text-[#EC4899]" />
            <div>
              <dt className="text-xs text-muted-foreground">Location</dt>
              <dd className="font-medium text-[#3D1A2A]">
                {LOCATION_LABELS[booking.location_type] ?? booking.location_type}
              </dd>
              {booking.address && (
                <p className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground">
                  {booking.address}
                </p>
              )}
            </div>
          </div>
        </dl>
        {booking.notes && (
          <div className="rounded-md bg-[#FFF5F8] p-3 text-sm text-[#3D1A2A]">
            <p className="text-xs text-muted-foreground">Notes</p>
            <p className="mt-1">{booking.notes}</p>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-[#F8BBD0] bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-[#3D1A2A]">Items</h2>
        <ul className="divide-y divide-[#F8BBD0]/60">
          {lines.map((line, idx) => {
            const itemRel = Array.isArray(line.items)
              ? line.items[0]
              : line.items;
            return (
              <li
                key={idx}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="text-[#3D1A2A]">
                  {itemRel?.name ?? "Item"}
                  {line.quantity > 1 && (
                    <span className="ml-2 text-muted-foreground">
                      × {line.quantity}
                    </span>
                  )}
                </span>
                <span className="font-medium text-[#3D1A2A]">
                  {formatMYR(Number(line.subtotal))}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="space-y-1.5 border-t border-[#F8BBD0] pt-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatMYR(Number(booking.subtotal))}</span>
          </div>
          {booking.discount_type === "student" &&
            Number(booking.discount_amount ?? 0) > 0 && (
              <div className="flex justify-between text-[#EC4899]">
                <span>Student discount</span>
                <span>−{formatMYR(Number(booking.discount_amount))}</span>
              </div>
            )}
          <div className="flex justify-between border-t border-[#F8BBD0] pt-2 text-base font-semibold text-[#3D1A2A]">
            <span>Total</span>
            <span>{formatMYR(Number(booking.total))}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/packages">Book another</Link>
        </Button>
        <Button
          asChild
          className="w-full bg-[#EC4899] text-white hover:bg-[#BE185D] sm:w-auto"
        >
          <Link href="/my-bookings">View all my bookings</Link>
        </Button>
      </div>
    </div>
  );
}
