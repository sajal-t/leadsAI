import { NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { dbAdmin } from "@/lib/db";
import { safeRate } from "@/lib/dashboard-metrics";

export async function GET() {
  const auth = await getUserOr401();
  if ("error" in auth) return auth.error;
  const db = dbAdmin();
  const userId = auth.user.id;

  const [businesses, callsRes, sitesRes, dealsRes] = await Promise.all([
    db.from("businesses").select("id").eq("user_id", userId),
    db.from("call_logs").select("outcome,answered").eq("user_id", userId),
    db.from("generated_sites").select("id").eq("user_id", userId),
    db.from("deals").select("stage,monthly_fee").eq("user_id", userId),
  ]);

  const callsData = callsRes.data ?? [];
  const dealsData = dealsRes.data ?? [];

  const mrr = dealsData
    .filter((d) => d.stage === "closed_won")
    .reduce((sum, d) => sum + Number(d.monthly_fee ?? 0), 0);

  const totalCalls = callsData.length;
  const answeredCalls = callsData.filter(
    (c) => c.answered === true || (c.answered == null && c.outcome !== "no_answer" && c.outcome !== "voicemail"),
  ).length;

  const interestedCalls = callsData.filter((c) => c.outcome === "interested").length;
  const closedWonDeals = dealsData.filter((d) => d.stage === "closed_won").length;

  const payload = {
    totalLeads: businesses.data?.length ?? 0,
    callsMade: totalCalls,
    answeredCalls,
    noAnswers: callsData.filter((c) => c.outcome === "no_answer").length,
    voicemails: callsData.filter((c) => c.outcome === "voicemail").length,
    interested: callsData.filter((c) => c.outcome === "interested").length,
    infoRequested: callsData.filter((c) => c.outcome === "send_info").length,
    callbacks: callsData.filter((c) => c.outcome === "callback").length,
    meetingsBooked: callsData.filter((c) => c.outcome === "meeting_booked").length,
    notInterested: callsData.filter((c) => c.outcome === "not_interested").length,
    wrongNumbers: callsData.filter((c) => c.outcome === "wrong_number").length,
    alreadyHasSomeone: callsData.filter((c) => c.outcome === "already_has_someone").length,
    tooExpensive: callsData.filter((c) => c.outcome === "too_expensive").length,
    doesNotNeedWebsite: callsData.filter((c) => c.outcome === "does_not_need_website").length,
    otherOutcomes: callsData.filter((c) => c.outcome === "other").length,
    websitePreviewsGenerated: sitesRes.data?.length ?? 0,
    closedClients: closedWonDeals,
    mrr,
    arr: mrr * 12,
    answerRate: safeRate(answeredCalls, totalCalls),
    interestRate: safeRate(interestedCalls, answeredCalls),
    meetingRate: safeRate(
      callsData.filter((c) => c.outcome === "meeting_booked").length,
      answeredCalls,
    ),
    closeRate: safeRate(closedWonDeals, interestedCalls),
  };

  return NextResponse.json(payload);
}
