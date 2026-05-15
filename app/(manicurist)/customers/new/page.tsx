"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  customerManualSchema,
  type CustomerManualInput,
} from "@/lib/validations/customer.schema";
import { createClient } from "@/lib/supabase/client";

export default function NewCustomerPage() {
  const router = useRouter();
  const supabase = createClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CustomerManualInput>({
    resolver: zodResolver(customerManualSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      email: "",
      is_student: false,
      notes: "",
      first_visit: "",
      total_visits: 0,
      total_spent: 0,
    },
  });

  async function onSubmit(values: CustomerManualInput) {
    setSubmitError(null);

    const { error } = await supabase.from("customers").insert({
      full_name: values.full_name,
      phone: values.phone ?? null,
      email: values.email ?? null,
      is_student: values.is_student ?? false,
      notes: values.notes ?? null,
      first_visit: values.first_visit ?? null,
      total_visits: values.total_visits ?? 0,
      total_spent: values.total_spent ?? 0,
      source: "manual",
      profile_id: null,
    });

    if (error) {
      setSubmitError(error.message);
      return;
    }

    router.refresh();
    router.push("/customers?added=true");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#EC4899]"
        >
          <ArrowLeft className="size-4" />
          Back to customers
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-[#3D1A2A] sm:text-3xl">
          Add Customer
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Backfill a record from past visits or walk-ins.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5 rounded-xl border border-[#F8BBD0] bg-white p-4 sm:p-6"
        >
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="is_student"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-5 w-5 rounded border-input accent-[#EC4899] md:h-4 md:w-4"
                  />
                </FormControl>
                <FormLabel className="!mt-0 font-normal">
                  Student (eligible for student discount)
                </FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Allergies, preferences, etc."
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="first_visit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First visit</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="total_visits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total visits</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? 0
                            : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="total_spent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total spent</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? 0
                            : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button asChild variant="outline" type="button" className="w-full sm:w-auto">
              <Link href="/customers">Cancel</Link>
            </Button>
            <Button
              type="submit"
              className="w-full bg-[#EC4899] text-white hover:bg-[#BE185D] sm:w-auto"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Saving…" : "Save customer"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
