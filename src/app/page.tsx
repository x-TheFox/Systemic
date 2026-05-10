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
import { Activity, Trophy, Zap, GitBranch, Brain, BarChart3, LayoutDashboard, RefreshCw, FolderGit2, Users, Target } from "lucide-react";
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
      className="mx-auto max-w-[1440px] px-4 sm:px-6 py-8 space-y-10"
    >
      {/* ============================================================== */}
      {/* 1. HERO OVERVIEW SECTION */}
      {/* ============================================================== */}
      <motion.div variants={staggerItem} className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-white/[0.06]">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white/40 mb-1">
            <LayoutDashboard className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">Dashboard System</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            {loading ? "Booting System..." : `Welcome back, ${stats?.name?.split(" ")[0] || stats?.githubHandle || "Agent"}`}
          </h1>
          <p className="text-sm text-white/50">
            {stats?.title ? `Rank: ${stats.title} · ` : ""}Your unified developer telemetry and activity feeds.
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0 hide-scrollbar shrink-0">
          <ActionBtn icon={<RefreshCw className="h-3.5 w-3.5" />} label="Sync Identity" />
          <ActionBtn icon={<Target className="h-3.5 w-3.5" />} label="Deep Dive" active />
          <ActionBtn icon={<Users className="h-3.5 w-3.5" />} label="Guilds" />
          <ActionBtn icon={<FolderGit2 className="h-3.5 w-3.5" />} label="Compare" />
        </div>
      </motion.div>

      <WeeklyAnnouncement />

      {/* ============================================================== */}
      {/* 2. ANALYTICS SECTION */}
      {/* ============================================================== */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-[#111113] border border-white/[0.06]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <MetricCard
            title="Total XP"
            value={stats?.xp?.toLocaleString() ?? "-"}
            icon={<Zap className="w-4 h-4 text-violet-400" />}
            color="bg-violet-500"
            isPrimary
          />
          <MetricCard
            title="Total Commits"
            value={stats?.totalCommits?.toLocaleString() ?? "-"}
            icon={<GitBranch className="w-4 h-4 text-cyan-400" />}
            color="bg-cyan-500"
          />
          <MetricCard
            title="Pull Requests"
            value={stats?.totalPRs?.toLocaleString() ?? "-"}
            icon={<Trophy className="w-4 h-4 text-amber-400" />}
            color="bg-amber-500"
          />
          <MetricCard
            title="LC Hard"
            value={stats?.leetcodeHard?.toString() ?? "-"}
            icon={<Brain className="w-4 h-4 text-pink-400" />}
            color="bg-pink-500"
          />
          <MetricCard
            title="System Status"
            value={stats ? "Online" : "Unknown"}
            icon={<Activity className="w-4 h-4 text-green-400" />}
            color="bg-green-500"
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* 3 & 4. MAIN GRID (Leaderboard + Pulse + AI) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column - 7/12 */}
        <div className="lg:col-span-7 space-y-6">
          <motion.div variants={staggerItem} className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white tracking-wide">Elite Leaderboard</h2>
              </div>
              <Link
                href="/leaderboard"
                className="text-[11px] font-medium text-white/40 hover:text-white transition-colors bg-[#111113] hover:bg-[#18181b] px-3 py-1.5 rounded-lg border border-white/[0.06]"
              >
                View Global
              </Link>
            </div>
            
            <div className="bg-[#111113] border border-white/[0.06] rounded-2xl p-6 sm:p-8">
              <LeaderboardTable />
            </div>
          </motion.div>
        </div>

        {/* Right column - 5/12 */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          {/* Activity Feed */}
          <motion.div variants={staggerItem} className="flex flex-col gap-5 flex-1">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white tracking-wide">Network Activity</h2>
            </div>
            <div className="bg-[#111113] border border-white/[0.06] rounded-2xl p-5 md:p-6 flex-1 min-h-[350px]">
              <PulseFeed />
            </div>
          </motion.div>

          {/* AI Skill Radar */}
          <motion.div variants={staggerItem} className="flex flex-col gap-5 mt-6">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white tracking-wide">Neural Skill Radar</h2>
            </div>
            <div className="bg-[#111113] border border-white/[0.06] rounded-2xl p-5 md:p-6">
              <SkillRadar />
            </div>
          </motion.div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. TECH TREE */}
      {/* ============================================================== */}
      <motion.div variants={staggerItem} className="flex flex-col gap-5">
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white tracking-wide">Career Progression Tree</h2>
          <span className="text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 rounded-md border border-violet-500/20 text-violet-300/80 bg-violet-500/10 ml-auto">
            AI-Governed
          </span>
        </div>
        <div className="bg-[#111113] border border-white/[0.06] rounded-2xl p-6">
          <SkillTree />
        </div>
      </motion.div>
    </motion.main>
  );
}

// -------------------------------------------------------------------------------- //
// HELPER COMPONENTS
// -------------------------------------------------------------------------------- //

function ActionBtn({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-all duration-200 shrink-0
      ${active 
        ? "bg-white/10 text-white border-white/15 hover:bg-white/15" 
        : "bg-[#111113] text-white/60 border-white/[0.06] hover:bg-[#18181b] hover:text-white hover:border-white/15"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MetricCard({ title, value, icon, color, isPrimary }: { title: string; value: string; icon: React.ReactNode; color: string; isPrimary?: boolean }) {
  return (
    <motion.div variants={statReveal} className={`group relative overflow-hidden rounded-xl p-4 sm:p-5 bg-[#111113] border border-white/[0.06] hover:border-white/[0.12] transition-colors duration-200 ${isPrimary ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
      {/* Top Accent Line */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${color}`} />
      
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">{icon}</div>
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-white/40 truncate">{title}</span>
        </div>
        <div className={`text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight text-white/90 group-hover:text-white transition-colors`}>{value}</div>
      </div>
    </motion.div>
  );
}

