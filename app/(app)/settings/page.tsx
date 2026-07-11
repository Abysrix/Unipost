import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { requireUser } from "@/lib/auth/getUser";
import { getOwnProfile } from "@/lib/db/profiles";
import PageHeader from "@/components/dashboard/PageHeader";
import ProfileSettingsForm from "@/components/settings/ProfileSettingsForm";

export const metadata: Metadata = { title: "Settings · UniPost" };

export default async function SettingsPage() {
  await requireUser();
  const profile = await getOwnProfile();

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Settings" description="Profile and workspace preferences." icon={Settings} />
      <ProfileSettingsForm profile={profile} />
    </div>
  );
}
