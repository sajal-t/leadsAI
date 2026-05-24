import { NextRequest, NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { chargeCredits } from "@/lib/billing/require-credits";
import { collectWebsiteModelWithStreamingFallback } from "@/lib/ai/collect-website-stream";
import { generateWebsiteCode } from "@/lib/ai/generate-website-code";
import { extractFinalHtmlDocument, projectNameFromHtml } from "@/lib/ai/extract-model-html";
import { sseDataLine, type WebsiteStreamEvent } from "@/lib/ai/sse-stream-events";
import { DEEPSITE_FULL_HTML_SYSTEM_PROMPT, buildDeepsiteFullHtmlUserPrompt } from "@/lib/ai/prompts/deepsite-full-html-prompt";
import type { AiWebsiteFile } from "@/lib/ai/parse-website-files";
import { dbAdmin } from "@/lib/db";
import { ensureAiSiteProjectForBusiness } from "@/lib/ensure-ai-site-project";

function previewSlugFromBusinessName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 35)
    .replace(/^-|-$/g, "");
  return `${base || "site"}-${crypto.randomUUID().slice(0, 8)}`;
}

function publicBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function mapGenerateError(e: unknown): { status: number; message: string } {
  const msg = e instanceof Error ? e.message : "";
  if (msg.includes("Missing HF_TOKEN")) return { status: 400, message: msg };
  if (msg.includes("Missing HF_MODEL")) return { status: 400, message: msg };
  if (msg.includes("Missing OPENAI_API_KEY")) return { status: 400, message: msg };
  if (msg === "MISSING_VALID_HTML") {
    return { status: 422, message: "The model did not return a valid complete HTML document. Try regenerating." };
  }
  if (msg.includes("empty response")) return { status: 502, message: msg };
  if (msg.includes("failed")) return { status: 502, message: msg };
  return { status: 500, message: "Could not generate the website preview. Try again." };
}

function safeUserFacingError(e: unknown): string {
  return mapGenerateError(e).message;
}

