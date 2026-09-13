import { notFound } from "next/navigation";

import { VisualDashboardFixture } from "@/components/visual-dashboard-fixture";

export default function VisualDashboardPage() {
  // This route is test-only: it returns 404 in production while remaining
  // available to local visual QA regardless of shell env syntax.
  if (process.env.NODE_ENV === "production") notFound();
  return <VisualDashboardFixture />;
}
