import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FindLeadsRunner } from "./find-leads-runner";
import { dbAdmin } from "@/lib/db";
import { DEV_USER } from "@/lib/dev-user";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = dbAdmin();

  const [{ data: campaign }, { data: businesses }] = await Promise.all([
    db.from("campaigns").select("*").eq("id", id).eq("user_id", DEV_USER.id).single(),
    db
      .from("businesses")
      .select("*, call_logs(outcome, created_at)")
      .eq("campaign_id", id)
      .eq("user_id", DEV_USER.id),
  ]);
  const noWebsiteBusinesses = (businesses ?? []).filter(
    (business) => business.website_status === "NO_WEBSITE_FOUND",
  );
  const otherBusinesses = (businesses ?? []).filter(
    (business) => business.website_status !== "NO_WEBSITE_FOUND",
  );

  return (
    <main className="relative mx-auto w-full max-w-7xl p-6 space-y-6">
      <FindLeadsRunner campaignId={id} />
      <Card>
        <CardHeader>
          <CardTitle>
            {campaign?.niche} in {campaign?.city}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-zinc-600">
          <p>Created: {campaign?.created_at ? new Date(campaign.created_at).toLocaleString() : "-"}</p>
          <p>
            Target sample size:{" "}
            {campaign != null &&
            "max_sample_size" in campaign &&
            typeof campaign.max_sample_size === "number"
              ? campaign.max_sample_size
              : "500 (default)"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leads with no listed website</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Reviews</TableHead>
                <TableHead>Website status</TableHead>
                <TableHead>Latest call outcome</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {noWebsiteBusinesses.map((business) => {
                const logs = [...(business.call_logs ?? [])].sort(
                  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                );
                const latestCall = logs[0]?.outcome ?? "-";
                return (
                  <TableRow key={business.id}>
                    <TableCell>{business.name}</TableCell>
                    <TableCell>{business.address}</TableCell>
                    <TableCell>{business.phone || "-"}</TableCell>
                    <TableCell>{business.rating || "-"}</TableCell>
                    <TableCell>{business.review_count || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="warning">No website found</Badge>
                    </TableCell>
                    <TableCell>{latestCall}</TableCell>
                    <TableCell>
                      <Link href={`/businesses/${business.id}`}>
                        <Button size="sm">Start campaign</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
              {noWebsiteBusinesses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-zinc-500">
                    No businesses matched &quot;No website found&quot; for this campaign.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {otherBusinesses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Other matches ({otherBusinesses.length})</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-600">
            Google found businesses, but they appear to have a website listed.
          </CardContent>
        </Card>
      )}
    </main>
  );
}
