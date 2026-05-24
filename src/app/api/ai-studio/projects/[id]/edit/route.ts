import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserOr401 } from "@/lib/auth";
import { chargeCredits } from "@/lib/billing/require-credits";
import { applySearchReplaceBlocks } from "@/lib/ai/apply-deepsite-replace-blocks";
import { collectWebsiteModelWithStreamingFallback } from "@/lib/ai/collect-website-stream";
import { generateWebsiteCode } from "@/lib/ai/generate-website-code";
import { projectNameFromHtml } from "@/lib/ai/extract-model-html";
import { DEEPSITE_DIFF_EDIT_SYSTEM_PROMPT, buildDeepsiteDiffEditUserPrompt } from "@/lib/ai/prompts/deepsite-diff-edit-prompt";
import { sseDataLine, type WebsiteStreamEvent } from "@/lib/ai/sse-stream-events";
import { getStudioSourceHtml } from "@/lib/ai/studio-source-html";
import type { AiWebsiteFile } from "@/lib/ai/parse-website-files";
import { dbAdmin } from "@/lib/db";

const bodySchema = z.object({
  instruction: z.string().min(1, "Instruction is required."),
});

function mapGenerateError(e: unknown): { status: number; message: string } {
  const msg = e instanceof Error ? e.message : "";
  if (msg.includes("Missing HF_TOKEN")) return { status: 400, message: msg };
  if (msg.includes("Missing HF_MODEL")) return { status: 400, message: msg };
  if (msg.includes("Missing OPENAI_API_KEY")) return { status: 400, message: msg };
  if (msg.includes("empty response")) return { status: 502, message: msg };
  if (msg.includes("failed")) return { status: 502, message: msg };
  return { status: 500, message: "Could not update the website. Try again." };
}

function safeUserFacingError(e: unknown): string {
  return mapGenerateError(e).message;
}

async function replaceProjectSingleIndexHtml(
  db: ReturnType<typeof dbAdmin>,
  projectId: string,
  html: string,
  projectName: string,
) {
  const files: AiWebsiteFile[] = [{ path: "index.html", language: "html", content: html }];
  const { error: delErr } = await db.from("ai_site_files").delete().eq("project_id", projectId);
  if (delErr) throw new Error(delErr.message);
  const { error: insErr } = await db.from("ai_site_files").insert(
    files.map((f) => ({
      project_id: projectId,
      path: f.path,
      language: f.language,
      content: f.content,
    })),
  );
  if (insErr) throw new Error(insErr.message);

  await db.from("ai_site_projects").update({ name: projectName, updated_at: new Date().toISOString() }).eq("id", projectId);
}

