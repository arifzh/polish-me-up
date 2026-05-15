"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { exportToCSV } from "@/lib/utils/csvExport";
import type { Tables } from "@/types/database.types";

type Item = Tables<"items">;

const COLUMNS: { key: keyof Item; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "price", label: "Price" },
  { key: "cost", label: "Cost" },
  { key: "stock", label: "Stock" },
  { key: "is_active", label: "Active" },
  { key: "duration_min", label: "Duration (min)" },
  { key: "created_at", label: "Created At" },
];

export function ExportItemsButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setError(null);
    setPending(true);
    const supabase = createClient();
    const { data, error: fetchErr } = await supabase
      .from("items")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    setPending(false);
    if (fetchErr) {
      setError(fetchErr.message);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    exportToCSV<Item>(data ?? [], `items-${today}.csv`, COLUMNS);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="secondary"
        onClick={handleExport}
        disabled={pending}
        aria-label="Export items CSV"
      >
        <Download />
        <span className="hidden sm:inline">
          {pending ? "Exporting…" : "Export CSV"}
        </span>
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
