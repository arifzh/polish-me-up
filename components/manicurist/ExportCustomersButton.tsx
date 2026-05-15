"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { exportToCSV } from "@/lib/utils/csvExport";
import type { Tables } from "@/types/database.types";

type Customer = Tables<"customers">;

const COLUMNS: { key: keyof Customer; label: string }[] = [
  { key: "full_name", label: "Full Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "total_visits", label: "Total Visits" },
  { key: "total_spent", label: "Total Spent" },
  { key: "source", label: "Source" },
  { key: "notes", label: "Notes" },
  { key: "created_at", label: "Created At" },
];

export function ExportCustomersButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setError(null);
    setPending(true);
    const supabase = createClient();
    const { data, error: fetchErr } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    setPending(false);
    if (fetchErr) {
      setError(fetchErr.message);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    exportToCSV<Customer>(data ?? [], `customers-${today}.csv`, COLUMNS);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="secondary"
        onClick={handleExport}
        disabled={pending}
        aria-label="Export customers CSV"
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
