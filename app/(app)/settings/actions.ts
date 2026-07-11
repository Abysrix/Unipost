"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/getUser";
import { updateOwnProfile } from "@/lib/db/profiles";
import { profileUpdateSchema } from "@/lib/validations/profile";

export type ProfileFormState = { error?: string; message?: string } | undefined;

export async function updateProfileAction(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  await requireUser();

  const raw = {
    display_name: formData.get("display_name")?.toString() ?? "",
    username: formData.get("username")?.toString() ?? "",
    avatar_url: formData.get("avatar_url")?.toString() ?? "",
    bio: formData.get("bio")?.toString() ?? "",
    timezone: formData.get("timezone")?.toString() ?? "",
  };

  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateOwnProfile(parsed.data);
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { message: "Profile updated." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update profile." };
  }
}
