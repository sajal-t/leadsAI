import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return <main className="min-h-screen bg-gradient-to-b from-background to-secondary/20"><div className="mx-auto max-w-6xl px-6 py-6"><nav className="sticky top-4 z-20 mb-16 flex items-center justify-between rounded-2xl border border-border/50 bg-background/70 px-4 py-3 backdrop-blur"><div className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary"/>LocalLead AI</div><div className="flex gap-2"><Link href="/login"><Button variant="outline">Login</Button></Link><Link href="/dashboard"><Button>Dashboard</Button></Link></div></nav><section className="rounded-3xl border border-border/50 bg-card/60 p-10 text-center shadow-sm shadow-primary/5"><h1 className="text-4xl font-semibold">Find local businesses with no website found</h1><p className="mx-auto mt-4 max-w-3xl text-muted-foreground">AI-powered lead sourcing, calling workflows, website preview generation, and follow-up automation for web design agencies.</p><div className="mt-6 flex justify-center gap-3"><Link href="/campaigns/new"><Button>Find Leads</Button></Link><Link href="/dashboard"><Button variant="outline">Open Dashboard</Button></Link></div></section></div></main>;
}
