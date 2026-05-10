"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { SkillRadar } from "@/components/SkillRadar";
import { SkillTree } from "@/components/SkillTree";
import { PulseFeed } from "@/components/PulseFeed";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { WeeklyAnnouncement } from "@/components/WeeklyAnnouncement";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Activity, Trophy, Zap, GitBranch, Brain, BarChart3, LayoutDashboard, RefreshCw, FolderGit2, Users, Target, X, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pageEntrance, staggerItem, statReveal, springBouncy } from "@/lib/motion";
import { toast } from "sonner";

export default function Home() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [leaderboardUsers, setLeaderboardUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [compareSearch, setCompareSearch] = useState("");

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

  async function handleSync() {
    if (!user) return;
    setSyncLoading(true);
    toast.info("Sync triggered in the background...");
    try {
      const res = await fetch("/api/sync-self", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      toast.success("Sync complete! Refresh to see changes.");
    } catch {
      toast.error("Sync failed. Try again later.");
    } finally {
      setSyncLoading(false);
    }
  }

  async function handleDeepDive() {
    if (!user) return;
    setDeepDiveLoading(true);
    toast.info("Deep dive started. Analyzing your entire GitHub history...");
    try {
      const res = await fetch("/api/deepdive-self", { method: "POST" });
      if (!res.ok) throw new Error("Deep dive failed");
      const data = await res.json();
      toast.success(`Deep dive complete! Archetype: ${data.archetype}`);
    } catch {
      toast.error("Deep dive failed. Try again later.");
    } finally {
      setDeepDiveLoading(false);
    }
  }

  async function openCompareModal() {
    setShowCompareModal(true);
    setCompareSearch("");
    if (leaderboardUsers.length > 0) return;
    setUsersLoading(true);
    try {
      const res = await fetch("/api/leaderboard?limit=100");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setLeaderboardUsers(data.users || []);
    } catch {
      toast.error("Failed to load users.");
    } finally {
      setUsersLoading(false);
    }
  }

  function handleCompareUser(targetHandle: string) {
    const myHandle = stats?.githubHandle;
    if (!myHandle) {
      toast.error("Your GitHub handle is not set. Update your profile first.");
      return;
    }
    router.push(`/compare/${encodeURIComponent(myHandle)}/${encodeURIComponent(targetHandle)}`);
    setShowCompareModal(false);
  }

  const filteredUsers = leaderboardUsers.filter((u) => {
    const q = compareSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.githubHandle?.toLowerCase().includes(q)
    );
  }).filter((u) => u.githubHandle !== stats?.githubHandle);

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
          <ActionBtn
            icon={syncLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            label="Sync Identity"
            onClick={handleSync}
            disabled={syncLoading || !isLoaded || !user}
          />
          <ActionBtn
            icon={deepDiveLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />}
            label="Deep Dive"
            active
            onClick={handleDeepDive}
            disabled={deepDiveLoading || !isLoaded || !user}
          />
          <Link href="/guilds">
            <ActionBtn icon={<Users className="h-3.5 w-3.5" />} label="Guilds" />
          </Link>
          <ActionBtn
            icon={<FolderGit2 className="h-3.5 w-3.5" />}
            label="Compare"
            onClick={openCompareModal}
            disabled={!isLoaded || !user}
          />
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
              <PulseFeed collapsed previewCount={3} />
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

      {/* ============================================================== */}
      {/* COMPARE MODAL */}
      {/* ============================================================== */}
      <AnimatePresence>
        {showCompareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCompareModal(false)}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={springBouncy}
              className="relative w-full max-w-md max-h-[75vh] flex flex-col rounded-2xl border border-white/[0.08] bg-[#0d0d10] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center gap-2.5">
                  <FolderGit2 className="h-4 w-4 text-violet-400" />
                  <h2 className="text-sm font-semibold text-white tracking-wide">Compare With</h2>
                </div>
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 py-3 border-b border-white/[0.04] shrink-0">
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#111113] border border-white/[0.06]">
                  <Search className="h-3.5 w-3.5 text-white/30 shrink-0" />
                  <input
                    type="text"
                    value={compareSearch}
                    onChange={(e) => setCompareSearch(e.target.value)}
                    placeholder="Search by name or GitHub handle..."
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {/* User List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {usersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-xl bg-[#111113] border border-white/[0.04] animate-pulse" />
                  ))
                ) : filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-white/30">
                    <Users className="h-6 w-6 mb-2 opacity-40" />
                    <p className="text-xs font-medium">No users found</p>
                  </div>
                ) : (
                  filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleCompareUser(u.githubHandle)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#111113] hover:bg-[#18181b] border border-white/[0.04] hover:border-white/[0.12] transition-all duration-200 text-left"
                    >
                      <Avatar className="h-9 w-9 rounded-lg shrink-0">
                        <AvatarImage src={u.imageUrl || undefined} />
                        <AvatarFallback className="bg-[#18181b] text-white/50 text-sm rounded-lg">
                          {(u.name || u.githubHandle || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white/90 truncate">{u.name || u.githubHandle}</p>
                        {u.githubHandle && <p className="text-[11px] text-white/35 truncate">@{u.githubHandle}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[12px] font-bold font-mono text-amber-400">{u.xp?.toLocaleString()}</p>
                        <p className="text-[9px] uppercase tracking-widest font-semibold text-white/30">XP</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

// -------------------------------------------------------------------------------- //
// HELPER COMPONENTS
// -------------------------------------------------------------------------------- //

function ActionBtn({ icon, label, active, onClick, disabled }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-all duration-200 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed
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

