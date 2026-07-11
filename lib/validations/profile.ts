import { z } from "zod";

export const profileUpdateSchema = z.object({
  display_name: z.string().trim().min(1, "Display name is required").max(80).optional(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,30}$/, "3-30 characters: letters, numbers, underscores only")
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  avatar_url: z.string().trim().url("Must be a valid URL").nullable().optional().or(z.literal("").transform(() => null)),
  bio: z.string().trim().max(280, "Bio must be 280 characters or fewer").nullable().optional().or(z.literal("").transform(() => null)),
  timezone: z.string().trim().min(1).optional(),
});
export type ProfileUpdateParsed = z.infer<typeof profileUpdateSchema>;
