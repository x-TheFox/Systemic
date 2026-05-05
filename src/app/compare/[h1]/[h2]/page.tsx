"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, ArrowLeft, GitBranch, Sparkles, Zap, Star, GitCommit, Layers, Target, AlertTriangle, TrendingUp } from "lucide-react";
import { pageEntrance, staggerItem, fadeUpItem } from "@/lib/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { toast } from "sonner";

interface CompareUser {
  id: string;
  name: string | null;
  email: string;
  imageUrl: string | null;
  githubHandle: string | null;
  title: string | null;
  xp: number;
  totalCommits: number;
  totalPRs: number;
  leetcodeHard: number;
  codeforcesRating: number;
  hackerrankBadges: number;
  badges: any[];
}

interface DeepDiveRepo {
  name: string;
  language: string | null;
  commits: number;
  stars: number;
}

interface DeepDiveDev {
  githubHandle: string;
  archetype: string;
  grindPath: string;
  dominantPath: string;
  topLanguages: string;
  repos: DeepDiveRepo[];
  strengths: string[];
  gaps: string[];
  skillSignals: Record<string, number>;
}

interface DeepDiveComparison {
  comparison: string;
  dev1: DeepDiveDev;
  dev2: DeepDiveDev;
}

export default function ComparePage() {
  const params = useParams();
  const h1 = params.h1 as string;
  const h2 = params.h2 as string;
  const { user: clerkUser } = useUser();
  const [data, setData] = useState<{ user1: CompareUser; user2: CompareUser; commonBadges: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [deepDive, setDeepDive] = useState<DeepDiveComparison | null>(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/compare?h1=${h1}&h2=${h2}`);
        if (!res.ok) throw new Error("Failed");
        const d = await res.json();
        setData(d);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [h1, h2]);

  async function challengeToDuel(opponentHandle: string) {
    try {
      const res = await fetch("/api/duels/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentHandle }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Duel challenge sent!");
    } catch {
      toast.error("Failed to send duel challenge.");
    }
  }

  async function generateDeepDive() {
    setDeepDiveLoading(true);
    try {
      const res = await fetch("/api/deepdive/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubHandle1: h1, githubHandle2: h2 }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate comparison");
      }
      const d = await res.json();
      setDeepDive(d);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate AI comparison.");
    } finally {
      setDeepDiveLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-96 h-96 rounded-[var(--radius-container)]" />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center text-fg-muted">
        Failed to load comparison.
      </main>
    );
  }

  const { user1, user2, commonBadges } = data;

  const stats = [
    { label: "XP", k1: "xp", k2: "xp" },
    { label: "Commits", k1: "totalCommits", k2: "totalCommits" },
    { label: "PRs", k1: "totalPRs", k2: "totalPRs" },
    { label: "LC Hard", k1: "leetcodeHard", k2: "leetcodeHard" },
    { label: "CF Rating", k1: "codeforcesRating", k2: "codeforcesRating" },
    { label: "HR Badges", k1: "hackerrankBadges", k2: "hackerrankBadges" },
  ];

  const comparisonSections = deepDive
    ? deepDive.comparison
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .reduce<{ title: string; content: string }[]>((acc, line) => {
          const match = line.match(/^([A-Z_]+):\s*(.+)$/);
          if (match) {
            const title = match[1].replace(/_/g, ' ');
            acc.push({ title, content: match[2] });
          } else if (acc.length > 0) {
            acc[acc.length - 1].content += ' ' + line;
          }
          return acc;
        }, [])
    : [];

  return (
    <motion.main
      variants={pageEntrance}
      initial="hidden"
      animate="visible"
      className="min-h-screen p-4 md:p-8"
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <motion.div variants={staggerItem} className="flex items-center gap-4">
          <Link href="/leaderboard" className="inline-flex items-center justify-center h-9 w-9 rounded-[var(--radius-compact)] border border-white/[0.08] text-fg-dim hover:text-white hover:bg-white/[0.04] transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-display gradient-text">VS</h1>
        </motion.div>

        {/* Players */}
        <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[user1, user2].map((u) => (
            <div key={u.id} className="glass-card p-6 text-center">
              <Avatar className="h-16 w-16 mx-auto border-2 border-accent/40">
                <AvatarImage src={u.imageUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-accent to-cyan-500 text-white text-xl font-bold">
                  {(u.name || u.email).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-lg font-bold text-white mt-3">{u.name || u.email.split("@")[0]}</h2>
              {u.title && <p className="text-sm text-amber-400 mt-1">{u.title}</p>}
              <p className="text-2xl font-bold font-mono text-white mt-2">{u.xp.toLocaleString()} <span className="text-accent text-sm">XP</span></p>
              {clerkUser && u.githubHandle &&
                clerkUser.username?.toLowerCase() !== u.githubHandle.toLowerCase() && (
                <button
                  onClick={() => challengeToDuel(u.githubHandle!)}
                  className="mt-3 h-8 px-4 rounded-[var(--radius-compact)] bg-accent/10 border border-accent/30 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors"
                >
                  <Swords className="h-3.5 w-3.5 inline mr-1" />
                  Challenge to Duel
                </button>
              )}
            </div>
          ))}
        </motion.div>

        {/* Stats comparison */}
        <motion.div variants={staggerItem} className="glass-card p-6 space-y-4">
          <h2 className="text-heading text-white">Head-to-Head</h2>
          {stats.map((stat) => {
            const v1 = (user1 as any)[stat.k1] || 0;
            const v2 = (user2 as any)[stat.k2] || 0;
            const max = Math.max(v1, v2, 1);
            const p1 = (v1 / max) * 100;
            const p2 = (v2 / max) * 100;
            const winner = v1 > v2 ? 1 : v2 > v1 ? 2 : 0;

            return (
              <div key={stat.label} className="space-y-1">
                <div className="flex justify-between text-xs text-fg-dim">
                  <span className={winner === 1 ? "text-accent font-bold" : ""}>{v1.toLocaleString()}</span>
                  <span className="font-semibold">{stat.label}</span>
                  <span className={winner === 2 ? "text-accent font-bold" : ""}>{v2.toLocaleString()}</span>
                </div>
                <div className="flex gap-1 h-2">
                  <div className="flex-1 bg-white/[0.04] rounded-l-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-accent to-cyan-500 rounded-l-full transition-all" style={{ width: `${p1}%` }} />
                  </div>
                  <div className="flex-1 bg-white/[0.04] rounded-r-full overflow-hidden">
                    <div className="h-full bg-gradient-to-l from-accent to-cyan-500 rounded-r-full transition-all" style={{ width: `${p2}%`, marginLeft: 'auto' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Common badges */}
        {commonBadges.length > 0 && (
          <motion.div variants={staggerItem} className="glass-card p-6">
            <h2 className="text-heading text-white mb-3">Shared Badges</h2>
            <div className="flex flex-wrap gap-2">
              {commonBadges.map((badge: any) => (
                <span key={badge.id} className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-fg-dim">
                  {badge.name}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* AI Deep Dive Analysis */}
        <motion.div variants={staggerItem} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-heading text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              AI Deep Dive Analysis
            </h2>
            {!deepDive && (
              <button
                onClick={generateDeepDive}
                disabled={deepDiveLoading}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-[var(--radius-compact)] bg-accent/10 border border-accent/30 text-accent text-sm font-semibold hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deepDiveLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Generate AI Comparison
                  </>
                )}
              </button>
            )}
          </div>

          <AnimatePresence>
            {deepDive && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                {/* AI Comparison Card */}
                <div className="glass-card p-6 glow-border">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-accent" />
                    </div>
                    <h3 className="text-subheading text-white">Generated Analysis</h3>
                  </div>
                  <div className="space-y-4">
                    {comparisonSections.map((section, i) => (
                      <div key={i} className="space-y-1">
                        <h4 className="text-label text-accent">{section.title}</h4>
                        <p className="text-body text-fg-dim leading-relaxed">{section.content}</p>
                      </div>
                    ))}
                    {comparisonSections.length === 0 && (
                      <p className="text-body text-fg-dim leading-relaxed whitespace-pre-wrap">{deepDive.comparison}</p>
                    )}
                  </div>
                </div>

                {/* Developer Profiles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[deepDive.dev1, deepDive.dev2].map((dev, i) => (
                    <motion.div
                      key={dev.githubHandle}
                      variants={fadeUpItem}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: i * 0.1 }}
                      className="glass-card p-5 space-y-4"
                    >
                      {/* Header */}
                      <div className="space-y-1">
                        <h3 className="text-subheading text-white">{dev.githubHandle}</h3>
                        <p className="text-sm text-amber-400">{dev.archetype}</p>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-xs text-accent font-medium mt-1">
                          <Target className="h-3 w-3" />
                          {dev.dominantPath}
                        </div>
                      </div>

                      {/* Skill Signals */}
                      {Object.keys(dev.skillSignals).length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-label text-fg-dim flex items-center gap-1.5">
                            <Layers className="h-3 w-3" />
                            Skill Signals
                          </h4>
                          <div className="space-y-1.5">
                            {Object.entries(dev.skillSignals)
                              .filter(([, v]) => typeof v === 'number' && v > 0)
                              .sort(([, a], [, b]) => (b as number) - (a as number))
                              .slice(0, 5)
                              .map(([skill, score]) => (
                                <div key={skill} className="flex items-center gap-2">
                                  <span className="text-xs text-fg-dim capitalize w-24 shrink-0">{skill.replace(/([A-Z])/g, ' $1').trim()}</span>
                                  <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-accent to-cyan-500 rounded-full"
                                      style={{ width: `${Math.min(100, (score as number) * 4)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-mono text-fg-muted w-8 text-right">{score}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Top Repos */}
                      {dev.repos.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-label text-fg-dim flex items-center gap-1.5">
                            <GitBranch className="h-3 w-3" />
                            Top Repositories
                          </h4>
                          <div className="space-y-1.5">
                            {dev.repos.slice(0, 4).map((repo) => (
                              <div key={repo.name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <GitCommit className="h-3 w-3 text-fg-muted shrink-0" />
                                  <span className="text-white truncate">{repo.name}</span>
                                  {repo.language && (
                                    <span className="text-fg-muted shrink-0">{repo.language}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0 text-fg-muted">
                                  <span className="flex items-center gap-0.5">
                                    <Star className="h-3 w-3" />
                                    {repo.stars}
                                  </span>
                                  <span>{repo.commits}c</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Strengths & Gaps */}
                      <div className="grid grid-cols-1 gap-3">
                        {dev.strengths.length > 0 && (
                          <div className="space-y-1.5">
                            <h4 className="text-label text-success flex items-center gap-1.5">
                              <TrendingUp className="h-3 w-3" />
                              Strengths
                            </h4>
                            <ul className="space-y-1">
                              {dev.strengths.slice(0, 3).map((s, idx) => (
                                <li key={idx} className="text-xs text-fg-dim flex items-start gap-1.5">
                                  <span className="text-success mt-0.5">+</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {dev.gaps.length > 0 && (
                          <div className="space-y-1.5">
                            <h4 className="text-label text-destructive flex items-center gap-1.5">
                              <AlertTriangle className="h-3 w-3" />
                              Gaps
                            </h4>
                            <ul className="space-y-1">
                              {dev.gaps.slice(0, 3).map((g, idx) => (
                                <li key={idx} className="text-xs text-fg-dim flex items-start gap-1.5">
                                  <span className="text-destructive mt-0.5">-</span>
                                  <span>{g}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.main>
  );
}
