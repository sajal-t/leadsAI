import { notFound, redirect } from "next/navigation";
import { AiStudioWorkspace } from "@/components/studio/ai-studio-workspace";
import { loadStudioPayload } from "@/lib/studio-load";
import { getServerUserId } from "@/lib/server-user";

export default async function StudioPage({ params }: { params: Promise<{ projectId: string }> }) {
  const userId = await getServerUserId();
  if (!userId) redirect("/login");

  const { projectId } = await params;
  const initial = await loadStudioPayload(projectId, userId);
  if (!initial) notFound();

  return (
    <main className="h-screen overflow-hidden bg-[#f4f6fb]">
      <AiStudioWorkspace projectId={projectId} initial={initial} />
    </main>
  );
}
