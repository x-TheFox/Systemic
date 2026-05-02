"use client";

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface LeaderboardUser {
  id: string;
  name: string | null;
  email: string;
  imageUrl: string | null;
  xp: number;
  totalCommits: number;
  totalPRs: number;
  leetcodeEasy: number;
  leetcodeMedium: number;
  leetcodeHard: number;
  codeforcesRating: number;
  codeforcesSolved: number;
  hackerrankBadges: number;
  skillTreeState?: { currentGrind: string | null } | null;
}

export function LeaderboardTable() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const res = await fetch('/api/leaderboard');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setUsers(data.users || []);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const maxXP = Math.max(...users.map((u) => u.xp), 1);

  return (
    <div className="space-y-4">
      {users.map((user, index) => (
        <Card key={user.id} className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 text-gray-400 font-bold text-sm">
                {index + 1}
              </div>
              
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-purple-900 text-purple-200">
                  {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium truncate">
                    {user.name || user.email.split('@')[0]}
                  </span>
                  {user.skillTreeState?.currentGrind && (
                    <Badge variant="outline" className="text-[10px]">
                      {user.skillTreeState.currentGrind}
                    </Badge>
                  )}
                </div>
                <Progress value={(user.xp / maxXP) * 100} className="h-2" />
              </div>

              <div className="text-right">
                <div className="text-purple-400 font-bold">{user.xp.toLocaleString()} XP</div>
                <div className="text-gray-500 text-xs">
                  {user.totalCommits} commits · {user.totalPRs} PRs · {user.leetcodeHard}H LC
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
