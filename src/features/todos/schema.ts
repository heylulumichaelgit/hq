import { z } from "zod/v4";

export const todoSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
  due_date: z.string().optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assigned_to: z
    .enum(["Andrew", "Chrystalla", "Both", "Lulu"])
    .default("Both"),
  section: z.string().max(100).optional().or(z.literal("")),
  parent_id: z.string().uuid().optional().nullable(),
});

export type TodoFormData = z.infer<typeof todoSchema>;

export const quickAddSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
});

export type QuickAddFormData = z.infer<typeof quickAddSchema>;
