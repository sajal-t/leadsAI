import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <main className="mx-auto w-full max-w-7xl p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {campaign?.niche} in {campaign?.city}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-600">
          Created: {campaign?.created_at ? new Date(campaign.created_at).toLocaleString() : "-"}
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
                const latestCall = business.call_logs?.[business.call_logs.length - 1]?.outcome ?? "-";
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
                      <div className="flex gap-2">
                        <Link href={`/businesses/${business.id}`} className="text-sky-700">
                          View
                        </Link>
                        {business.phone && (
                          <a href={`tel:${business.phone}`} className="text-sky-700">
                            Call
                          </a>
                        )}
                        <form action={`/api/businesses/${business.id}/generate-script`} method="post">
                          <Button size="sm" variant="outline" type="submit">
                            Generate Script
                          </Button>
                        </form>
                      </div>
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
