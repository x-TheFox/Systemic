"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink } from 'lucide-react';

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
}

const rankBadgeConfig: Record<number, { src: string; label: string; color: string; bg: string; ring: string; shadow: string; pulse: boolean }> = {
  1: { src: '/badges/mvp.svg', label: 'MVP', color: '#f59e0b', bg: 'from-yellow-500/20 via-yellow-500/10 to-transparent', ring: 'ring-2 ring-yellow-500/60', shadow: '0 0 30px rgba(245,158,11,0.4), 0 0 60px rgba(245,158,11,0.15)', pulse: true },
  2: { src: '/badges/2nd.svg', label: '2ND', color: '#a855f7', bg: 'from-purple-500/20 via-purple-500/10 to-transparent', ring: 'ring-2 ring-purple-500/60', shadow: '0 0 25px rgba(168,85,247,0.35), 0 0 50px rgba(168,85,247,0.1)', pulse: true },
  3: { src: '/badges/3rd.svg', label: '3RD', color: '#3b82f6', bg: 'from-blue-500/20 via-blue-500/10 to-transparent', ring: 'ring-2 ring-blue-500/60', shadow: '0 0 20px rgba(59,130,246,0.3), 0 0 40px rgba(59,130,246,0.1)', pulse: false },
};

const bottomBadgeConfig: Record<string, { src: string; label: string; color: string; bg: string; ring: string; shadow: string; pulse: boolean }> = {
  'svg:last1': { src: '/badges/last1.svg', label: 'LAST', color: '#6b7280', bg: 'from-gray-500/10 via-gray-500/5 to-transparent', ring: 'ring-1 ring-gray-500/40', shadow: '0 0 10px rgba(107,114,128,0.2)', pulse: false },
  'svg:last2': { src: '/badges/last2.svg', label: '2ND LAST', color: '#6b7280', bg: 'from-gray-500/10 via-gray-500/5 to-transparent', ring: 'ring-1 ring-gray-500/40', shadow: '0 0 10px rgba(107,114,128,0.2)', pulse: false },
};

export function LeaderboardTable() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/leaderboard');
        if (!res.ok) throw new Error('Failed');
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
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-white/30">
        No players yet. Be the first to sync!
      </div>
    );
  }

  const maxXP = Math.max(...users.map(u => u.xp), 1);

  function getBadgeForRank(user: LeaderboardUser, rank: number) {
    if (rank >= 1 && rank <= 3) return rankBadgeConfig[rank];
    if (user.badges && user.badges.length > 0) {
      const icon = user.badges[0].icon;
      if (bottomBadgeConfig[icon]) return bottomBadgeConfig[icon];
    }
    return null;
  }

  return (
    <div className="space-y-3">
      {users.map((user, index) => {
        const rank = index + 1;
        const isTop3 = rank <= 3;
        const badgeConfig = getBadgeForRank(user, rank);
        const rankStyle = isTop3
          ? rankStyles[rank]
          : (badgeConfig ? 'from-gray-500/10 to-transparent border-gray-500/20' : 'from-white/[0.03] to-transparent border-white/[0.06]');
        const profileUrl = user.githubHandle ? `/profile?github=${user.githubHandle}` : '#';
        const isClickable = !!user.githubHandle;

        const RowContent = (
          <div
            className={`flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r ${rankStyle} backdrop-blur-sm transition-all hover:scale-[1.01] ${isClickable ? 'cursor-pointer' : ''}`}
          >
            {badgeConfig ? (
              <div className="relative flex-shrink-0 group">
                <div
                  className={`relative h-16 w-16 rounded-xl overflow-hidden ${badgeConfig.ring} ${badgeConfig.pulse ? 'animate-pulse' : ''}`}
                  style={{ boxShadow: badgeConfig.shadow }}
                >
                  <img
                    src={badgeConfig.src}
                    alt={`Rank ${rank}`}
                    className="h-full w-full object-contain p-1 transition-transform group-hover:scale-110"
                  />
                </div>
                {isTop3 && (
                  <div
                    className="absolute -top-2 -right-2 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
                    style={{
                      background: `${badgeConfig.color}20`,
                      borderColor: `${badgeConfig.color}60`,
                      color: badgeConfig.color,
                    }}
                  >
                    {badgeConfig.label}
                  </div>
                )}
              </div>
            ) : (
              <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold flex-shrink-0 ${
                rank === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                rank === 2 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' :
                rank === 3 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                'bg-white/5 text-white/30'
              }`}>
                {rank}
              </div>
            )}

            <Avatar className={`h-10 w-10 border-2 flex-shrink-0 ${isTop3 ? 'border-yellow-500/40' : 'border-white/10'}`}>
              <AvatarImage src={user.imageUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-cyan-600 text-white text-sm">
                {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-white font-medium truncate text-sm">
                  {user.name || user.email.split('@')[0]}
                </span>
                {user.title && (
                  <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 bg-amber-500/10">
                    {user.title}
                  </Badge>
                )}
                {user.skillTreeState?.currentGrind && !user.title && (
                  <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400 bg-purple-500/10">
                    {user.skillTreeState.currentGrind}
                  </Badge>
                )}
                {isClickable && (
                  <ExternalLink className="h-3 w-3 text-white/20" />
                )}
              </div>
              <Progress value={(user.xp / maxXP) * 100} className="h-1.5 bg-white/5" />
            </div>

            <div className="text-right shrink-0">
              <div className="text-white font-bold text-lg">{user.xp.toLocaleString()} <span className="text-purple-400 text-xs">XP</span></div>
              <div className="text-white/30 text-[10px] mt-0.5">
                {user.totalCommits} commits · {user.totalPRs} PRs · {user.leetcodeHard}H
              </div>
            </div>
          </div>
        );

        if (isClickable) {
          return (
            <Link key={user.id} href={profileUrl} className="block">
              {RowContent}
            </Link>
          );
        }

        return <div key={user.id}>{RowContent}</div>;
      })}
    </div>
  );
}

const rankStyles: Record<number, string> = {
  1: 'from-yellow-500/20 via-yellow-500/10 to-transparent border-yellow-500/30',
  2: 'from-purple-500/20 via-purple-500/10 to-transparent border-purple-500/30',
  3: 'from-blue-500/20 via-blue-500/10 to-transparent border-blue-500/30',
};