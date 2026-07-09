import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { listPostsForModeration } from "@/lib/db/admin/moderation";
import ModerationPageClient from "@/components/admin/ModerationPageClient";

export const metadata: Metadata = { title: "Content Moderation · Admin · UniPost" };
export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  const posts = await listPostsForModeration({}, 200);

  return (
    <div>
      <PageHeader title="Content Moderation" description="Review flagged and recent posts across every creator." icon={ShieldAlert} />
      <ModerationPageClient initialPosts={posts} />
    </div>
  );
}
