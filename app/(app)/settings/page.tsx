import type { Metadata } from "next";
import { Settings } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import ComingSoonCard from "@/components/dashboard/ComingSoonCard";

export const metadata: Metadata = { title: "Settings · UniPost" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Settings" description="Profile and workspace preferences." icon={Settings} />
      <ComingSoonCard
        icon={Settings}
        eta="Later sprint"
        title="Profile settings are coming"
        description="Manage your profile and workspace preferences here. Looking to connect Instagram, YouTube, LinkedIn or X? Head to Integrations in the sidebar — that's live now."
      />
    </div>
  );
}
