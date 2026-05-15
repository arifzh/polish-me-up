import { SalesView } from "@/components/manicurist/SalesView";
import { PageHeader } from "@/components/manicurist/PageHeader";
import { createClient } from "@/lib/supabase/server";

export default async function SalesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select(
      `id,
       date,
       gross_sales,
       refunds,
       discounts,
       net_sales,
       cost_of_goods,
       gross_profit,
       source,
       booking_id,
       bookings ( id, booking_number )`,
    )
    .order("date", { ascending: false });

  const sales = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        subtitle={`${sales.length} ${sales.length === 1 ? "sale" : "sales"} on record`}
      />

      {error ? (
        <p className="text-sm text-destructive">
          Failed to load sales: {error.message}
        </p>
      ) : (
        <SalesView sales={sales} />
      )}
    </div>
  );
}
