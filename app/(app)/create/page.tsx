import type { Metadata } from "next";
import { requireUser, displayName } from "@/lib/auth/getUser";
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
  // RLS returns null if the id isn't the caller's — falls back to a new draft.
  const initial = id ? await getPost(id) : null;

  return <CreateStudio initial={initial} userId={user.id} authorName={displayName(user)} />;
}
