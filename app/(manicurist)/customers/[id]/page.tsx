import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

type Customer = Tables<"customers">;

const currency = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value: string | null) {
  if (!value) return "-";
  return dateFormatter.format(new Date(value));
}

function SourceBadge({ source }: { source: Customer["source"] }) {
  const isSystem = source === "system";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        isSystem
          ? "bg-[#FFF5F8] text-[#EC4899] ring-1 ring-[#F8BBD0]"
          : "bg-muted text-muted-foreground ring-1 ring-border",
      )}
    >
      {isSystem ? "System" : "Manual"}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-[#3D1A2A]">{children}</p>
    </div>
  );
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !customer) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#EC4899]"
        >
          <ArrowLeft className="size-4" />
          Back to customers
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="space-y-1">
              <CardTitle className="text-xl text-[#3D1A2A] sm:text-2xl">
                {customer.full_name}
              </CardTitle>
              <CardDescription>
                Added {formatDate(customer.created_at)}
              </CardDescription>
            </div>
            <div>
              <SourceBadge source={customer.source} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 sm:space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Field label="Phone">{customer.phone ?? "-"}</Field>
            <Field label="Email">{customer.email ?? "-"}</Field>
            <Field label="Student">
              {customer.is_student ? "Yes" : "No"}
            </Field>
            <Field label="Points balance">
              {customer.points_balance ?? 0}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <Field label="Total visits">{customer.total_visits ?? 0}</Field>
            <Field label="Total spent">
              {currency.format(Number(customer.total_spent ?? 0))}
            </Field>
            <Field label="First visit">
              {formatDate(customer.first_visit)}
            </Field>
            <Field label="Last visit">
              {formatDate(customer.last_visit)}
            </Field>
            <Field label="Profile linked">
              {customer.profile_id ? "Yes" : "No"}
            </Field>
          </div>

          {customer.notes && (
            <Field label="Notes">
              <span className="whitespace-pre-wrap">{customer.notes}</span>
            </Field>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
