"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { podiumContainer, podiumItem, rankContainer, rankItem } from "@/lib/motion";

interface WeeklyBadge {
  id: string;
  name: string;
  description: string;
  rarity: string;
  color: string;
  icon: string;
  category: string;
}

interface LeaderboardUser {
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
  skillTreeState?: { currentGrind: string | null } | null;
  badges?: WeeklyBadge[];
  previousRank?: number | null;
}

const podiumConfig: Record<number, {
  src: string;
  title: string;
  subtitle: string;
  color: string;
  ring: string;
  shadow: string;
  border: string;
  nameColor: string;
  bgGradient: string;
}> = {
  1: {
    src: "/badges/mvp.svg",
    title: "THE HONORED ONE",
    subtitle: "1ST PLACE",
    color: "#f59e0b",
    ring: "ring-2 ring-yellow-500/80",
    shadow: "0 0 40px rgba(245,158,11,0.5), 0 0 80px rgba(245,158,11,0.2)",
    border: "border-yellow-500/30",
    nameColor: "text-yellow-400",
    bgGradient: "from-yellow-500/10 to-yellow-500/5",
  },
  2: {
    src: "/badges/2nd.svg",
    title: "SILVER RUNNER",
    subtitle: "2ND PLACE",
    color: "#a855f7",
    ring: "ring-2 ring-purple-500/80",
    shadow: "0 0 30px rgba(168,85,247,0.4), 0 0 60px rgba(168,85,247,0.15)",
    border: "border-purple-500/30",
    nameColor: "text-purple-400",
    bgGradient: "from-purple-500/10 to-purple-500/5",
  },
  3: {
    src: "/badges/3rd.svg",
    title: "BRONZE CHALLENGER",
    subtitle: "3RD PLACE",
    color: "#3b82f6",
    ring: "ring-2 ring-blue-500/80",
    shadow: "0 0 25px rgba(59,130,246,0.35), 0 0 50px rgba(59,130,246,0.1)",
    border: "border-blue-500/30",
    nameColor: "text-blue-400",
    bgGradient: "from-blue-500/10 to-blue-500/5",
  },
};

const bottomBadgeConfig: Record<string, { src: string; label: string; color: string; border: string; shadow: string }> = {
  "svg:last1": { src: "/badges/last1.svg", label: "THE LURKER", color: "#6b7280", border: "border-gray-500/30", shadow: "0 0 15px rgba(107,114,128,0.25)" },
  "svg:last2": { src: "/badges/last2.svg", label: "THE PENULTIMATE", color: "#6b7280", border: "border-gray-500/30", shadow: "0 0 15px rgba(107,114,128,0.25)" },
};