const ASSISTANT_STORE_MAX = 65_000;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;
  const { id: projectId } = await params;
  const db = dbAdmin();

  const charged = await chargeCredits(db, auth.user.id, "site.edit", { project_id: projectId });
  if (!charged.ok) return charged.response;

  const wantsStream = request.headers.get("accept")?.includes("text/event-stream") ?? false;

  const { data: project, error: pErr } = await db
    .from("ai_site_projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", auth.user.id)
    .single();

  if (pErr || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { data: fileRows, error: fErr } = await db.from("ai_site_files").select("path,language,content").eq("project_id", projectId);
  if (fErr) return NextResponse.json({ error: "Could not load files." }, { status: 500 });

  const currentFiles: AiWebsiteFile[] = (fileRows ?? []).map((r) => ({
    path: r.path,
    language: r.language,
    content: r.content,
  }));

  const { data: lastUserRow } = await db
    .from("ai_site_messages")
    .select("content")
    .eq("project_id", projectId)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousPrompt = lastUserRow?.content?.trim() || "(no previous user prompt)";

  const { error: userMsgErr } = await db.from("ai_site_messages").insert({
    project_id: projectId,
    role: "user",
    content: body.instruction,
  });
  if (userMsgErr) {
    return NextResponse.json({ error: "Could not save your message." }, { status: 500 });
  }

  const sourceHtml = getStudioSourceHtml(currentFiles);
  const systemPrompt = DEEPSITE_DIFF_EDIT_SYSTEM_PROMPT;
  const userPrompt = buildDeepsiteDiffEditUserPrompt({
    previous_prompt: previousPrompt,
    current_html: sourceHtml,
    user_instruction: body.instruction,
  });

  const applyModelOutput = (raw: string): { html: string; projectName: string } | { error: string } => {
    const { html, applied, errors } = applySearchReplaceBlocks(sourceHtml, raw);
    if (errors.length > 0 || applied === 0) {
      const detail = errors.length ? errors.join(" ") : "The model did not return applicable SEARCH/REPLACE blocks.";
      return { error: detail };
    }
    const projectName = projectNameFromHtml(html, String(project.name ?? "Website preview"));
    return { html, projectName };
  };

  if (!wantsStream) {
    let raw: string;
    try {
      raw = await generateWebsiteCode({
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        maxTokens: 8000,
        hfProfile: "edit",
      });
    } catch (e) {
      const { status, message } = mapGenerateError(e);
      return NextResponse.json({ error: message }, { status });
    }

    const applied = applyModelOutput(raw);
    if ("error" in applied) {
      return NextResponse.json({ error: applied.error }, { status: 422 });
    }

    try {
      await replaceProjectSingleIndexHtml(db, projectId, applied.html, applied.projectName);
    } catch {
      return NextResponse.json({ error: "File save failed." }, { status: 500 });
    }

    await db
      .from("generated_sites")
      .update({
        site_spec_json: { source: "ai_studio", project_id: projectId, project_name: applied.projectName },
      })
      .eq("ai_site_project_id", projectId);

    const assistantBody = raw.length > ASSISTANT_STORE_MAX ? `${raw.slice(0, ASSISTANT_STORE_MAX)}\n\n…(truncated)` : raw;

    const { error: asstErr } = await db.from("ai_site_messages").insert({
      project_id: projectId,
      role: "assistant",
      content: assistantBody,
    });
    if (asstErr) {
      console.error("[ai-studio/edit] assistant message insert", asstErr.message);
    }

    const { data: filesOut } = await db
      .from("ai_site_files")
      .select("path,language,content,updated_at")
      .eq("project_id", projectId)
      .order("path");

    return NextResponse.json({ files: filesOut ?? [], project_name: applied.projectName });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (ev: WebsiteStreamEvent) => {
        controller.enqueue(sseDataLine(ev));
      };

      try {
        send({ type: "phase", message: "Thinking…" });

        const raw = await collectWebsiteModelWithStreamingFallback(
          {
            systemPrompt,
            userPrompt,
            temperature: 0.2,
            maxTokens: 8000,
            hfProfile: "edit",
          },
          send,
        );

        send({ type: "phase", message: "Applying edits…" });

        const applied = applyModelOutput(raw);
        if ("error" in applied) {
          send({ type: "error", message: applied.error });
          controller.close();
          return;
        }

        try {
          await replaceProjectSingleIndexHtml(db, projectId, applied.html, applied.projectName);
        } catch {
          send({ type: "error", message: "File save failed." });
          controller.close();
          return;
        }

        await db
          .from("generated_sites")
          .update({
            site_spec_json: { source: "ai_studio", project_id: projectId, project_name: applied.projectName },
          })
          .eq("ai_site_project_id", projectId);

        const assistantBody = raw.length > ASSISTANT_STORE_MAX ? `${raw.slice(0, ASSISTANT_STORE_MAX)}\n\n…(truncated)` : raw;

        const { error: asstErr } = await db.from("ai_site_messages").insert({
          project_id: projectId,
          role: "assistant",
          content: assistantBody,
        });
        if (asstErr) {
          console.error("[ai-studio/edit] assistant message insert", asstErr.message);
        }

        send({ type: "phase", message: "Refreshing preview…" });

        const { data: filesOut } = await db
          .from("ai_site_files")
          .select("path,language,content,updated_at")
          .eq("project_id", projectId)
          .order("path");

        send({
          type: "complete",
          files: filesOut ?? [],
          project_name: applied.projectName,
        });
      } catch (e) {
        send({ type: "error", message: safeUserFacingError(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
