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
  border: string;
  nameColor: string;
  bgColor: string;
}> = {
  1: {
    src: "/badges/mvp.svg",
    title: "THE HONORED ONE",
    subtitle: "1ST PLACE",
    color: "#f59e0b",
    border: "border-amber-500/20",
    nameColor: "text-amber-400",
    bgColor: "bg-amber-500/[0.04]",
  },
  2: {
    src: "/badges/2nd.svg",
    title: "SILVER RUNNER",
    subtitle: "2ND PLACE",
    color: "#a855f7",
    border: "border-purple-500/20",
    nameColor: "text-purple-400",
    bgColor: "bg-purple-500/[0.04]",
  },
  3: {
    src: "/badges/3rd.svg",
    title: "BRONZE CHALLENGER",
    subtitle: "3RD PLACE",
    color: "#3b82f6",
    border: "border-blue-500/20",
    nameColor: "text-blue-400",
    bgColor: "bg-blue-500/[0.04]",
  },
};

const bottomBadgeConfig: Record<string, { src: string; label: string; color: string; border: string }> = {
  "svg:last1": { src: "/badges/last1.svg", label: "THE LURKER", color: "#6b7280", border: "border-white/[0.06]" },
  "svg:last2": { src: "/badges/last2.svg", label: "THE PENULTIMATE", color: "#6b7280", border: "border-white/[0.06]" },
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
          <Skeleton key={i} className="h-[68px] w-full bg-[#111113] rounded-xl border border-white/[0.06]" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-white/40 text-sm">
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
      {/* ── Podium - Top 3 (asymmetric) ── */}
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
        {/* Rank 1 - elevated */}
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

      {/* ── Middle - Rank 4+ ── */}
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
                className="group flex items-center gap-3 p-3 rounded-xl bg-[#111113] hover:bg-[#18181b] border border-white/[0.04] transition-all duration-200 hover:border-white/[0.08]"
              >
                {/* Rank */}
                <div className="flex flex-col items-center justify-center w-8 shrink-0">
                  <span className="text-xs font-mono font-semibold text-white/30">{rank}</span>
                  {rankChange && (
                    <span className={`flex items-center text-[9px] font-bold ${rankChange.direction === "up" ? "text-green-400" : "text-red-400"}`}>
                      {rankChange.direction === "up" ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                      {rankChange.value}
                    </span>
                  )}
                </div>

                <Avatar className="h-8 w-8 border border-white/[0.08] flex-shrink-0">
                  <AvatarImage src={user.imageUrl || undefined} />
                  <AvatarFallback className="bg-[#18181b] text-white/70 text-xs font-semibold">
                    {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white/90 text-sm font-semibold truncate">{user.name || user.email.split("@")[0]}</span>
                    {user.title && (
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-amber-500/20 text-amber-400 opacity-80 bg-amber-500/5 font-semibold">
                        {user.title}
                      </span>
                    )}
                    {user.skillTreeState?.currentGrind && !user.title && (
                      <span className="text-[9px] border border-violet-500/15 text-violet-300 opacity-80 bg-violet-500/5 px-1.5 py-0.5 rounded-md">
                        {user.skillTreeState.currentGrind}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 h-1 w-full bg-[#18181b] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${xpPct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                      className="h-full rounded-full bg-violet-400/50"
                    />
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-white/90 font-semibold text-sm tabular-nums tracking-tight">{user.xp.toLocaleString()} <span className="text-white/30 text-[10px]">XP</span></div>
                  <div className="text-white/30 text-[9px] tracking-wider">{user.totalCommits}c · {user.totalPRs}p · {user.leetcodeHard}H</div>
                </div>
                {isClickable && <ExternalLink className="h-3.5 w-3.5 text-white/20 flex-shrink-0 group-hover:text-white/60 transition-colors" />}
              </motion.div>
            );

            if (isClickable) {
              return <Link key={user.id} href={profileUrl} className="block">{content}</Link>;
            }
            return <div key={user.id}>{content}</div>;
          })}
        </motion.div>
      )}

      {/* ── Bottom - Last 2 ── */}
      {bottom2.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-center gap-3 py-4">
            <span className="text-[10px] uppercase tracking-widest text-white/30 font-semibold text-center w-full">The Shadows</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bottom2.map((user) => {
              const badgeInfo = getBottomBadge(user);
              const profileUrl = user.githubHandle ? `/${user.githubHandle}` : "#";
              const isClickable = !!user.githubHandle;

              const content = (
                <div className="relative flex flex-col items-center p-6 bg-[#18181b] border border-white/[0.04] hover:border-white/[0.08] rounded-2xl transition-all duration-200 hover:-translate-y-0.5 group">
                  {badgeInfo && (
                    <>
                      <div className={`h-24 w-24 p-2 rounded-xl mb-3 bg-[#111113] border ${badgeInfo.border}`}>
                        <img src={badgeInfo.src} alt={badgeInfo.label} className="h-full w-full object-contain mix-blend-plus-lighter opacity-50 group-hover:opacity-80 transition-opacity" />
                      </div>
                      <div className="text-[9px] font-semibold tracking-widest text-white/30 mb-4 uppercase">
                        {badgeInfo.label}
                      </div>
                    </>
                  )}
                  <Avatar className="h-9 w-9 border border-white/[0.06] mb-3">
                    <AvatarImage src={user.imageUrl || undefined} />
                    <AvatarFallback className="bg-[#111113] text-white/50 text-xs font-semibold">
                      {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center flex flex-col gap-1 items-center">
                    <div className="text-white/70 text-sm font-semibold truncate max-w-[160px]">
                      {user.name || user.email.split("@")[0]}
                    </div>
                    {user.title && (
                      <span className="inline-block px-2 py-0.5 rounded-md text-[9px] border border-amber-500/10 text-amber-400/60 bg-amber-500/5">
                        {user.title}
                      </span>
                    )}
                    <div className="text-white/90 font-semibold text-lg mt-1 tabular-nums tracking-tight">
                      {user.xp.toLocaleString()} <span className="text-white/30 text-[10px]">XP</span>
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
  const profileUrl = user.githubHandle ? `/${user.githubHandle}` : "#";
  const isClickable = !!user.githubHandle;
  const xpPct = (user.xp / maxXP) * 100;

  const content = (
    <motion.div
      variants={podiumItem}
      className={`relative overflow-hidden flex flex-col items-center p-6 ${cfg.bgColor} border ${cfg.border} bg-[#18181b] rounded-2xl transition-all duration-300 hover:-translate-y-1 group`}
    >
      {/* Top highlight bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 transition-opacity duration-300 opacity-0 group-hover:opacity-100 flex justify-center`}>
         <div className="h-full w-full opacity-60" style={{ backgroundColor: cfg.color }} />
      </div>

      <div className={`w-28 h-28 p-2 rounded-xl mb-4 bg-[#111113] border border-white/[0.04]`}>
        <img src={cfg.src} alt={cfg.title} className="h-full w-full object-contain" />
      </div>

      <div className="text-center mb-3">
        <div className={`text-[10px] font-bold tracking-widest ${cfg.nameColor} uppercase opacity-90`}>
          {cfg.title}
        </div>
        <div className="text-[9px] font-medium text-white/30 tracking-widest uppercase mt-0.5">
          {cfg.subtitle}
        </div>
      </div>

      <Avatar className="h-10 w-10 border border-white/[0.08] mb-3">
        <AvatarImage src={user.imageUrl || undefined} />
        <AvatarFallback className="bg-[#111113] text-white/70 text-xs font-semibold">
          {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="text-center flex flex-col items-center">
        <div className="text-white/90 font-semibold text-sm truncate max-w-[150px]">
          {user.name || user.email.split("@")[0]}
        </div>
        {user.title && (
          <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium border border-amber-500/15 text-amber-400/80 bg-amber-500/5">
            {user.title}
          </span>
        )}
        {!user.title && user.skillTreeState?.currentGrind && (
          <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md text-[9px] border border-violet-500/10 text-violet-300/70 bg-violet-500/[0.02]">
            {user.skillTreeState.currentGrind}
          </span>
        )}
        <div className="text-white font-semibold text-2xl mt-3 tabular-nums tracking-tight">
          {user.xp.toLocaleString()} <span className="text-white/30 text-[11px] font-medium">XP</span>
        </div>
        <div className="text-white/30 text-[10px] mt-1 font-mono">
          {user.totalCommits}c · {user.totalPRs}p · {user.leetcodeHard}H
        </div>
      </div>
      
      {/* Subtle background progression line inside component rather than heavy outer glow */}
      <div className="absolute bottom-0 left-0 h-0.5 rounded-r-md opacity-30 group-hover:opacity-60 transition-opacity" style={{ width: `${xpPct}%`, backgroundColor: cfg.color }} />
    </motion.div>
  );

  if (isClickable) {
    return <Link href={profileUrl} className="block">{content}</Link>;
  }
  return content;
}
