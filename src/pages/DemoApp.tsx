import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface Participant { id: string; name: string; }
interface Challenge {
  id: string;
  title: string;
  description: string;
  frequency: "daily" | "weekly";
  penalty: number; // per failure
  strikeAllowance?: number;
  participants: string[]; // participant ids
}

interface LogEntry { id: string; challengeId: string; date: string; userId: string; success: boolean; note?: string }

const seedParticipants: Participant[] = [
  { id: "u1", name: "Alex" },
  { id: "u2", name: "Sam" },
  { id: "u3", name: "Jordan" },
];

const seedChallenges: Challenge[] = [
  {
    id: "c1",
    title: "Morning Run",
    description: "Run at least 2km before 9am",
    frequency: "daily",
    penalty: 2,
    strikeAllowance: 1,
    participants: ["u1", "u2", "u3"],
  },
  {
    id: "c2",
    title: "No Sugar After 8pm",
    description: "Skip sugary snacks late at night",
    frequency: "daily",
    penalty: 1,
    participants: ["u1", "u2"],
  },
];

export default function DemoApp() {
  const [participants] = useState<Participant[]>(seedParticipants);
  const [challenges, setChallenges] = useState<Challenge[]>(seedChallenges);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [newIdea, setNewIdea] = useState("");
  const [journalText, setJournalText] = useState("");

  const toggleLog = (challengeId: string, userId: string, date: string) => {
    const key = `${challengeId}-${userId}-${date}`;
    const existing = logs.find(l => `${l.challengeId}-${l.userId}-${l.date}` === key);
    if (existing) {
      setLogs(prev => prev.filter(l => l.id !== existing.id));
    } else {
      setLogs(prev => [...prev, { id: key, challengeId, userId, date, success: true }]);
    }
  };

  const today = new Date();
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const failuresByUser = participants.reduce<Record<string, number>>((acc, p) => {
    const fails = challenges.reduce((sum, ch) => {
      const relevant = logs.filter(l => l.challengeId === ch.id && ch.participants.includes(p.id));
      const successCount = relevant.filter(r => r.success).length;
      const expected = ch.frequency === "daily" ? last7.length : 1; // simplified window
      const misses = Math.max(0, expected - successCount - (ch.strikeAllowance ?? 0));
      return sum + misses * ch.penalty;
    }, 0);
    acc[p.id] = fails;
    return acc;
  }, {});

  return (
    <div className="container py-8">
      <Helmet>
        <title>Character-Enhancement Demo | Challenges & Ledger</title>
        <meta name="description" content="Try the Character-Enhancement Challenge app demo: track habits, log results, and view friendly penalties & ideas." />
        <link rel="canonical" href="/app" />
      </Helmet>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Your Group Workspace</h1>
        <p className="text-muted-foreground">Explore the core flows with sample data. Connect Supabase later for real accounts, groups, and realtime sync.</p>
      </div>

      <Tabs defaultValue="challenges" className="animate-enter">
        <TabsList className="mb-4">
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="ideas">Ideas</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="tips">Tips</TabsTrigger>
        </TabsList>

        <TabsContent value="challenges" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Challenges</CardTitle>
              <CardDescription>Log today’s progress for each participant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {challenges.map(ch => (
                  <div key={ch.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h3 className="font-semibold">{ch.title}</h3>
                        <p className="text-sm text-muted-foreground">{ch.description}</p>
                        <p className="text-sm mt-1 text-muted-foreground">Penalty: ${ch.penalty} • {ch.frequency} • Strikes: {ch.strikeAllowance ?? 0}</p>
                      </div>
                      <Button variant="outline" size="sm" className="hover-scale">Edit</Button>
                    </div>
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-left p-2">Participant</th>
                            {last7.map(d => (
                              <th key={d} className="p-2 text-center">{d.slice(5)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {participants.filter(p => ch.participants.includes(p.id)).map(p => (
                            <tr key={p.id} className="border-t">
                              <td className="p-2 font-medium">{p.name}</td>
                              {last7.map(d => {
                                const has = logs.some(l => l.userId === p.id && l.challengeId === ch.id && l.date === d);
                                return (
                                  <td key={d} className="p-2 text-center">
                                    <Button
                                      size="sm"
                                      variant={has ? "secondary" : "outline"}
                                      onClick={() => toggleLog(ch.id, p.id, d)}
                                    >
                                      {has ? "✓" : "—"}
                                    </Button>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <CardTitle>Friendly Penalties Ledger</CardTitle>
              <CardDescription>Auto-calculated from recent logs (demo)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                {participants.map(p => (
                  <div key={p.id} className="rounded-lg border p-4 bg-card/50">
                    <div className="text-sm text-muted-foreground">{p.name}</div>
                    <div className="text-2xl font-semibold">${failuresByUser[p.id] ?? 0}</div>
                    <Button size="sm" className="mt-2" variant="outline">Mark Paid</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ideas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Idea Library</CardTitle>
              <CardDescription>Suggest, comment and vote on new challenges</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Propose a new challenge idea" value={newIdea} onChange={e => setNewIdea(e.target.value)} />
                <Button onClick={() => setNewIdea("")}>Submit</Button>
              </div>
              <div className="text-sm text-muted-foreground">Voting & comments will be enabled after Supabase is connected.</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Reflection Journal</CardTitle>
              <CardDescription>Write a note about today’s experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea placeholder="What went well? What could improve?" value={journalText} onChange={e => setJournalText(e.target.value)} />
              <Button onClick={() => setJournalText("")}>Save Entry</Button>
              <div className="text-sm text-muted-foreground">Entries will sync across devices once Supabase is connected.</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tips">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Techniques</CardTitle>
              <CardDescription>Browse techniques and schedule mini-challenges</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li><span className="font-medium">Big-Baby Pivot:</span> Acknowledge emotions first, then redirect constructively.</li>
                <li><span className="font-medium">Mood Match:</span> Mirror tone and energy before guiding the conversation.</li>
                <li><span className="font-medium">Curious Probe:</span> Ask open questions to uncover root causes.</li>
              </ul>
              <Button className="mt-4" variant="outline">Schedule as mini-challenge</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
