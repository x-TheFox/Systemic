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

const rankBadgeMap: Record<number, { src: string; glow: string; ring: string }> = {
  1: { src: '/badges/mvp.svg', glow: 'shadow-[0_0_24px_rgba(245,158,11,0.5)]', ring: 'ring-yellow-500/50' },
  2: { src: '/badges/2nd.svg', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.4)]', ring: 'ring-purple-500/50' },
  3: { src: '/badges/3rd.svg', glow: 'shadow-[0_0_18px_rgba(59,130,246,0.4)]', ring: 'ring-blue-500/50' },
};

const bottomBadgeMap: Record<string, { src: string; glow: string; ring: string }> = {
  'svg:last2': { src: '/badges/last2.svg', glow: 'shadow-[0_0_14px_rgba(107,114,128,0.3)]', ring: 'ring-gray-500/40' },
  'svg:last1': { src: '/badges/last1.svg', glow: 'shadow-[0_0_14px_rgba(107,114,128,0.3)]', ring: 'ring-gray-500/40' },
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

  function getBadgeForUser(user: LeaderboardUser, index: number) {
    const rank = index + 1;
    if (rank >= 1 && rank <= 3 && rankBadgeMap[rank]) {
      return rankBadgeMap[rank];
    }
    if (user.badges && user.badges.length > 0) {
      const badgeIcon = user.badges[0].icon;
      if (bottomBadgeMap[badgeIcon]) {
        return bottomBadgeMap[badgeIcon];
      }
    }
    return null;
  }

  return (
    <div className="space-y-3">
      {users.map((user, index) => {
        const rank = index + 1;
        const isTop3 = rank <= 3;
        const style = isTop3
          ? rankStyles[rank]
          : 'from-white/[0.03] to-transparent border-white/[0.06]';
        const profileUrl = user.githubHandle ? `/profile?github=${user.githubHandle}` : '#';
        const isClickable = !!user.githubHandle;
        const badgeInfo = getBadgeForUser(user, index);

        const RowContent = (
          <div
            className={`flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r ${style} backdrop-blur-sm transition-all hover:scale-[1.01] ${isClickable ? 'cursor-pointer' : ''}`}
          >
            {badgeInfo ? (
              <div className={`relative flex-shrink-0 h-14 w-14 rounded-xl overflow-hidden ring-2 ${badgeInfo.ring} ${badgeInfo.glow} ${isTop3 ? 'animate-pulse' : ''}`}>
                <img
                  src={badgeInfo.src}
                  alt={`Rank ${rank}`}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                rank === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                rank === 2 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' :
                rank === 3 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30' :
                'bg-white/5 text-white/30'
              }`}>
                {rank}
              </div>
            )}

            <Avatar className={`h-10 w-10 border-2 ${isTop3 ? 'border-yellow-500/40' : 'border-white/10'}`}>
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
                {isTop3 && (
                  <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-bold ${
                    rank === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                    rank === 2 ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                    'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {rank === 1 ? 'MVP' : rank === 2 ? '2ND' : '3RD'}
                  </span>
                )}
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
  1: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30',
  2: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
  3: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
};