import { notFound } from "next/navigation";

import { VisualConfirmDialogFixture } from "@/components/visual-confirm-dialog-fixture";

export default function VisualConfirmDialogPage() {
  // This route is test-only: it returns 404 in production while remaining
  // available to local visual QA regardless of shell env syntax.
  if (process.env.NODE_ENV === "production") notFound();
  return <VisualConfirmDialogFixture />;
}
