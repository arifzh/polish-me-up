import { BookingsView } from "@/components/manicurist/BookingsView";
import { PageHeader } from "@/components/manicurist/PageHeader";
import { createClient } from "@/lib/supabase/server";

export default async function BookingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id,
       booking_number,
       booking_date,
       booking_time,
       service_mode,
       location_type,
       address,
       address_lat,
       address_lng,
       notes,
       subtotal,
       discount_amount,
       discount_type,
       total,
       status,
       payment_status,
       source,
       customer_id,
       manicurist_id,
       created_at,
       customers ( id, full_name, email, phone ),
       manicurists ( id, profiles ( full_name ) ),
       booking_items (
         id,
         quantity,
         unit_price,
         subtotal,
         items ( id, name, cost )
       )`,
    )
    .order("booking_date", { ascending: false })
    .order("booking_time", { ascending: false, nullsFirst: false });

  const bookings = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        subtitle={`${bookings.length} ${bookings.length === 1 ? "booking" : "bookings"} on record`}
      />

      {error ? (
        <p className="text-sm text-destructive">
          Failed to load bookings: {error.message}
        </p>
      ) : (
        <BookingsView bookings={bookings} />
      )}
    </div>
  );
}
