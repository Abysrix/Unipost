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
    // Keyed on the post id so navigating between posts (e.g. Duplicate's
    // router.push to a new ?id=) forces a real remount — CreateStudio seeds
    // its editor state with useState(initial?.x) once; without this key,
    // switching posts on the same route instance leaves stale state (title,
    // content, and critically the internal id used by autosave) in place,
    // so subsequent edits can silently save to the wrong post.
    <CreateStudio
      key={initial?.id ?? "new"}
      initial={initial}
      userId={user.id}
      authorName={profile.display_name || user.email?.split("@")[0] || "Creator"}
    />
  );
}
