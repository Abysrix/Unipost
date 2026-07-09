import type { Metadata } from "next";
import { Users } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { listUsers } from "@/lib/db/admin/users";
import UsersPageClient from "@/components/admin/UsersPageClient";

export const metadata: Metadata = { title: "Users · Admin · UniPost" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { users, total } = await listUsers({ perPage: 1000 });

  return (
    <div>
      <PageHeader title="Users" description={`${total} total — search, filter, and manage accounts.`} icon={Users} />
      <UsersPageClient initialUsers={users} total={total} />
    </div>
  );
}
