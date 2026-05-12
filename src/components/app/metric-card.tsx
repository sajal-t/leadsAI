import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export function MetricCard({ title, value, icon: Icon }: { title: string; value: string; icon?: React.ComponentType<{ className?: string }> }) {
  return <Card className="rounded-2xl border-border/50 bg-card/50 shadow-sm shadow-primary/5"><CardHeader className="pb-2"><CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">{title}{Icon ? <Icon className="h-4 w-4" /> : null}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{value}</p></CardContent></Card>;
}
