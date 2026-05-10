"use client";

import { useState, useEffect } from "react";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { GuildLeaderboard } from "@/components/GuildLeaderboard";
import { PulseFeed } from "@/components/PulseFeed";
import Link from "next/link";
import { ArrowLeft, Trophy, Shield, Activity, Users, Zap, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { pageEntrance, staggerItem, statReveal } from "@/lib/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@clerk/nextjs";

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"players" | "guilds">("players");
  const { user, isLoaded } = useUser();
  const [stats, setStats] = useState<any>(null);
  const [globalStats, setGlobalStats] = useState({ totalDevs: 0, topGuild: "-" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      if (!isLoaded || !user) {
        setLoading(false);
        return;
      }
      try {
        const [profileRes, leaderboardRes] = await Promise.all([
          fetch(`/api/profile?clerkId=${user.id}`),
          fetch(`/api/leaderboard`)
        ]);
        if (profileRes.ok) {
          const data = await profileRes.json();
          setStats(data.user);
        }
        if (leaderboardRes.ok) {
          const lbData = await leaderboardRes.json();
          setGlobalStats({
            totalDevs: lbData.users?.length || 0,
            topGuild: lbData.guilds?.[0]?.name || "-",
          });
        }
      } catch {
        // Silent catch for stats
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
      className="mx-auto max-w-[1440px] px-4 sm:px-6 py-8 space-y-10 min-h-screen"
    >
      {/* ============================================================== */}
      {/* 1. HERO / GLOBAL RANKING HEADER */}
      {/* ============================================================== */}
      <motion.div variants={staggerItem} className="flex flex-col gap-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-[#111113] border border-white/[0.06] text-white/50 hover:text-white hover:bg-[#18181b] hover:border-white/15 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-white/40 mb-1">
              <Trophy className="h-4 w-4" />
              <span className="text-[10px] font-semibold uppercase tracking-widest">Global Standings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">Leaderboard System</h1>
          </div>
        </div>

        {/* Global Stats Row */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl bg-[#111113] border border-white/[0.06]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Your Current XP" value={stats?.xp?.toLocaleString() || "0"} icon={<Zap className="h-4 w-4 text-violet-400" />} />
            <StatCard label="Your Rank" value={stats?.title || "Unranked"} icon={<TrendingUp className="h-4 w-4 text-cyan-400" />} />
            <StatCard label="Active Operatives" value={globalStats.totalDevs.toString()} icon={<Users className="h-4 w-4 text-amber-400" />} />
            <StatCard label="Leading Guild" value={globalStats.topGuild} icon={<Shield className="h-4 w-4 text-pink-400" />} />
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ============================================================== */}
        {/* LEADERBOARD (LEFT 8 COLS) */}
        {/* ============================================================== */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <motion.div variants={staggerItem} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
            {/* Tab Controls (Filters) */}
            <div className="flex bg-[#111113] p-1 rounded-xl border border-white/[0.06] shrink-0">
              <button
                onClick={() => setTab("players")}
                className={`flex items-center gap-2 px-5 py-2 text-xs font-bold transition-all rounded-lg ${
                  tab === "players"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-white/40 hover:text-white hover:bg-white/[0.02]"
                }`}
              >
                <Trophy className="h-3.5 w-3.5" />
                PLAYERS
              </button>
              <button
                onClick={() => setTab("guilds")}
                className={`flex items-center gap-2 px-5 py-2 text-xs font-bold transition-all rounded-lg ${
                  tab === "guilds"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-white/40 hover:text-white hover:bg-white/[0.02]"
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                GUILDS
              </button>
            </div>
            <p className="text-[11px] text-white/40 font-mono tracking-wider hidden sm:block">UPDATING IN REAL-TIME</p>
          </motion.div>

          <motion.div variants={staggerItem} className="bg-[#0b0b0e] border border-white/[0.04] p-4 sm:p-6 lg:p-8 rounded-2xl w-full">
            {tab === "players" ? <LeaderboardTable /> : <GuildLeaderboard />}
          </motion.div>
        </div>

        {/* ============================================================== */}
        {/* LIVE ACTIVITY / PULSE PANEL (RIGHT 4 COLS) */}
        {/* ============================================================== */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <motion.div variants={staggerItem} className="flex items-center gap-2.5 pb-2 border-b border-white/[0.06]">
            <Activity className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide">Telemetry Feed</h2>
          </motion.div>
          
          <motion.div variants={staggerItem} className="bg-[#111113] border border-white/[0.06] rounded-2xl p-4 sm:p-6">
            <PulseFeed collapsed />
          </motion.div>
        </div>
      </div>
    </motion.main>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <motion.div variants={statReveal} className="relative group overflow-hidden rounded-xl p-4 sm:p-5 bg-[#111113] border border-white/[0.06] hover:border-white/[0.12] transition-colors duration-200">
      <div className="absolute top-0 left-0 right-0 h-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-violet-500/50 to-cyan-500/50" />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
          {icon}
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-white truncate">{label}</span>
        </div>
        <div className="text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight text-white/90 group-hover:text-white transition-colors truncate">
          {value}
        </div>
      </div>
    </motion.div>
  );
}
