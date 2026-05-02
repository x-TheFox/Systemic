"use client";

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaderboardUser {
  id: string;
  name: string | null;
  email: string;
  imageUrl: string | null;
  xp: number;
  totalCommits: number;
  totalPRs: number;
  leetcodeHard: number;
  codeforcesRating: number;
  skillTreeState?: { currentGrind: string | null } | null;
}

const rankStyles: Record<number, string> = {
  1: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30',
  2: 'from-gray-400/20 to-gray-400/5 border-gray-400/30',
  3: 'from-amber-700/20 to-amber-700/5 border-amber-700/30',
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

  return (
    <div className="space-y-3">
      {users.map((user, index) => {
        const style = rankStyles[index + 1] || 'from-white/[0.03] to-transparent border-white/[0.06]';
        return (
          <div
            key={user.id}
            className={`flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r ${style} backdrop-blur-sm transition-all hover:scale-[1.01]`}
          >
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
              index === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
              index === 1 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' :
              index === 2 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30' :
              'bg-white/5 text-white/30'
            }`}>
              {index + 1}
            </div>

            <Avatar className="h-10 w-10 border-2 border-white/10">
              <AvatarImage src={user.imageUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-cyan-600 text-white text-sm">
                {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-medium truncate text-sm">
                  {user.name || user.email.split('@')[0]}
                </span>
                {user.skillTreeState?.currentGrind && (
                  <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400 bg-purple-500/10">
                    {user.skillTreeState.currentGrind}
                  </Badge>
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
      })}
    </div>
  );
}