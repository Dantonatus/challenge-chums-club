import { Helmet } from "react-helmet-async";
import heroImg from "@/assets/hero-modern.jpg";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Character-Enhancement Challenge | Build Habits Together</title>
        <meta name="description" content="Create accountability groups, set friendly penalties, and track habits with dashboards, journals, and ideas. Web + mobile ready." />
        <link rel="canonical" href="/" />
      </Helmet>

      <header className="container py-8 flex items-center justify-between">
        <Link to="/features" className="story-link text-sm">How it works</Link>
        <div className="flex gap-2">
          <Link to="/auth"><Button variant="outline">Sign in</Button></Link>
          <Link to="/auth"><Button variant="hero" className="hover-scale">Get started</Button></Link>
        </div>
      </header>

      <main className="container pb-16">
        <section className="grid gap-8 md:grid-cols-2 items-center">
          <div className="space-y-5">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Form better habits with friends — playful, fair, accountable.
            </h1>
            <p className="text-lg text-muted-foreground">
              Create groups, set challenges, log results, and keep a friendly ledger. No spreadsheets. Just clarity and momentum.
            </p>
            <div className="flex gap-3">
              <Link to="/auth"><Button variant="hero" className="hover-scale">Try the demo</Button></Link>
              <Link to="/features"><Button variant="outline">Explore features</Button></Link>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-[var(--shadow-elegant)]">
            <img src={heroImg} alt="Friends celebrating weekly challenge progress with colorful tiles and coins" className="w-full h-auto" loading="lazy" />
          </div>
        </section>

        <section id="features" className="scroll-mt-24 mt-20 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border p-6 bg-card/50">
            <h3 className="font-semibold">Challenges that fit</h3>
            <p className="text-sm text-muted-foreground">Daily or weekly, strike allowances, flexible penalties — solo or whole group.</p>
          </div>
          <div className="rounded-xl border p-6 bg-card/50">
            <h3 className="font-semibold">Real-time tracking</h3>
            <p className="text-sm text-muted-foreground">Tap to log success/failure. See tallies and a friendly penalties ledger.</p>
          </div>
          <div className="rounded-xl border p-6 bg-card/50">
            <h3 className="font-semibold">Reflect & improve</h3>
            <p className="text-sm text-muted-foreground">Daily journal, remarks per interval, plus an idea library and voting.</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
