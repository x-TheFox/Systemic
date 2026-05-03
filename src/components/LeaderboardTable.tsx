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

const podiumConfig: Record<number, { src: string; title: string; subtitle: string; color: string; ring: string; shadow: string; border: string; nameColor: string }> = {
  1: { src: '/badges/mvp.svg', title: 'THE HONORED ONE', subtitle: '1ST PLACE', color: '#f59e0b', ring: 'ring-2 ring-yellow-500/80', shadow: '0 0 40px rgba(245,158,11,0.5), 0 0 80px rgba(245,158,11,0.2)', border: 'border-yellow-500/40', nameColor: 'text-yellow-400' },
  2: { src: '/badges/2nd.svg', title: 'SILVER RUNNER', subtitle: '2ND PLACE', color: '#a855f7', ring: 'ring-2 ring-purple-500/80', shadow: '0 0 30px rgba(168,85,247,0.4), 0 0 60px rgba(168,85,247,0.15)', border: 'border-purple-500/40', nameColor: 'text-purple-400' },
  3: { src: '/badges/3rd.svg', title: 'BRONZE CHALLENGER', subtitle: '3RD PLACE', color: '#3b82f6', ring: 'ring-2 ring-blue-500/80', shadow: '0 0 25px rgba(59,130,246,0.35), 0 0 50px rgba(59,130,246,0.1)', border: 'border-blue-500/40', nameColor: 'text-blue-400' },
};

