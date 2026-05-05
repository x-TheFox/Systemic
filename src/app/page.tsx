"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { SkillRadar } from "@/components/SkillRadar";
import { SkillTree } from "@/components/SkillTree";
import { PulseFeed } from "@/components/PulseFeed";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { WeeklyAnnouncement } from "@/components/WeeklyAnnouncement";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Trophy, Zap, GitBranch, Brain, BarChart3 } from "lucide-react";
import Link from "next/link";
import { pageEntrance, staggerItem, statReveal } from "@/lib/motion";

export default function Home() {
  const { user, isLoaded } = useUser();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      if (!isLoaded || !user) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/profile?clerkId=${user.id}`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setStats(data.user);
      } catch {
        // Stats will show placeholder
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [isLoaded, user]);

  return (
    <motion.main
      variants={pageEntrance}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-[1440px] px-4 sm:px-6 py-8 space-y-8"
    >
      {/* Hero Stats Row - asymmetric */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-[var(--radius-standard)]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-12 gap-3">
          <motion.div variants={statReveal} className="sm:col-span-4">
            <HeroStatCard
              icon={<Zap className="h-5 w-5" />}
              label="Total XP"
              value={stats?.xp?.toLocaleString() ?? "-"}
              color="accent"
              isHero
            />
          </motion.div>
          <motion.div variants={statReveal} className="sm:col-span-2">
            <StatCard icon={<GitBranch className="h-4 w-4" />} label="Commits" value={stats?.totalCommits?.toLocaleString() ?? "-"} color="cyan" />
          </motion.div>
          <motion.div variants={statReveal} className="sm:col-span-2">
            <StatCard icon={<Brain className="h-4 w-4" />} label="LC Hard" value={stats?.leetcodeHard?.toString() ?? "-"} color="pink" />
          </motion.div>
          <motion.div variants={statReveal} className="sm:col-span-2">
            <StatCard icon={<Trophy className="h-4 w-4" />} label="PRs" value={stats?.totalPRs?.toLocaleString() ?? "-"} color="amber" />
          </motion.div>
          <motion.div variants={statReveal} className="sm:col-span-2">
            <StatCard icon={<Activity className="h-4 w-4" />} label="Status" value={stats ? "Active" : "-"} color="success" />
          </motion.div>
        </div>
      )}

      {/* Weekly Post-Mortem */}
      <motion.div variants={staggerItem}>
        <WeeklyAnnouncement />
      </motion.div>

      {/* Main asymmetric grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column - 60% */}
        <div className="lg:col-span-7 space-y-6">
          {/* Leaderboard Preview */}
          <motion.div variants={staggerItem} className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <h2 className="text-heading text-white">Leaderboard</h2>
              </div>
              <Link
                href="/leaderboard"
                className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors px-3 py-1.5 rounded-[var(--radius-compact)] border border-accent/20 hover:bg-accent/5"
              >
                View All
              </Link>
            </div>
            <LeaderboardTable />
          </motion.div>
        </div>

        {/* Right column - 40% */}
        <div className="lg:col-span-5 space-y-6">
          {/* The Pulse */}
          <motion.div variants={staggerItem} className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-cyan-400" />
              <h2 className="text-heading text-white">The Pulse</h2>
            </div>
            <PulseFeed />
          </motion.div>

          {/* AI Skill Radar */}
          <motion.div variants={staggerItem} className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-accent" />
              <h2 className="text-heading text-white">AI Skill Radar</h2>
            </div>
            <SkillRadar />
          </motion.div>
        </div>
      </div>

      {/* Tech-Tree Progression - full width */}
      <motion.div variants={staggerItem} className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-accent" />
          <h2 className="text-heading text-white">Tech-Tree Progression</h2>
          <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-accent/20 text-accent bg-accent/10 ml-auto">
            AI-GROWN
          </span>
        </div>
        <SkillTree />
      </motion.div>
    </motion.main>
  );
}

function HeroStatCard({ icon, label, value, color, isHero }: { icon: React.ReactNode; label: string; value: string; color: string; isHero?: boolean }) {
  const colorMap: Record<string, string> = {
    accent: "border-accent/20 text-accent",
    cyan: "border-cyan-500/20 text-cyan-400",
    pink: "border-pink-500/20 text-pink-400",
    amber: "border-amber-500/20 text-amber-400",
    success: "border-success/20 text-success",
  };
  const cls = colorMap[color] || colorMap.accent;

  return (
    <div className={`h-full p-5 rounded-[var(--radius-standard)] bg-gradient-to-br from-white/[0.06] to-transparent border ${cls} transition-all hover:shadow-glow`}>
      <div className="mb-2">{icon}</div>
      <div className={`text-stat-lg text-white ${isHero ? "glow-text" : ""}`}>{value}</div>
      <div className="text-label text-fg-muted mt-1">{label}</div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const gradients: Record<string, string> = {
    accent: "from-accent/10 to-accent/5 border-accent/20",
    cyan: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20",
    pink: "from-pink-500/10 to-pink-500/5 border-pink-500/20",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
    success: "from-success/10 to-success/5 border-success/20",
  };
  const iconColors: Record<string, string> = {
    accent: "text-accent",
    cyan: "text-cyan-400",
    pink: "text-pink-400",
    amber: "text-amber-400",
    success: "text-success",
  };

  return (
    <div className={`h-full p-4 rounded-[var(--radius-standard)] bg-gradient-to-br ${gradients[color]} border transition-all hover:shadow-glow`}>
      <div className={`${iconColors[color]} mb-1`}>{icon}</div>
      <div className="text-stat text-white">{value}</div>
      <div className="text-label text-fg-muted mt-1">{label}</div>
    </div>
  );
}
