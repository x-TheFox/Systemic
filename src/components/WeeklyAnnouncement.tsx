"use client";

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Megaphone, Trophy, TrendingDown } from 'lucide-react';

interface WeeklyReport {
  id: string;
  weekNumber: number;
  year: number;
  content: string;
  mvpName: string | null;
  mvpXp: number;
  lurkerName: string | null;
  lurkerXp: number;
  totalXP: number;
  participants: number;
  rankings: Array<{ name: string; xp: number; activities: number; platforms: string[] }>;
  createdAt: string;
}

export function WeeklyAnnouncement() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/weekly/latest');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (data.report) setReport(data.report);
      } catch (err) {
        console.error('Weekly announcement load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <Skeleton className="h-32 w-full rounded-xl" />;
  }

  if (!report) {
    return (
      <div className="glass-card p-6 flex items-center gap-4">
        <Megaphone className="h-6 w-6 text-purple-400" />
        <div>
          <h3 className="text-white font-semibold">Weekly Post-Mortem</h3>
          <p className="text-sm text-white/40">The Ghost hasn&apos;t published a report yet. Check back after Sunday!</p>
        </div>
      </div>
    );
  }

  const preview = report.content.split('\n').slice(0, 3).join('\n');

  return (
    <div className="glass-card p-6 relative overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Megaphone className="h-5 w-5 text-purple-400" />
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-400 rounded-full animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-semibold">The Ghost&apos;s Weekly Post-Mortem</h3>
            <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400 bg-purple-500/10">
              Week {report.weekNumber}, {report.year}
            </Badge>
          </div>
          <p className="text-[11px] text-white/30">
            {report.participants} grinders · {report.totalXP.toLocaleString()} total XP
          </p>
        </div>
      </div>

      {/* MVP / Lurker quick stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="h-3.5 w-3.5 text-yellow-400" />
            <span className="text-[10px] uppercase tracking-wider text-yellow-400/70 font-medium">MVP</span>
          </div>
          <p className="text-sm font-bold text-white">{report.mvpName || 'N/A'}</p>
          <p className="text-xs text-white/40">+{report.mvpXp.toLocaleString()} XP</p>
        </div>
        <div className="p-3 rounded-lg bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            <span className="text-[10px] uppercase tracking-wider text-red-400/70 font-medium">Lurker</span>
          </div>
          <p className="text-sm font-bold text-white">{report.lurkerName || 'N/A'}</p>
          <p className="text-xs text-white/40">+{report.lurkerXp.toLocaleString()} XP</p>
        </div>
      </div>

      {/* Report content */}
      <div className="prose prose-invert prose-sm max-w-none">
        <div className={`text-sm text-white/60 leading-relaxed whitespace-pre-wrap ${expanded ? '' : 'line-clamp-4'}`}>
          {expanded ? report.content : preview}
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors"
      >
        {expanded ? 'Show less' : 'Read full report'}
      </button>

      {/* Mini leaderboard */}
      {report.rankings && report.rankings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <p className="text-[10px] uppercase tracking-wider text-white/20 mb-2">Top Grinders This Week</p>
          <div className="space-y-1.5">
            {report.rankings.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={`w-5 text-right font-mono ${
                  i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-500' : 'text-white/30'
                }`}>
                  {i + 1}
                </span>
                <span className="text-white/70 truncate flex-1">{r.name}</span>
                <span className="text-white/30">{r.xp.toLocaleString()} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}