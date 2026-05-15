import { z } from "zod";

import type { Database } from "@/types/database.types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export const BOOKING_STATUSES: readonly BookingStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
];

export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  "unpaid",
  "paid",
  "refunded",
];

// Sequential forward transitions. Cancel is allowed from any non-terminal state
// and is handled as a separate action - it is NOT in this map.
const FORWARD_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed"],
  confirmed: ["in_progress"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
};

export function nextStatus(current: BookingStatus): BookingStatus | null {
  const [next] = FORWARD_TRANSITIONS[current];
  return next ?? null;
}

export function canCancel(current: BookingStatus): boolean {
  return current !== "completed" && current !== "cancelled";
}

export function isValidTransition(
  from: BookingStatus,
  to: BookingStatus,
): boolean {
  if (from === to) return false;
  if (to === "cancelled") return canCancel(from);
  return FORWARD_TRANSITIONS[from].includes(to);
}

export const bookingStatusTransitionSchema = z
  .object({
    booking_id: z.string().uuid("Invalid booking id"),
    from: z.enum([
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
    ]),
    to: z.enum([
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
    ]),
  })
  .refine((v) => isValidTransition(v.from, v.to), {
    message: "Invalid status transition",
    path: ["to"],
  });

export const paymentStatusSchema = z.object({
  booking_id: z.string().uuid("Invalid booking id"),
  payment_status: z.enum(["unpaid", "paid", "refunded"]),
});

export type BookingStatusTransitionInput = z.infer<
  typeof bookingStatusTransitionSchema
>;
export type PaymentStatusInput = z.infer<typeof paymentStatusSchema>;
