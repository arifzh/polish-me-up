import { z } from "zod";

const emptyToUndefined = z.literal("").transform(() => undefined);

const optionalString = z.string().trim().optional().or(emptyToUndefined);

export const MAX_ITEM_PHOTOS = 3;

export const itemSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  category: z.enum(["package", "addon"], {
    message: "Choose a category",
  }),
  description: optionalString,
  price: z.number().positive("Price must be greater than 0"),
  cost: z.number().min(0, "Cost cannot be negative"),
  stock: z
    .number()
    .int("Stock must be a whole number")
    .positive("Stock must be greater than 0")
    .nullable(),
  duration_min: z
    .number()
    .int("Duration must be a whole number")
    .positive("Duration must be greater than 0")
    .nullable(),
  is_active: z.boolean(),
  photo_urls: z
    .array(z.string().url("Each photo must be a valid URL"))
    .max(MAX_ITEM_PHOTOS, `Up to ${MAX_ITEM_PHOTOS} photos only`),
});

export type ItemInput = z.infer<typeof itemSchema>;
