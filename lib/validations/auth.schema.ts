import { z } from "zod";

export const STUDENT_EMAIL_HINT =
  "Student discount requires an educational email.";

export function isEducationalEmail(email: string): boolean {
  const lower = email.trim().toLowerCase();
  if (!lower.includes("@")) return false;
  const domain = lower.split("@")[1] ?? "";
  return domain.includes("edu");
}

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(80, "Full name is too long")
      .regex(/^[\p{L}\s'.-]+$/u, "Use letters, spaces, apostrophes, dots or hyphens only"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long")
      .regex(/[A-Za-z]/, "Password must contain a letter")
      .regex(/\d/, "Password must contain a number"),
    phone: z
      .string()
      .trim()
      .min(7, "Phone number is too short")
      .max(20, "Phone number is too long")
      .regex(/^[+\d][\d\s-]+$/, "Use digits, spaces, dashes, and an optional +"),
    is_student: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.is_student && !isEducationalEmail(val.email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["is_student"],
        message: STUDENT_EMAIL_HINT,
      });
    }
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
