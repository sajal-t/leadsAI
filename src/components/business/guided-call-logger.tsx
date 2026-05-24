"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DealRevenueFields } from "@/components/calls/deal-revenue-fields";

type Props = {
  businessId: string;
  nextBusinessId: string | null;
};

type Q1 = "no_answer" | "voicemail" | "answered" | null;
type Who = "owner" | "employee" | "unknown" | "wrong" | null;
type Result =
  | "interested"
  | "send_info"
  | "callback"
  | "meeting_booked"
  | "not_interested"
  | "already_has_someone"
  | "too_expensive"
  | "does_not_need_website"
  | "other"
  | null;

const INTEREST_OPTIONS = [
  "Website preview",
  "Pricing",
  "Full website build",
  "Redesign",
  "Booking/contact form",
  "SEO/local visibility",
  "Other",
] as const;

function RadioRow({
  label,
  name,
  value,
  current,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  current: string | null;
  onChange: (v: string) => void;
}) {
  const selected = current === value;
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
        selected ? "border-blue-500 bg-blue-50" : "border-neutral-200 hover:bg-neutral-50"
      }`}
    >
      <input type="radio" className="accent-blue-500" name={name} checked={selected} onChange={() => onChange(value)} />
      <span>{label}</span>
    </label>
  );
}

export function GuidedCallLogger({ businessId, nextBusinessId }: Props) {
  const router = useRouter();
  const [q1, setQ1] = useState<Q1>(null);
  const [noAnswerCallAgain, setNoAnswerCallAgain] = useState<string | null>(null);
  const [noAnswerNotes, setNoAnswerNotes] = useState("");

  const [vmLeft, setVmLeft] = useState<string | null>(null);
  const [vmNotes, setVmNotes] = useState("");

  const [who, setWho] = useState<Who>(null);
  const [wrongNotes, setWrongNotes] = useState("");

  const [result, setResult] = useState<Result>(null);
  const [interestTags, setInterestTags] = useState<string[]>([]);
  const [genSite, setGenSite] = useState<string | null>(null);
  const [interestedNotes, setInterestedNotes] = useState("");

  const [infoNotes, setInfoNotes] = useState("");

  const [callbackAt, setCallbackAt] = useState("");
  const [callbackNotes, setCallbackNotes] = useState("");

  const [meetingAt, setMeetingAt] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");

  const [notInterestedWhy, setNotInterestedWhy] = useState<string | null>(null);
  const [notInterestedNotes, setNotInterestedNotes] = useState("");

  const [otherNotes, setOtherNotes] = useState("");

  const [dealSetupFee, setDealSetupFee] = useState("");
  const [dealMonthlyFee, setDealMonthlyFee] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ outcome: string; genSite?: boolean } | null>(null);

  const reset = () => {
    setQ1(null);
    setNoAnswerCallAgain(null);
    setNoAnswerNotes("");
    setVmLeft(null);
    setVmNotes("");
    setWho(null);
    setWrongNotes("");
    setResult(null);
    setInterestTags([]);
    setGenSite(null);
    setInterestedNotes("");
    setInfoNotes("");
    setCallbackAt("");
    setCallbackNotes("");
    setMeetingAt("");
    setMeetingNotes("");
    setNotInterestedWhy(null);
    setNotInterestedNotes("");
    setOtherNotes("");
    setDone(null);
    setError(null);
  };

  const toggleInterest = (tag: string) => {
    setInterestTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const postLog = async (payload: Record<string, unknown>) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/call-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? `Failed (${res.status})`);
      }
      return (await res.json()) as { generate_site_requested?: boolean; outcome?: string };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save call");
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const submitNoAnswer = async () => {
    const ok = await postLog({
      business_id: businessId,
      outcome: "no_answer",
      answered: false,
      notes: noAnswerNotes || null,
      follow_up_needed: noAnswerCallAgain === "yes",
      metadata: { guided: { call_again: noAnswerCallAgain } },
    });
    if (!ok) return;
    setDone({ outcome: "no_answer" });
    router.refresh();
  };

  const submitVoicemail = async () => {
    const ok = await postLog({
      business_id: businessId,
      outcome: "voicemail",
      answered: false,
      notes: vmNotes || null,
      follow_up_needed: true,
      metadata: { guided: { left_voicemail: vmLeft } },
    });
    if (!ok) return;
    setDone({ outcome: "voicemail" });
    router.refresh();
  };

  const submitWrong = async () => {
    const ok = await postLog({
      business_id: businessId,
      outcome: "wrong_number",
      answered: true,
      answered_by: "wrong_number",
      notes: wrongNotes || null,
      follow_up_needed: false,
    });
    if (!ok) return;
    setDone({ outcome: "wrong_number" });
    router.refresh();
  };

  const submitResult = async (outcome: string, extra: Record<string, unknown> = {}) => {
    const answered = true;
    const answered_by =
      who === "owner" ? "owner" : who === "employee" ? "employee" : who === "unknown" ? "unknown" : null;
    const ok = await postLog({
      business_id: businessId,
      outcome,
      answered,
      answered_by,
      follow_up_needed: extra.follow_up_needed as boolean | undefined,
      generate_site_requested: extra.generate_site_requested as boolean | undefined,
      callback_at: extra.callback_at as string | undefined,
      meeting_at: extra.meeting_at as string | undefined,
      interest_tags: extra.interest_tags as string[] | undefined,
      notes: (extra.notes as string) || null,
      metadata: { guided: extra.metadata ?? {} },
    });
    if (!ok) return;
    setDone({
      outcome,
      genSite: Boolean(extra.generate_site_requested),
    });
    router.refresh();
  };

  const runGenerateSite = async () => {
    try {
      const sessionRes = await fetch(`/api/businesses/${businessId}/studio-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const sessionData = await sessionRes.json().catch(() => null);
      if (!sessionRes.ok) {
        throw new Error(typeof sessionData?.error === "string" ? sessionData.error : `Failed (${sessionRes.status})`);
      }
      const pid = sessionData?.project_id as string | undefined;
      if (!pid) throw new Error("No studio project returned.");
      window.location.href = `/studio/${pid}?gen=1`;
    } catch (e) {
      console.error(e);
      router.refresh();
    }
  };

  const runMarkClosedWon = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/call-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          outcome: "closed_won",
          answered: true,
          notes: "Marked as client (from meeting)",
          follow_up_needed: false,
          setup_fee: dealSetupFee,
          monthly_fee: dealMonthlyFee,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? `Failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark deal");
    } finally {
      setSubmitting(false);
    }
  };

  const progress = useMemo(() => {
    if (done) return "Done";
    if (!q1) return "Step 1 of 3";
    if (q1 === "no_answer" || q1 === "voicemail") return "Step 2 of 3";
    if (q1 === "answered") {
      if (!who) return "Step 2 of 3";
      if (who === "wrong") return "Step 3 of 3";
      if (!result) return "Step 3 of 3";
      return "Step 4 of 3";
    }
    return "";
  }, [q1, who, result, done]);

  return (
    <Card className="overflow-hidden border-neutral-200 shadow-sm">
      <CardHeader className="border-b border-neutral-200 bg-neutral-50">
        <CardTitle>Log this call</CardTitle>
        <p className="text-sm text-neutral-500">
          Answer a few quick questions so your dashboard and follow-ups stay accurate.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <Badge variant="secondary" className="rounded-full">
            {progress}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!done && (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">1) Did anyone answer?</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                <RadioRow label="No answer" name="q1" value="no_answer" current={q1} onChange={(v) => setQ1(v as Q1)} />
                <RadioRow label="Voicemail" name="q1" value="voicemail" current={q1} onChange={(v) => setQ1(v as Q1)} />
                <RadioRow label="Yes, someone answered" name="q1" value="answered" current={q1} onChange={(v) => setQ1(v as Q1)} />
              </div>
            </div>

            {q1 === "no_answer" && (
              <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <Label>Should this lead be called again?</Label>
                <div className="flex gap-2">
                  <RadioRow label="Yes" name="again" value="yes" current={noAnswerCallAgain} onChange={setNoAnswerCallAgain} />
                  <RadioRow label="No" name="again" value="no" current={noAnswerCallAgain} onChange={setNoAnswerCallAgain} />
                </div>
                <div className="space-y-1">
                  <Label>Any notes?</Label>
                  <Textarea value={noAnswerNotes} onChange={(e) => setNoAnswerNotes(e.target.value)} />
                </div>
                <Button disabled={submitting || !noAnswerCallAgain} onClick={() => void submitNoAnswer()}>
                  Log no answer
                </Button>
              </div>
            )}

            {q1 === "voicemail" && (
              <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <Label>Did you leave a voicemail?</Label>
                <div className="flex gap-2">
                  <RadioRow label="Yes" name="vm" value="yes" current={vmLeft} onChange={setVmLeft} />
                  <RadioRow label="No" name="vm" value="no" current={vmLeft} onChange={setVmLeft} />
                </div>
                <div className="space-y-1">
                  <Label>Any notes?</Label>
                  <Textarea value={vmNotes} onChange={(e) => setVmNotes(e.target.value)} />
                </div>
                <Button disabled={submitting || !vmLeft} onClick={() => void submitVoicemail()}>
                  Log voicemail
                </Button>
              </div>
            )}

            {q1 === "answered" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">2) Who answered?</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <RadioRow label="Owner / decision maker" name="who" value="owner" current={who} onChange={(v) => setWho(v as Who)} />
                    <RadioRow label="Employee / receptionist" name="who" value="employee" current={who} onChange={(v) => setWho(v as Who)} />
                    <RadioRow label="Not sure" name="who" value="unknown" current={who} onChange={(v) => setWho(v as Who)} />
                    <RadioRow label="Wrong number" name="who" value="wrong" current={who} onChange={(v) => setWho(v as Who)} />
                  </div>
                </div>

                {who === "wrong" && (
                  <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                    <Label>Any notes?</Label>
                    <Textarea value={wrongNotes} onChange={(e) => setWrongNotes(e.target.value)} />
                    <Button disabled={submitting} onClick={() => void submitWrong()}>
                      Log wrong number
                    </Button>
                  </div>
                )}

                {who && who !== "wrong" && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">3) What was the result?</Label>
                    <div className="grid gap-2 md:grid-cols-2">
                      {(
                        [
                          ["interested", "Interested"],
                          ["send_info", "Asked for more info"],
                          ["callback", "Asked for callback"],
                          ["meeting_booked", "Meeting booked"],
                          ["not_interested", "Not interested"],
                          ["already_has_someone", "Already has someone"],
                          ["too_expensive", "Too expensive"],
                          ["does_not_need_website", "Does not need a website"],
                          ["other", "Other"],
                        ] as const
                      ).map(([val, label]) => (
                        <RadioRow key={val} label={label} name="res" value={val} current={result} onChange={(v) => setResult(v as Result)} />
                      ))}
                    </div>

                    {result === "interested" && (
                      <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                        <Label>What are they interested in?</Label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {INTEREST_OPTIONS.map((opt) => (
                            <label key={opt} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="accent-blue-500"
                                checked={interestTags.includes(opt)}
                                onChange={() => toggleInterest(opt)}
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                        <Label>Generate website preview?</Label>
                        <div className="flex gap-2">
                          <RadioRow label="Yes" name="gs" value="yes" current={genSite} onChange={setGenSite} />
                          <RadioRow label="No" name="gs" value="no" current={genSite} onChange={setGenSite} />
                        </div>
                        <Textarea placeholder="Notes" value={interestedNotes} onChange={(e) => setInterestedNotes(e.target.value)} />
                        <Button
                          disabled={submitting || genSite === null}
                          onClick={() =>
                            void submitResult("interested", {
                              follow_up_needed: true,
                              generate_site_requested: genSite === "yes",
                              interest_tags: interestTags,
                              notes: interestedNotes,
                              metadata: { interests: interestTags },
                            })
                          }
                        >
                          Log interested
                        </Button>
                      </div>
                    )}

                    {result === "send_info" && (
                      <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                        <Textarea placeholder="Notes" value={infoNotes} onChange={(e) => setInfoNotes(e.target.value)} />
                        <Button
                          disabled={submitting}
                          onClick={() =>
                            void submitResult("send_info", {
                              follow_up_needed: true,
                              notes: infoNotes,
                            })
                          }
                        >
                          Log info request
                        </Button>
                      </div>
                    )}

                    {result === "callback" && (
                      <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                        <Label>Callback date / time</Label>
                        <Input type="datetime-local" value={callbackAt} onChange={(e) => setCallbackAt(e.target.value)} />
                        <Label>What should you mention next time?</Label>
                        <Textarea value={callbackNotes} onChange={(e) => setCallbackNotes(e.target.value)} />
                        <Button
                          disabled={submitting || !callbackAt}
                          onClick={() =>
                            void submitResult("callback", {
                              follow_up_needed: true,
                              callback_at: callbackAt ? new Date(callbackAt).toISOString() : undefined,
                              notes: callbackNotes,
                              metadata: { callback_local: callbackAt },
                            })
                          }
                        >
                          Log callback
                        </Button>
                      </div>
                    )}

                    {result === "meeting_booked" && (
                      <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                        <Label>Meeting date / time</Label>
                        <Input type="datetime-local" value={meetingAt} onChange={(e) => setMeetingAt(e.target.value)} />
                        <Label>Meeting notes</Label>
                        <Textarea value={meetingNotes} onChange={(e) => setMeetingNotes(e.target.value)} />
                        <Button
                          disabled={submitting || !meetingAt}
                          onClick={() =>
                            void submitResult("meeting_booked", {
                              follow_up_needed: true,
                              meeting_at: meetingAt ? new Date(meetingAt).toISOString() : undefined,
                              notes: meetingNotes,
                              metadata: { meeting_local: meetingAt },
                            })
                          }
                        >
                          Log meeting
                        </Button>
                      </div>
                    )}

                    {result === "not_interested" && (
                      <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                        <Label>Why not?</Label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {["No reason given", "Bad timing", "Not a priority", "Budget", "Already has website/help", "Other"].map((w) => (
                            <RadioRow key={w} label={w} name="why" value={w} current={notInterestedWhy} onChange={setNotInterestedWhy} />
                          ))}
                        </div>
                        <Textarea placeholder="Notes" value={notInterestedNotes} onChange={(e) => setNotInterestedNotes(e.target.value)} />
                        <Button disabled={submitting || !notInterestedWhy} onClick={() => void submitResult("not_interested", { follow_up_needed: false, notes: notInterestedNotes, metadata: { why: notInterestedWhy } })}>
                          Log not interested
                        </Button>
                      </div>
                    )}

                    {result === "already_has_someone" && (
                      <Button disabled={submitting} onClick={() => void submitResult("already_has_someone", { follow_up_needed: false })}>
                        Log already has someone
                      </Button>
                    )}

                    {result === "too_expensive" && (
                      <Button disabled={submitting} onClick={() => void submitResult("too_expensive", { follow_up_needed: false })}>
                        Log too expensive
                      </Button>
                    )}

                    {result === "does_not_need_website" && (
                      <Button disabled={submitting} onClick={() => void submitResult("does_not_need_website", { follow_up_needed: false })}>
                        Log does not need website
                      </Button>
                    )}

                    {result === "other" && (
                      <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                        <Textarea placeholder="Notes" value={otherNotes} onChange={(e) => setOtherNotes(e.target.value)} />
                        <Button disabled={submitting} onClick={() => void submitResult("other", { notes: otherNotes, follow_up_needed: false, metadata: {} })}>
                          Log other
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {done && (
          <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-semibold text-emerald-900">Call logged.</p>
            <div className="flex flex-wrap gap-2">
              {done.outcome === "no_answer" && (
                <>
                  {nextBusinessId && (
                    <Link href={`/businesses/${nextBusinessId}`}>
                      <Button variant="outline">Try next lead</Button>
                    </Link>
                  )}
                  <Button variant="secondary" onClick={reset}>
                    Call again later
                  </Button>
                </>
              )}
              {done.outcome === "voicemail" && nextBusinessId && (
                <Link href={`/businesses/${nextBusinessId}`}>
                  <Button variant="outline">Try next lead</Button>
                </Link>
              )}
              {done.outcome === "interested" && (
                <>
                  {done.genSite && (
                    <Button type="button" onClick={() => void runGenerateSite()}>
                      Generate website preview
                    </Button>
                  )}
                  {nextBusinessId && (
                    <Link href={`/businesses/${nextBusinessId}`}>
                      <Button variant="outline">Try next lead</Button>
                    </Link>
                  )}
                </>
              )}
              {done.outcome === "send_info" && (
                <Button type="button" variant="outline" onClick={() => void runGenerateSite()}>
                  Generate website preview
                </Button>
              )}
              {done.outcome === "callback" && (
                <>
                  <p className="text-sm text-neutral-600">Callback time saved on the log.</p>
                  {nextBusinessId && (
                    <Link href={`/businesses/${nextBusinessId}`}>
                      <Button variant="outline">Try next lead</Button>
                    </Link>
                  )}
                </>
              )}
              {done.outcome === "meeting_booked" && (
                <>
                  <Button type="button" onClick={() => void runGenerateSite()}>
                    Generate website preview
                  </Button>
                  <div className="w-full space-y-3 rounded-lg border border-emerald-200 bg-white p-4">
                    <p className="text-sm font-medium text-neutral-900">Closed the deal?</p>
                    <DealRevenueFields
                      compact
                      setupFee={dealSetupFee}
                      monthlyFee={dealMonthlyFee}
                      onSetupFeeChange={setDealSetupFee}
                      onMonthlyFeeChange={setDealMonthlyFee}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={submitting}
                      className="w-full"
                      onClick={() => void runMarkClosedWon()}
                    >
                      {submitting ? "Saving…" : "Mark closed & save revenue"}
                    </Button>
                  </div>
                  <Link href="/dashboard/calls">
                    <Button variant="outline">View revenue in call log</Button>
                  </Link>
                </>
              )}
              {["not_interested", "wrong_number", "already_has_someone", "too_expensive", "does_not_need_website", "other"].includes(done.outcome) &&
                nextBusinessId && (
                  <Link href={`/businesses/${nextBusinessId}`}>
                    <Button variant="outline">Try next lead</Button>
                  </Link>
                )}
            </div>
            <Button variant="outline" size="sm" onClick={reset}>
              Log another call
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
