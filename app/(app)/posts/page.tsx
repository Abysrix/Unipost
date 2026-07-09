import type { Metadata } from "next";
import Link from "next/link";
import { FileText, PenSquare, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth/getUser";
import { listDrafts, listTrash } from "@/lib/db/posts";
import PageHeader from "@/components/dashboard/PageHeader";
import EmptyState from "@/components/dashboard/EmptyState";
import DraftCard from "@/components/studio/DraftCard";

export const metadata: Metadata = { title: "Posts · UniPost" };
export const dynamic = "force-dynamic";

export default async function PostsPage() {
  await requireUser();
  const [drafts, trash] = await Promise.all([listDrafts(), listTrash()]);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Posts"
        description="Your drafts and content library."
        icon={FileText}
        actions={
          <Link href="/create" data-cursor="pointer" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-black [background:linear-gradient(120deg,#22d3ee,#34d399,#facc15)] transition-shadow hover:shadow-[0_0_30px_rgba(45,212,191,0.3)]">
            <PenSquare size={15} /> New post
          </Link>
        }
      />

      {drafts.length === 0 ? (
        <EmptyState
          icon={PenSquare}
          title="No drafts yet"
          description="Start writing your first post — save it and pick it up anytime."
          primary={{ label: "Create post", href: "/create" }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drafts.map((d) => (
            <DraftCard key={d.id} post={d} />
          ))}
        </div>
      )}

      {trash.length > 0 && (
        <div className="mt-12">
          <div className="mb-4 flex items-center gap-2 text-white/45">
            <Trash2 size={15} />
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.15em]">Trash · {trash.length}</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trash.map((d) => (
              <DraftCard key={d.id} post={d} trashed />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
