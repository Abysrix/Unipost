import { z } from "zod";
import { platforms } from "@/config/platforms";

const platformIds = platforms.map((p) => p.id) as [string, ...string[]];

export const goalInputSchema = z.object({
  metric: z.enum(["followers", "reach", "posts", "engagement", "revenue"]),
  platform: z.enum(platformIds).nullable().optional(),
  target: z.number().positive("Target must be greater than 0"),
  endsAt: z.string().datetime({ offset: true }).nullable().optional(),
});
export type GoalInputParsed = z.infer<typeof goalInputSchema>;
