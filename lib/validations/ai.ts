import { z } from "zod";

// Server Actions and Route Handlers are network-callable directly — a
// TypeScript param type (like ActionInput) is compile-time only and enforces
// nothing at runtime. These caps exist to bound cost exposure on paid Gemini
// calls, not to police normal usage (limits are generous vs. real UI inputs).

export const chatMessageSchema = z.object({
  content: z.string().trim().min(1, "Message can't be empty.").max(8000, "Message is too long (max 8,000 characters)."),
});

export const actionInputSchema = z.object({
  text: z.string().max(8000).optional(),
  topic: z.string().max(500).optional(),
  platform: z.string().max(30).optional(),
  tone: z.string().max(100).optional(),
  language: z.string().max(50).optional(),
});

export const savePromptSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200, "Title is too long."),
  body: z.string().trim().min(1, "Prompt body is required.").max(8000, "Prompt is too long (max 8,000 characters)."),
  category: z.string().trim().min(1, "Category is required.").max(50),
});
