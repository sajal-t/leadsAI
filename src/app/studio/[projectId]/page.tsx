import { notFound } from "next/navigation";
import { AiStudioWorkspace } from "@/components/studio/ai-studio-workspace";
import { DEV_USER } from "@/lib/dev-user";
import { loadStudioPayload } from "@/lib/studio-load";

export default async function StudioPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const initial = await loadStudioPayload(projectId, DEV_USER.id);
  if (!initial) notFound();

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1600px] bg-zinc-50">
      <AiStudioWorkspace projectId={projectId} initial={initial} />
    </main>
  );
}
