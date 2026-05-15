import Link from "next/link";
import { CheckCircle2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ItemsTable } from "@/components/manicurist/ItemsTable";
import { ExportItemsButton } from "@/components/manicurist/ExportItemsButton";
import { PageHeader } from "@/components/manicurist/PageHeader";
import { createClient } from "@/lib/supabase/server";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; updated?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  const items = data ?? [];
  const packageCount = items.filter((i) => i.category === "package").length;
  const addonCount = items.filter((i) => i.category === "addon").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Items"
        subtitle={`${packageCount} ${packageCount === 1 ? "package" : "packages"}, ${addonCount} ${addonCount === 1 ? "add-on" : "add-ons"}`}
        actions={
          <>
            <ExportItemsButton />
            <Button
              asChild
              className="bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white shadow-md hover:from-[#DB2777] hover:to-[#BE185D]"
            >
              <Link href="/items/new" aria-label="Add item">
                <Plus />
                <span className="hidden sm:inline">Add Item</span>
                <span className="sm:hidden">Add</span>
              </Link>
            </Button>
          </>
        }
      />

      {params.added === "true" && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" />
          Item added successfully.
        </div>
      )}

      {params.updated === "true" && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" />
          Item updated successfully.
        </div>
      )}

      {error ? (
        <p className="text-sm text-destructive">
          Failed to load items: {error.message}
        </p>
      ) : (
        <ItemsTable items={items} />
      )}
    </div>
  );
}
