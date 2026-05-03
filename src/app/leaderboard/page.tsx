"use client";

import { useState } from "react";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { GuildLeaderboard } from "@/components/GuildLeaderboard";
import Link from "next/link";
import { ArrowLeft, Trophy, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { pageEntrance, staggerItem } from "@/lib/motion";

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"players" | "guilds">("players");

  return (
    <motion.main
      variants={pageEntrance}
      initial="hidden"
      animate="visible"
      className="min-h-screen p-4 md:p-8"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <motion.div variants={staggerItem} className="flex items-center gap-4 flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center justify-center h-9 w-9 rounded-[var(--radius-compact)] border border-white/[0.08] text-fg-dim hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-amber-400" />
            <h1 className="text-display gradient-text">Leaderboard</h1>
          </div>
          <p className="hidden sm:block text-sm text-fg-muted ml-auto">
            Only the committed survive.
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={staggerItem} className="flex gap-2">
          <button
            onClick={() => setTab("players")}
            className={`px-4 py-2 text-sm font-semibold rounded-[var(--radius-compact)] border transition-colors inline-flex items-center gap-1.5 ${
              tab === "players"
                ? "bg-accent/10 border-accent/30 text-accent"
                : "border-white/[0.06] text-fg-muted hover:text-fg-dim"
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            Players
          </button>
          <button
            onClick={() => setTab("guilds")}
            className={`px-4 py-2 text-sm font-semibold rounded-[var(--radius-compact)] border transition-colors inline-flex items-center gap-1.5 ${
              tab === "guilds"
                ? "bg-accent/10 border-accent/30 text-accent"
                : "border-white/[0.06] text-fg-muted hover:text-fg-dim"
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Guilds
          </button>
        </motion.div>

        <motion.div variants={staggerItem} className="glass-card p-6">
          {tab === "players" ? <LeaderboardTable /> : <GuildLeaderboard />}
        </motion.div>
      </div>
    </motion.main>
  );
}
