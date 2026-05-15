"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CreditCard,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  User,
  X,
} from "lucide-react";

import { MiniMap } from "@/components/manicurist/MiniMap";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  transitionBookingStatus,
  setPaymentStatus,
} from "@/app/(manicurist)/bookings/actions";
import {
  canCancel,
  nextStatus,
} from "@/lib/validations/bookingStatus.schema";
import { formatMYR } from "@/lib/utils/formatPrice";
import type { Database } from "@/types/database.types";
import type { BookingRow } from "@/components/manicurist/BookingsView";
import {
  pickCustomer,
  pickManicuristName,
} from "@/components/manicurist/BookingsView";

type BookingStatus = Database["public"]["Enums"]["booking_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const LOCATION_LABELS: Record<
  Database["public"]["Enums"]["location_type"],
  string
> = {
  home: "Home visit",
  booth: "At the booth",
  other: "Other",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

type DetailLine = {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  name: string;
};

function normalizeLines(booking: BookingRow): DetailLine[] {
  return (booking.booking_items ?? []).map((line) => {
    const itemRel = Array.isArray(line.items) ? line.items[0] : line.items;
    return {
      id: line.id,
      quantity: Number(line.quantity ?? 0),
      unit_price: Number(line.unit_price ?? 0),
      subtotal: Number(line.subtotal ?? 0),
      name: itemRel?.name ?? "Unknown item",
    };
  });
}

export function BookingDetailDialog({
  booking,
  open,
  onOpenChange,
}: {
  booking: BookingRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [trackedId, setTrackedId] = React.useState<string | null>(
    booking?.id ?? null,
  );

  // Reset the inline error when the dialog opens a different booking.
  if (booking && booking.id !== trackedId) {
    setTrackedId(booking.id);
    setError(null);
  }

  if (!booking) return null;

  const status = (booking.status ?? "pending") as BookingStatus;
  const payment = (booking.payment_status ?? "unpaid") as PaymentStatus;
  const customer = pickCustomer(booking);
  const manicuristName = pickManicuristName(booking);
  const lines = normalizeLines(booking);
  const next = nextStatus(status);

  const hasCoords =
    booking.address_lat != null &&
    booking.address_lng != null &&
    !Number.isNaN(Number(booking.address_lat)) &&
    !Number.isNaN(Number(booking.address_lng));
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const googleMapsHref = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${booking.address_lat},${booking.address_lng}`
    : booking.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.address)}`
      : "";

  async function advance() {
    if (!next || !booking) return;
    setError(null);
    setPending(true);
    const result = await transitionBookingStatus({
      booking_id: booking.id,
      from: status,
      to: next,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function cancel() {
    if (!booking) return;
    setError(null);
    setPending(true);
    const result = await transitionBookingStatus({
      booking_id: booking.id,
      from: status,
      to: "cancelled",
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function changePayment(value: PaymentStatus) {
    if (!booking) return;
    setError(null);
    setPending(true);
    const result = await setPaymentStatus({
      booking_id: booking.id,
      payment_status: value,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-base">
            Booking{" "}
            <span className="font-mono text-muted-foreground">
              {booking.booking_number ?? booking.id.slice(0, 8)}
            </span>
          </DialogTitle>
          <DialogDescription>
            {dateFormatter.format(new Date(`${booking.booking_date}T00:00:00`))}
            {booking.booking_time ? ` · ${booking.booking_time.slice(0, 5)}` : ""}
            {" · "}
            {STATUS_LABELS[status]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="space-y-2 rounded-xl border border-[#F8BBD0] bg-[#FFF5F8]/60 p-4">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#BE185D]">
                <User className="size-3.5" />
                Customer
              </h3>
              <p className="font-medium text-[#3D1A2A]">
                {customer?.full_name ?? "-"}
              </p>
              {customer?.email && (
                <p className="flex items-center gap-1.5 text-xs text-[#5C2D48]/70">
                  <Mail className="size-3" />
                  {customer.email}
                </p>
              )}
              {customer?.phone && (
                <p className="flex items-center gap-1.5 text-xs text-[#5C2D48]/70">
                  <Phone className="size-3" />
                  {customer.phone}
                </p>
              )}
            </section>

            <section className="space-y-2 rounded-xl border border-[#F8BBD0] bg-[#FFF5F8]/60 p-4">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#BE185D]">
                <User className="size-3.5" />
                Manicurist
              </h3>
              <p className="font-medium text-[#3D1A2A]">{manicuristName}</p>
              <h3 className="flex items-center gap-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-[#BE185D]">
                <MapPin className="size-3.5" />
                Location
              </h3>
              <p className="text-sm text-[#3D1A2A]">
                {LOCATION_LABELS[booking.location_type]}
              </p>
              {booking.address && (
                <p className="whitespace-pre-line text-xs text-[#5C2D48]/70">
                  {booking.address}
                </p>
              )}
              {hasCoords && (
                <a
                  href={googleMapsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#BE185D] hover:underline"
                >
                  Open in Google Maps
                  <ExternalLink className="size-3" />
                </a>
              )}
            </section>
          </div>

          {hasCoords && mapboxToken && (
            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#5C2D48]">
                <MapPin className="size-3.5 text-[#EC4899]" />
                Service location
              </h3>
              <MiniMap
                lat={Number(booking.address_lat)}
                lng={Number(booking.address_lng)}
                token={mapboxToken}
              />
              <p className="text-[11px] text-[#5C2D48]/60">
                {Number(booking.address_lat).toFixed(5)},{" "}
                {Number(booking.address_lng).toFixed(5)}
              </p>
            </section>
          )}

          {booking.notes && (
            <section className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Notes
              </h3>
              <p className="text-sm text-[#3D1A2A]">{booking.notes}</p>
            </section>
          )}

          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#5C2D48]">
              Line items
            </h3>

            {/* Mobile: card list */}
            <ul className="space-y-2 sm:hidden">
              {lines.length === 0 ? (
                <li className="rounded-xl border border-dashed border-[#F8BBD0] bg-[#FFF5F8]/40 px-4 py-4 text-center text-xs text-[#5C2D48]/70">
                  No line items
                </li>
              ) : (
                lines.map((line) => (
                  <li
                    key={line.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-[#F8BBD0]/60 bg-[#FFF5F8]/60 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#3D1A2A]">
                        {line.name}
                      </p>
                      <p className="text-[11px] text-[#5C2D48]/70">
                        {formatMYR(line.unit_price)} × {line.quantity}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-[#3D1A2A]">
                      {formatMYR(line.subtotal)}
                    </span>
                  </li>
                ))
              )}
            </ul>

            {/* Desktop: table */}
            <div className="hidden overflow-hidden rounded-xl border border-[#F8BBD0] sm:block">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-[#FFE4EC] to-[#FFD1DC] text-left text-[10px] font-bold uppercase tracking-wider text-[#BE185D]">
                  <tr>
                    <th className="px-4 py-2.5">Item</th>
                    <th className="px-4 py-2.5">Qty</th>
                    <th className="px-4 py-2.5">Unit price</th>
                    <th className="px-4 py-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-5 text-center text-xs text-[#5C2D48]/70"
                      >
                        No line items
                      </td>
                    </tr>
                  ) : (
                    lines.map((line) => (
                      <tr
                        key={line.id}
                        className="border-t border-[#F8BBD0]/40 text-[#3D1A2A] transition-colors hover:bg-[#FFF5F8]/50"
                      >
                        <td className="px-4 py-2.5">{line.name}</td>
                        <td className="px-4 py-2.5">{line.quantity}</td>
                        <td className="px-4 py-2.5">
                          {formatMYR(line.unit_price)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium">
                          {formatMYR(line.subtotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5 rounded-xl border border-[#F8BBD0] bg-white/90 p-4 text-sm backdrop-blur-sm">
              <div className="flex justify-between text-[#5C2D48]/80">
                <span>Subtotal</span>
                <span>{formatMYR(Number(booking.subtotal ?? 0))}</span>
              </div>
              {Number(booking.discount_amount ?? 0) > 0 && (
                <div className="flex justify-between text-[#BE185D]">
                  <span>
                    Discount{" "}
                    {booking.discount_type && booking.discount_type !== "none"
                      ? `(${booking.discount_type})`
                      : ""}
                  </span>
                  <span>−{formatMYR(Number(booking.discount_amount))}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#F8BBD0] pt-2 font-semibold text-[#3D1A2A]">
                <span>Total</span>
                <span className="text-base">
                  {formatMYR(Number(booking.total ?? 0))}
                </span>
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-[#F8BBD0] bg-white/90 p-4 backdrop-blur-sm">
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#BE185D]">
              <CreditCard className="size-3.5" />
              Payment
            </h3>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Select
                value={payment}
                onValueChange={(v) => changePayment(v as PaymentStatus)}
                disabled={pending}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-[#5C2D48]/70">
                Current: <span className="font-medium text-[#3D1A2A]">{payment}</span>
              </span>
            </div>
          </section>

          {error && (
            <p className="rounded-md bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="!flex !flex-col-reverse gap-2 sm:!flex-row sm:!justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={cancel}
            disabled={pending || !canCancel(status)}
            className="w-full sm:w-auto"
          >
            <X />
            Cancel booking
          </Button>
          <Button
            type="button"
            onClick={advance}
            disabled={pending || !next}
            className="w-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white shadow-md hover:from-[#DB2777] hover:to-[#BE185D] sm:w-auto"
          >
            <ArrowRight />
            {next
              ? `Advance to ${STATUS_LABELS[next]}`
              : status === "completed"
                ? "Already completed"
                : "No further transitions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
