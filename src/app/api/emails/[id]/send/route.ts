import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";
import { getResend } from "@/lib/resend";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserOr401();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const db = dbAdmin();
  const { data: email } = await db
    .from("generated_emails")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();
  if (!email) return NextResponse.json({ error: "Email not found" }, { status: 404 });

  try {
    const resend = getResend();
    const sendResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "LocalLead AI <no-reply@example.com>",
      to: ["test@example.com"],
      subject: email.subject,
      text: email.body,
    });
    await db
      .from("generated_emails")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", auth.user.id);
    return NextResponse.json({ sent: true, result: sendResult });
  } catch {
    await db.from("generated_emails").update({ status: "failed" }).eq("id", id).eq("user_id", auth.user.id);
    return NextResponse.json({ sent: false }, { status: 500 });
  }
}
