import { notFound } from "next/navigation";
import { VisualAiToolsFixture } from "@/components/visual-ai-tools-fixture";

export default function VisualAiToolsPage() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VISUAL_TEST_MODE !== "1"
  )
    notFound();
  return <VisualAiToolsFixture />;
}
