import type { Metadata } from "next";
import { NotFoundState } from "@/components/dashboard/StateScreens";

export const metadata: Metadata = { title: "Not found · UniPost" };

/** Global 404. */
export default function NotFound() {
  return <NotFoundState />;
}
