import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/getUser";
import { getOwnProfile } from "@/lib/db/profiles";
import { getPost } from "@/lib/db/posts";
import CreateStudio from "@/components/studio/CreateStudio";

export const metadata: Metadata = { title: "Create · UniPost" };
export const dynamic = "force-dynamic";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = await requireUser();
  const id = typeof searchParams.id === "string" ? searchParams.id : undefined;
  
  // Fetch profile and initial post in parallel
  const [profile, initial] = await Promise.all([
    getOwnProfile(),
    id ? getPost(id) : Promise.resolve(null)
  ]);

  return (
    <CreateStudio
      initial={initial}
      userId={user.id}
      authorName={profile.display_name || user.email?.split("@")[0] || "Creator"}
    />
  );
}
