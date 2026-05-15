"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImageDropzone } from "@/components/manicurist/ImageDropzone";
import { itemSchema, type ItemInput } from "@/lib/validations/item.schema";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

type Item = Tables<"items">;

export function EditItemForm({ item }: { item: Item }) {
  const router = useRouter();
  const supabase = createClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<ItemInput>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: item.name,
      category: item.category,
      description: item.description ?? "",
      price: Number(item.price),
      cost: Number(item.cost ?? 0),
      stock: item.stock ?? null,
      duration_min: item.duration_min ?? null,
      is_active: item.is_active ?? true,
      // Hydrate from photo_urls; fall back to the legacy single-photo
      // column so items created before the multi-image migration still
      // surface their image in the dropzone.
      photo_urls: (() => {
        const list = (item.photo_urls ?? []).filter(Boolean);
        if (list.length > 0) return list;
        return item.photo_url ? [item.photo_url] : [];
      })(),
    },
  });

  async function onSubmit(values: ItemInput) {
    setSubmitError(null);

    const { error } = await supabase
      .from("items")
      .update({
        name: values.name,
        category: values.category,
        description: values.description ?? null,
        price: values.price,
        cost: values.cost,
        stock: values.stock ?? null,
        duration_min: values.duration_min ?? null,
        is_active: values.is_active,
        photo_urls: values.photo_urls ?? [],
        photo_url: values.photo_urls?.[0] ?? null,
      })
      .eq("id", item.id);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    router.refresh();
    router.push("/items?updated=true");
  }

  async function handleDelete() {
    setDeleteError(null);
    setIsDeleting(true);

    const { error } = await supabase
      .from("items")
      .update({ is_active: false })
      .eq("id", item.id);

    setIsDeleting(false);

    if (error) {
      setDeleteError(error.message);
      return;
    }

    router.refresh();
    router.push("/items");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Link
          href="/items"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#EC4899]"
        >
          <ArrowLeft className="size-4" />
          Back to items
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-[#3D1A2A] sm:text-3xl">
          Edit Item
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Update the details of this {item.category === "package" ? "package" : "add-on"}.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5 rounded-xl border border-[#F8BBD0] bg-white p-4 sm:p-6"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="package">Package</SelectItem>
                    <SelectItem value="addon">Add-on</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="What's included?"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (MYR)</FormLabel>
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
                          e.target.value === "" ? 0 : Number(e.target.value),
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
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost (MYR)</FormLabel>
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
                          e.target.value === "" ? 0 : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Leave blank for services.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="duration_min"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (min)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="photo_urls"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Photos</FormLabel>
                <FormControl>
                  <ImageDropzone
                    value={field.value ?? []}
                    onChange={field.onChange}
                    max={3}
                  />
                </FormControl>
                <FormDescription>
                  Up to 3 images. The first photo is shown as the cover.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
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
                  Active (available for booking)
                </FormLabel>
              </FormItem>
            )}
          />

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="destructive" className="w-full sm:w-auto">
                  <Trash2 />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete this item?</DialogTitle>
                  <DialogDescription>
                    Are you sure? This cannot be undone. The item will be
                    marked inactive and hidden from new bookings, but past
                    booking history will be preserved.
                  </DialogDescription>
                </DialogHeader>
                {deleteError && (
                  <p className="text-sm text-destructive">{deleteError}</p>
                )}
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" type="button">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting…" : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <Button asChild variant="outline" type="button" className="w-full sm:w-auto">
                <Link href="/items">Cancel</Link>
              </Button>
              <Button
                type="submit"
                className="w-full bg-[#EC4899] text-white hover:bg-[#BE185D] sm:w-auto"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Saving…" : "Save item"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
