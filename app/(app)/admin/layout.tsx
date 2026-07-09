import { requireUser } from "@/lib/auth/getUser";
import { isAdmin } from "@/lib/auth/role";
import { Unauthorized } from "@/components/dashboard/StateScreens";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";

/**
 * Role-gates every /admin/* route in one place (defense in depth alongside
 * each Server Action's own `guardAdmin()` check). Individual pages don't need
 * to re-check `isAdmin` themselves — this layout is the boundary.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!isAdmin(user)) return <Unauthorized />;

  return (
    <div className="mx-auto max-w-[1400px]">
      <AdminHeader />
      <div className="flex flex-col gap-5 lg:flex-row">
        <AdminSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
