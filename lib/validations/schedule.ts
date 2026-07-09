import { z } from "zod";
import { platforms } from "@/config/platforms";

const platformIds = platforms.map((p) => p.id) as [string, ...string[]];

/** Server-side validation for a schedule request. */
export const scheduleInputSchema = z.object({
  postId: z.string().uuid("A saved post is required."),
  platforms: z.array(z.enum(platformIds)).min(1, "Pick at least one platform.").max(6),
  scheduledTime: z.string().datetime({ offset: true, message: "Invalid schedule time." }),
  timezone: z.string().min(1).default("Asia/Kolkata"),
  priority: z.boolean().optional().default(false),
  durationMin: z.number().int().min(5).max(1440).optional().default(30),
});

export type ScheduleInputParsed = z.infer<typeof scheduleInputSchema>;

/** Validation for a reschedule (drag/drop or edit-time). */
export const rescheduleSchema = z.object({
  id: z.string().uuid(),
  scheduledTime: z.string().datetime({ offset: true, message: "Invalid schedule time." }),
  timezone: z.string().min(1).optional(),
  durationMin: z.number().int().min(5).max(1440).optional(),
});
