import { z } from "zod";

export const familyEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
  start_date: z.string().min(1, "Start date is required"),
  start_time: z.string().optional(),
  end_date: z.string().min(1, "End date is required"),
  end_time: z.string().optional(),
  all_day: z.boolean().default(false),
  create_busy_events: z.boolean().default(true),
}).refine(
  (data) => {
    if (data.start_date > data.end_date) return false;
    if (data.start_date === data.end_date && !data.all_day) {
      const start = data.start_time ?? "00:00";
      const end = data.end_time ?? "23:59";
      return end > start;
    }
    return true;
  },
  { message: "End must be after start", path: ["end_date"] }
);

export type FamilyEventFormData = z.infer<typeof familyEventSchema>;
