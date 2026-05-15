import Link from "next/link";
import { CheckCircle2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CustomersTable } from "@/components/manicurist/CustomersTable";
import { ExportCustomersButton } from "@/components/manicurist/ExportCustomersButton";
import { PageHeader } from "@/components/manicurist/PageHeader";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  const customers = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} ${customers.length === 1 ? "record" : "records"}`}
        actions={
          <>
            <ExportCustomersButton />
            <Button
              asChild
              className="bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white shadow-md hover:from-[#DB2777] hover:to-[#BE185D]"
            >
              <Link href="/customers/new" aria-label="Add customer">
                <UserPlus />
                <span className="hidden sm:inline">Add Customer</span>
                <span className="sm:hidden">Add</span>
              </Link>
            </Button>
          </>
        }
      />

      {params.added === "true" && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" />
          Customer added successfully.
        </div>
      )}

      {error ? (
        <p className="text-sm text-destructive">
          Failed to load customers: {error.message}
        </p>
      ) : (
        <CustomersTable customers={customers} />
      )}
    </div>
  );
}
