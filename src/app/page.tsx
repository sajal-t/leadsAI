import {
  Navbar,
  Hero,
  Problem,
  Features,
  HowItWorks,
  AIStudio,
  Dashboard,
  UseCases,
  Pricing,
  CTA,
  Footer,
} from "@/components/landing";

export default function Home() {
  return (
    <div className="landing-root min-h-screen bg-background text-foreground antialiased">
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <Features />
        <HowItWorks />
        <AIStudio />
        <Dashboard />
        <UseCases />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
