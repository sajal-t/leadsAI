import { redirect } from "next/navigation";

export default async function WebsiteBuilderRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/studio/${id}`);
}
