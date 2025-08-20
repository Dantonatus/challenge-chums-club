import { Helmet } from "react-helmet-async";
import heroImg from "@/assets/hero-challenge.jpg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

const Features = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Explore Features | Character Challenge</title>
        <meta name="description" content="Explore groups, challenges, logging, ledger, journal and ideas. Create a challenge and start today." />
        <link rel="canonical" href="/features" />
      </Helmet>

      <header className="container py-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Explore Features</h1>
        <div className="flex gap-2">
          <Link to="/auth"><Button variant="outline">Sign in</Button></Link>
          <Link to="/auth"><Button variant="hero" className="hover-scale">Get started</Button></Link>
        </div>
      </header>

      <main className="container pb-16">
        <section className="grid gap-8 md:grid-cols-2 items-center">
          <div className="space-y-5">
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">Create and start a challenge in minutes</h2>
            <p className="text-lg text-muted-foreground">1) Create a group. 2) Create a challenge with penalty and strikes. 3) Join participants. 4) Log success daily/weekly.</p>
            <div className="flex gap-3">
              <Link to="/app/groups"><Button variant="hero" className="hover-scale">Create a group</Button></Link>
              <Link to="/app/challenges"><Button variant="outline">Create a challenge</Button></Link>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-[var(--shadow-elegant)]">
            <img src={heroImg} alt="Feature overview: groups, challenges, and logging" className="w-full h-auto" loading="lazy" />
          </div>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Groups</CardTitle>
              <CardDescription>Create a private group and invite friends with a code.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/app/groups"><Button size="sm">Open Groups</Button></Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Challenges</CardTitle>
              <CardDescription>Set frequency, strikes, and penalties. You’re auto-added as participant.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/app/challenges"><Button size="sm">Open Challenges</Button></Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Logging</CardTitle>
              <CardDescription>Tap once per day to mark success. See streaks and tallies.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/app/challenges"><Button size="sm">Start Logging</Button></Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Ledger</CardTitle>
              <CardDescription>Track owed, paid, and adjustments transparently.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/app/ledger"><Button size="sm">Open Ledger</Button></Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Journal</CardTitle>
              <CardDescription>Reflect with private entries and optional group context.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/app/journal"><Button size="sm">Open Journal</Button></Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Ideas & Voting</CardTitle>
              <CardDescription>Propose improvements and vote on what to try next.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/app/ideas"><Button size="sm">Open Ideas</Button></Link>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Features;