const bottomBadgeConfig: Record<string, { src: string; label: string; color: string; border: string; shadow: string }> = {
  'svg:last1': { src: '/badges/last1.svg', label: 'THE LURKER', color: '#6b7280', border: 'border-gray-500/30', shadow: '0 0 15px rgba(107,114,128,0.25)' },
  'svg:last2': { src: '/badges/last2.svg', label: 'THE PENULTIMATE', color: '#6b7280', border: 'border-gray-500/30', shadow: '0 0 15px rgba(107,114,128,0.25)' },
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
  const top3 = users.slice(0, 3);
  const bottom2 = users.length >= 4 ? users.slice(-2) : [];
  const middleUsers = users.length >= 4 ? users.slice(3, -2) : users.slice(3);

  function getBottomBadge(user: LeaderboardUser) {
    if (!user.badges || user.badges.length === 0) return null;
    const icon = user.badges[0].icon;
    if (bottomBadgeConfig[icon]) return bottomBadgeConfig[icon];
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Podium — Top 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {top3.map((user, i) => {
          const rank = i + 1;
          const cfg = podiumConfig[rank];
          const profileUrl = user.githubHandle ? `/profile?github=${user.githubHandle}` : '#';
          const isClickable = !!user.githubHandle;
          const Wrapper = isClickable ? Link : 'div';
          const wrapperProps = isClickable ? { href: profileUrl } : {};

          return (
            // @ts-expect-error dynamic wrapper
            <Wrapper key={user.id} {...wrapperProps} className="block">
              <div
                className={`relative flex flex-col items-center p-6 pb-8 rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border ${cfg.border} backdrop-blur-sm transition-all hover:scale-[1.02] cursor-pointer`}
                style={{ boxShadow: cfg.shadow }}
              >
                {rank === 1 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl drop-shadow-lg">
                    👑
                  </div>
                )}

                <div className={`h-32 w-32 rounded-2xl overflow-hidden ${cfg.ring} mb-3`} style={{ boxShadow: cfg.shadow }}>
                  <img src={cfg.src} alt={cfg.title} className="h-full w-full object-contain" />
                </div>

                <div className="text-center mb-2">
                  <div className={`text-xs font-black tracking-[0.2em] ${cfg.nameColor} opacity-80`}>
                    {cfg.title}
                  </div>
                  <div className="text-[10px] text-white/30 tracking-wider">
                    {cfg.subtitle}
                  </div>
                </div>

                <Avatar className="h-11 w-11 border-2 border-white/15 mb-2">
                  <AvatarImage src={user.imageUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-cyan-600 text-white text-sm font-bold">
                    {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="text-center">
                  <div className="text-white font-bold text-base truncate max-w-[180px]">
                    {user.name || user.email.split('@')[0]}
                  </div>
                  {user.title && (
                    <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-amber-500/20 to-amber-500/5 border border-amber-500/30 text-amber-300">
                      {user.title}
                    </span>
                  )}
                  {!user.title && user.skillTreeState?.currentGrind && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] border border-purple-500/30 text-purple-400 bg-purple-500/10">
                      {user.skillTreeState.currentGrind}
                    </span>
                  )}
                  <div className="text-white font-bold text-2xl mt-2">
                    {user.xp.toLocaleString()} <span className="text-purple-400 text-sm font-medium">XP</span>
                  </div>
                  <div className="text-white/30 text-[11px] mt-0.5">
                    {user.totalCommits} commits · {user.totalPRs} PRs · {user.leetcodeHard}H
                  </div>
                </div>
              </div>
            </Wrapper>
          );
        })}
      </div>

      {/* Middle — Rank 4+ */}
      {middleUsers.length > 0 && (
        <div className="space-y-2">
          {middleUsers.map((user) => {
            const rank = users.indexOf(user) + 1;
            const profileUrl = user.githubHandle ? `/profile?github=${user.githubHandle}` : '#';
            const isClickable = !!user.githubHandle;

            const content = (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm transition-all hover:scale-[1.005] hover:bg-white/[0.05]">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-white/30 text-xs font-bold flex-shrink-0">
                  {rank}
                </div>
                <Avatar className="h-8 w-8 border border-white/10 flex-shrink-0">
                  <AvatarImage src={user.imageUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-cyan-600 text-white text-xs font-bold">
                    {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium truncate">{user.name || user.email.split('@')[0]}</span>
                    {user.title && (
                      <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-300 bg-amber-500/15 font-semibold tracking-wide">
                        {user.title}
                      </Badge>
                    )}
                    {user.skillTreeState?.currentGrind && !user.title && (
                      <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400 bg-purple-500/10">
                        {user.skillTreeState.currentGrind}
                      </Badge>
                    )}
                  </div>
                  <Progress value={(user.xp / maxXP) * 100} className="h-1 bg-white/5 mt-1" />
                </div>
                <div className="text-right shrink-0">
                  <div className="text-white font-bold text-sm">{user.xp.toLocaleString()} <span className="text-purple-400 text-[10px]">XP</span></div>
                  <div className="text-white/25 text-[9px]">{user.totalCommits}c · {user.totalPRs}p · {user.leetcodeHard}H</div>
                </div>
                {isClickable && <ExternalLink className="h-3 w-3 text-white/15 flex-shrink-0" />}
              </div>
            );

            if (isClickable) {
              return <Link key={user.id} href={profileUrl} className="block">{content}</Link>;
            }
            return <div key={user.id}>{content}</div>;
          })}
        </div>
      )}

      {/* Bottom — Last 2 */}
      {bottom2.length > 0 && (
        <>
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/15 text-center">The Shadows Below</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bottom2.map((user) => {
              const badgeInfo = getBottomBadge(user);
              const profileUrl = user.githubHandle ? `/profile?github=${user.githubHandle}` : '#';
              const isClickable = !!user.githubHandle;
              const Wrapper = isClickable ? Link : 'div';
              const wrapperProps = isClickable ? { href: profileUrl } : {};

              return (
                // @ts-expect-error dynamic wrapper
                <Wrapper key={user.id} {...wrapperProps} className="block">
                  <div className="relative flex flex-col items-center p-6 pb-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.06] backdrop-blur-sm transition-all hover:scale-[1.01] cursor-pointer">
                    {badgeInfo && (
                      <>
                        <div className={`h-24 w-24 rounded-xl overflow-hidden ${badgeInfo.border} mb-2`} style={{ boxShadow: badgeInfo.shadow }}>
                          <img src={badgeInfo.src} alt={badgeInfo.label} className="h-full w-full object-contain" />
                        </div>
                        <div className="text-[10px] font-black tracking-[0.2em] text-gray-400/70 mb-2">
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
                        {user.name || user.email.split('@')[0]}
                      </div>
                      {user.title && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] border border-amber-500/20 text-amber-300/50 bg-amber-500/10">
                          {user.title}
                        </span>
                      )}
                      <div className="text-white/50 font-bold text-xl mt-1">
                        {user.xp.toLocaleString()} <span className="text-purple-400/50 text-[10px]">XP</span>
                      </div>
                    </div>
                  </div>
                </Wrapper>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}