export function LeaderboardTable() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/leaderboard");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setUsers(data.users || []);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-[var(--radius-standard)]" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-fg-muted">
        No players yet. Be the first to sync!
      </div>
    );
  }

  const maxXP = Math.max(...users.map((u) => u.xp), 1);
  const top3 = users.slice(0, 3);
  const bottom2 = users.length >= 4 ? users.slice(-2) : [];
  const middleUsers = users.length >= 4 ? users.slice(3, -2) : users.slice(3);

  function getBottomBadge(user: LeaderboardUser) {
    if (!user.badges || user.badges.length === 0) return null;
    const icon = user.badges[0].icon;
    if (bottomBadgeConfig[icon]) return bottomBadgeConfig[icon];
    return null;
  }

  function getRankChange(user: LeaderboardUser, currentRank: number) {
    if (user.previousRank == null) return null;
    const change = user.previousRank - currentRank;
    if (change > 0) return { direction: "up" as const, value: change };
    if (change < 0) return { direction: "down" as const, value: Math.abs(change) };
    return null;
  }

  return (
    <div className="space-y-8">
      {/* ── Podium — Top 3 (asymmetric) ── */}
      <motion.div
        variants={podiumContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"
      >
        {/* Rank 2 */}
        {top3[1] && (
          <PodiumCard rank={2} user={top3[1]} maxXP={maxXP} />
        )}
        {/* Rank 1 — elevated */}
        {top3[0] && (
          <div className="sm:-mt-6">
            <PodiumCard rank={1} user={top3[0]} maxXP={maxXP} />
          </div>
        )}
        {/* Rank 3 */}
        {top3[2] && (
          <PodiumCard rank={3} user={top3[2]} maxXP={maxXP} />
        )}
      </motion.div>

      {/* ── Middle — Rank 4+ ── */}
      {middleUsers.length > 0 && (
        <motion.div
          variants={rankContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="space-y-1.5"
        >
          {middleUsers.map((user) => {
            const rank = users.indexOf(user) + 1;
            const profileUrl = user.githubHandle ? `/${user.githubHandle}` : "#";
            const isClickable = !!user.githubHandle;
            const rankChange = getRankChange(user, rank);
            const xpPct = (user.xp / maxXP) * 100;

            const content = (
              <motion.div
                variants={rankItem}
                className="group flex items-center gap-3 p-3 rounded-[var(--radius-standard)] bg-surface border border-white/[0.04] transition-all duration-200 hover:border-accent/20 hover:shadow-glow"
              >
                {/* Rank */}
                <div className="flex flex-col items-center justify-center w-8 shrink-0">
                  <span className="text-xs font-mono font-bold text-fg-muted">{rank}</span>
                  {rankChange && (
                    <span className={`flex items-center text-[9px] font-bold ${rankChange.direction === "up" ? "text-success" : "text-destructive"}`}>
                      {rankChange.direction === "up" ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                      {rankChange.value}
                    </span>
                  )}
                </div>

                <Avatar className="h-8 w-8 border border-white/10 flex-shrink-0">
                  <AvatarImage src={user.imageUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-accent to-cyan-500 text-white text-xs font-bold">
                    {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium truncate">{user.name || user.email.split("@")[0]}</span>
                    {user.title && (
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-300 bg-amber-500/10 font-semibold">
                        {user.title}
                      </span>
                    )}
                    {user.skillTreeState?.currentGrind && !user.title && (
                      <span className="text-[9px] border border-accent/20 text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
                        {user.skillTreeState.currentGrind}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 h-1 w-full bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${xpPct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                      className="h-full rounded-full bg-gradient-to-r from-accent to-cyan-500"
                      style={{ boxShadow: "0 0 8px hsl(265 85% 60% / 0.3)" }}
                    />
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-white font-bold text-sm font-mono">{user.xp.toLocaleString()} <span className="text-accent text-[10px]">XP</span></div>
                  <div className="text-fg-muted text-[9px]">{user.totalCommits}c · {user.totalPRs}p · {user.leetcodeHard}H</div>
                </div>
                {isClickable && <ExternalLink className="h-3 w-3 text-fg-muted flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </motion.div>
            );

            if (isClickable) {
              return <Link key={user.id} href={profileUrl} className="block">{content}</Link>;
            }
            return <div key={user.id}>{content}</div>;
          })}
        </motion.div>
      )}

      {/* ── Bottom — Last 2 ── */}
      {bottom2.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.08]" />
            <span className="text-label text-fg-muted">The Shadows Below</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.08]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bottom2.map((user) => {
              const badgeInfo = getBottomBadge(user);
              const profileUrl = user.githubHandle ? `/${user.githubHandle}` : "#";
              const isClickable = !!user.githubHandle;

              const content = (
                <div className="relative flex flex-col items-center p-6 pb-8 rounded-[var(--radius-container)] bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.06] transition-all hover:scale-[1.01] cursor-pointer">
                  {badgeInfo && (
                    <>
                      <div
                        className={`h-28 w-28 rounded-xl overflow-hidden mb-3 ${badgeInfo.border}`}
                        style={{ boxShadow: badgeInfo.shadow }}
                      >
                        <img src={badgeInfo.src} alt={badgeInfo.label} className="h-full w-full object-contain" />
                      </div>
                      <div className="text-[10px] font-black tracking-[0.2em] text-gray-400/70 mb-3">
                        {badgeInfo.label}
                      </div>
                    </>
                  )}
                  <Avatar className="h-10 w-10 border border-white/10 mb-2">
                    <AvatarImage src={user.imageUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-white text-xs font-bold">
                      {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <div className="text-white/70 text-sm font-medium truncate max-w-[160px]">
                      {user.name || user.email.split("@")[0]}
                    </div>
                    {user.title && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] border border-amber-500/20 text-amber-300/50 bg-amber-500/10">
                        {user.title}
                      </span>
                    )}
                    <div className="text-white/50 font-bold text-xl mt-1 font-mono">
                      {user.xp.toLocaleString()} <span className="text-accent/50 text-[10px]">XP</span>
                    </div>
                  </div>
                </div>
              );

              if (isClickable) {
                return <Link key={user.id} href={profileUrl} className="block">{content}</Link>;
              }
              return <div key={user.id}>{content}</div>;
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function PodiumCard({ rank, user, maxXP }: { rank: number; user: LeaderboardUser; maxXP: number }) {
  const cfg = podiumConfig[rank];
  const profileUrl = user.githubHandle ? `/profile?github=${user.githubHandle}` : "#";
  const isClickable = !!user.githubHandle;
  const xpPct = (user.xp / maxXP) * 100;

  const content = (
    <motion.div
      variants={podiumItem}
      className={`relative flex flex-col items-center p-6 pb-8 rounded-[var(--radius-container)] bg-gradient-to-b ${cfg.bgGradient} border ${cfg.border} backdrop-blur-sm transition-all hover:scale-[1.02] cursor-pointer`}
      style={{ boxShadow: cfg.shadow }}
    >
      {rank === 1 && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl drop-shadow-lg">
          👑
        </div>
      )}

      <div className={`h-32 w-32 rounded-[var(--radius-standard)] overflow-hidden ${cfg.ring} mb-3`} style={{ boxShadow: cfg.shadow }}>
        <img src={cfg.src} alt={cfg.title} className="h-full w-full object-contain" />
      </div>

      <div className="text-center mb-2">
        <div className={`text-xs font-black tracking-[0.2em] ${cfg.nameColor} opacity-80`}>
          {cfg.title}
        </div>
        <div className="text-[10px] text-fg-muted tracking-wider">
          {cfg.subtitle}
        </div>
      </div>

      <Avatar className="h-11 w-11 border-2 border-white/15 mb-2">
        <AvatarImage src={user.imageUrl || undefined} />
        <AvatarFallback className="bg-gradient-to-br from-accent to-cyan-500 text-white text-sm font-bold">
          {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="text-center">
        <div className="text-white font-bold text-base truncate max-w-[180px]">
          {user.name || user.email.split("@")[0]}
        </div>
        {user.title && (
          <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-amber-500/20 to-amber-500/5 border border-amber-500/30 text-amber-300">
            {user.title}
          </span>
        )}
        {!user.title && user.skillTreeState?.currentGrind && (
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] border border-accent/20 text-accent bg-accent/10">
            {user.skillTreeState.currentGrind}
          </span>
        )}
        <div className="text-white font-bold text-2xl mt-2 font-mono">
          {user.xp.toLocaleString()} <span className="text-accent text-sm font-medium">XP</span>
        </div>
        <div className="text-fg-muted text-[11px] mt-0.5">
          {user.totalCommits} commits · {user.totalPRs} PRs · {user.leetcodeHard}H
        </div>
      </div>

      {/* XP bar under podium card */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/[0.04] rounded-b-[var(--radius-container)] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${xpPct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="h-full"
          style={{ background: cfg.color, boxShadow: `0 0 10px ${cfg.color}60` }}
        />
      </div>
    </motion.div>
  );

  if (isClickable) {
    return <Link href={profileUrl} className="block">{content}</Link>;
  }
  return content;
}
