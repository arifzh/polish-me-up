import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour) format");

const todayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const bookingItemInput = z.object({
  item_id: z.string().uuid("Invalid item id"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than 0"),
});

export const bookingSystemSchema = z
  .object({
    customer_id: z.string().uuid("Invalid customer id"),
    manicurist_id: z.string().uuid("Pick a manicurist"),
    booking_date: isoDate.refine((d) => d >= todayStr(), {
      message: "Date must be today or later",
    }),
    booking_time: hhmm,
    service_mode: z.enum(["mobile", "walkin"], {
      message: "Service mode is required",
    }),
    address: z.string().trim().optional(),
    address_lat: z.number().nullable().optional(),
    address_lng: z.number().nullable().optional(),
    notes: z.string().trim().optional(),
    is_student: z.boolean(),
    items: z
      .array(bookingItemInput)
      .min(1, "Add at least one item to your booking"),
  })
  .superRefine((val, ctx) => {
    if (val.service_mode === "mobile") {
      if (!val.address || val.address.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["address"],
          message: "Address is required for mobile bookings",
        });
      }
      if (val.address_lat == null || val.address_lng == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["address"],
          message: "Pin a location on the map first",
        });
      }
    }
  });

export type BookingSystemInput = z.infer<typeof bookingSystemSchema>;
export type BookingItemInput = z.infer<typeof bookingItemInput>;
