"use client";

import { LeaderboardTable } from "@/components/LeaderboardTable";
import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { pageEntrance, staggerItem } from "@/lib/motion";

export default function LeaderboardPage() {
  return (
    <motion.main
      variants={pageEntrance}
      initial="hidden"
      animate="visible"
      className="min-h-screen p-4 md:p-8"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <motion.div variants={staggerItem} className="flex items-center gap-4">
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

        <motion.div variants={staggerItem} className="glass-card p-6">
          <LeaderboardTable />
        </motion.div>
      </div>
    </motion.main>
  );
}