function buildDeepsiteVars(business: Record<string, unknown>, campaign: { niche: string; city: string } | null) {
  const niche = campaign?.niche ?? "Local business";
  const city = campaign?.city ?? "";
  return {
    business_name: String(business.name ?? ""),
    niche,
    city,
    address: String(business.address ?? ""),
    phone: String(business.phone ?? ""),
    rating: business.rating != null ? String(business.rating) : "",
    review_count: business.review_count != null ? String(business.review_count) : "",
    website_status: typeof business.website_status === "string" ? business.website_status : "",
  };
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;
  const { id: businessId } = await params;
  const db = dbAdmin();

  const charged = await chargeCredits(db, auth.user.id, "site.generate", { business_id: businessId });
  if (!charged.ok) return charged.response;

  const wantsStream = request.headers.get("accept")?.includes("text/event-stream") ?? false;

  const { data: business, error: bizErr } = await db
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .eq("user_id", auth.user.id)
    .single();
  if (bizErr || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  let campaign: { niche: string; city: string } | null = null;
  if (business.campaign_id) {
    const { data: c } = await db.from("campaigns").select("niche,city").eq("id", business.campaign_id).single();
    campaign = c ?? null;
  }

  const ensured = await ensureAiSiteProjectForBusiness(db, businessId, auth.user.id);
  if (!ensured.ok) {
    return NextResponse.json({ error: ensured.errorMessage }, { status: 500 });
  }
  const projectId = ensured.projectId;

  const vars = buildDeepsiteVars(business as Record<string, unknown>, campaign);
  const systemPrompt = DEEPSITE_FULL_HTML_SYSTEM_PROMPT;
  const userPrompt = buildDeepsiteFullHtmlUserPrompt(vars);
  const base = publicBaseUrl().replace(/\/$/, "");

  const persistSiteRecord = async (projectName: string): Promise<{ previewSlug: string } | NextResponse> => {
    const siteSpecJson = {
      source: "ai_studio",
      project_id: projectId,
      project_name: projectName,
    };

    const { data: existingSite } = await db
      .from("generated_sites")
      .select("id, preview_slug")
      .eq("ai_site_project_id", projectId)
      .maybeSingle();

    if (existingSite?.preview_slug) {
      const { error: upErr } = await db
        .from("generated_sites")
        .update({
          site_spec_json: siteSpecJson,
          status: "preview_ready",
        })
        .eq("id", existingSite.id);
      if (upErr) return NextResponse.json({ error: "Could not update preview record." }, { status: 500 });
      return { previewSlug: existingSite.preview_slug };
    }

    const previewSlug = previewSlugFromBusinessName(String(business.name ?? "site"));
    const { error: insErr } = await db.from("generated_sites").insert({
      business_id: businessId,
      user_id: auth.user.id,
      site_spec_json: siteSpecJson,
      preview_slug: previewSlug,
      status: "preview_ready",
      ai_site_project_id: projectId,
    });
    if (insErr) {
      if (insErr.message.includes("ai_site_project_id") || insErr.code === "42703") {
        return NextResponse.json(
          { error: "Database missing ai_site_project_id on generated_sites. Run migration 004." },
          { status: 500 },
        );
      }
      return NextResponse.json({ error: "Could not save preview record." }, { status: 500 });
    }
    return { previewSlug };
  };

  const finalizeHtml = (raw: string): { html: string; projectName: string } | { error: string } => {
    const html = extractFinalHtmlDocument(raw);
    if (!html) {
      return { error: "MISSING_VALID_HTML" };
    }
    const projectName = projectNameFromHtml(html, String(business.name ?? "Website preview"));
    return { html, projectName };
  };

  if (!wantsStream) {
    let raw: string;
    try {
      raw = await generateWebsiteCode({
        systemPrompt,
        userPrompt,
        temperature: 0.25,
        maxTokens: 12_000,
        hfProfile: "initial",
      });
    } catch (e) {
      const { status, message } = mapGenerateError(e);
      return NextResponse.json({ error: message }, { status });
    }

    const parsed = finalizeHtml(raw);
    if ("error" in parsed) {
      const { status, message } = mapGenerateError(new Error(parsed.error));
      return NextResponse.json({ error: message }, { status });
    }

    try {
      await replaceProjectSingleIndexHtml(db, projectId, parsed.html, parsed.projectName);
    } catch {
      return NextResponse.json({ error: "File save failed." }, { status: 500 });
    }

    const slugResult = await persistSiteRecord(parsed.projectName);
    if (slugResult instanceof NextResponse) return slugResult;

    return NextResponse.json({
      project_id: projectId,
      preview_url: `${base}/preview/${slugResult.previewSlug}`,
      studio_url: `${base}/studio/${projectId}`,
      preview_slug: slugResult.previewSlug,
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (ev: WebsiteStreamEvent) => controller.enqueue(sseDataLine(ev));

      try {
        send({ type: "phase", message: "Thinking…" });

        const raw = await collectWebsiteModelWithStreamingFallback(
          {
            systemPrompt,
            userPrompt,
            temperature: 0.25,
            maxTokens: 12_000,
            hfProfile: "initial",
          },
          send,
        );

        send({ type: "phase", message: "Saving…" });

        const parsed = finalizeHtml(raw);
        if ("error" in parsed) {
          send({ type: "error", message: safeUserFacingError(new Error(parsed.error)) });
          controller.close();
          return;
        }

        try {
          await replaceProjectSingleIndexHtml(db, projectId, parsed.html, parsed.projectName);
        } catch {
          send({ type: "error", message: "File save failed." });
          controller.close();
          return;
        }

        const slugResult = await persistSiteRecord(parsed.projectName);
        if (slugResult instanceof NextResponse) {
          send({ type: "error", message: "Could not save preview record." });
          controller.close();
          return;
        }

        const previewSlug = slugResult.previewSlug;

        send({ type: "phase", message: "Refreshing preview…" });

        const { data: filesOut } = await db
          .from("ai_site_files")
          .select("path,language,content,updated_at")
          .eq("project_id", projectId)
          .order("path");

        send({
          type: "complete",
          project_id: projectId,
          preview_slug: previewSlug,
          studio_url: `${base}/studio/${projectId}`,
          preview_url: `${base}/preview/${previewSlug}`,
          files: filesOut ?? [],
          project_name: parsed.projectName,
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
