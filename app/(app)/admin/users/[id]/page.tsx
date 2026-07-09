import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUserDetail } from "@/lib/db/admin/users";
import UserDetailPanel from "@/components/admin/UserDetailPanel";

export const metadata: Metadata = { title: "User · Admin · UniPost" };
export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const user = await getUserDetail(params.id);
  if (!user) notFound();

  return (
    <div>
      <Link href="/admin/users" className="mb-4 flex w-fit items-center gap-1.5 text-[13px] text-white/50 transition-colors hover:text-white/80">
        <ArrowLeft size={14} /> Back to users
      </Link>
      <UserDetailPanel user={user} />
    </div>
  );
}
