"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Swords, Trophy, ArrowLeft, GitBranch, Code2 } from "lucide-react";
import { pageEntrance, staggerItem } from "@/lib/motion";
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

export default function ComparePage() {
  const params = useParams();
  const h1 = params.h1 as string;
  const h2 = params.h2 as string;
  const { user: clerkUser } = useUser();
  const [data, setData] = useState<{ user1: CompareUser; user2: CompareUser; commonBadges: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

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
          {[user1, user2].map((u, i) => (
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
      </div>
    </motion.main>
  );
}
