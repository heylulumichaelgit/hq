import { z } from "zod/v4";

export const todoSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
  due_date: z.string().optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assigned_to: z.enum(["Andrew", "Chrystalla", "Both"]).default("Both"),
});

export type TodoFormData = z.infer<typeof todoSchema>;
