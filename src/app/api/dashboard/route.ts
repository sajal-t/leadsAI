import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";

export async function GET() {
  const auth = await getUserOr401();
  if ("error" in auth) return auth.error;
  const db = dbAdmin();
  const userId = auth.user.id;

  const [businesses, calls, sites, emails, deals] = await Promise.all([
    db.from("businesses").select("id").eq("user_id", userId),
    db.from("call_logs").select("outcome").eq("user_id", userId),
    db.from("generated_sites").select("id").eq("user_id", userId),
    db.from("generated_emails").select("status").eq("user_id", userId),
    db.from("deals").select("stage,monthly_fee").eq("user_id", userId),
  ]);

  const callsData = calls.data ?? [];
  const dealsData = deals.data ?? [];
  const mrr = dealsData
    .filter((d) => d.stage === "closed_won")
    .reduce((sum, d) => sum + Number(d.monthly_fee ?? 0), 0);

  return NextResponse.json({
    totalLeads: businesses.data?.length ?? 0,
    callsMade: callsData.length,
    noAnswers: callsData.filter((c) => c.outcome === "no_answer").length,
    voicemails: callsData.filter((c) => c.outcome === "voicemail").length,
    interestedLeads: callsData.filter((c) => c.outcome === "interested").length,
    meetingsBooked: callsData.filter((c) => c.outcome === "meeting_booked").length,
    websitesGenerated: sites.data?.length ?? 0,
    emailsSent: (emails.data ?? []).filter((e) => e.status === "sent").length,
    closedClients: dealsData.filter((d) => d.stage === "closed_won").length,
    mrr,
    arr: mrr * 12,
  });
}
