import { Badge } from "@/components/ui/badge";
export function StatusBadge({ label }: { label: string }) { return <Badge variant="secondary" className="border border-border/50 bg-secondary/30 text-foreground">{label}</Badge>; }
