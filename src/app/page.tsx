import { SkillRadar } from '@/components/SkillRadar';
import { SkillTree } from '@/components/SkillTree';
import { PulseFeed } from '@/components/PulseFeed';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import { Button } from '@/components/ui/button';
import { Activity, Trophy, Zap, GitBranch, Brain, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
      {/* Hero Stats Row */}
        {/* Hero Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<Zap className="h-5 w-5" />} label="Total XP" value="—" color="purple" />
          <StatCard icon={<GitBranch className="h-5 w-5" />} label="Commits" value="—" color="cyan" />
          <StatCard icon={<Brain className="h-5 w-5" />} label="LC Hard" value="—" color="pink" />
          <StatCard icon={<Activity className="h-5 w-5" />} label="Active" value="—" color="green" />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* The Pulse */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">The Pulse</h2>
            </div>
            <PulseFeed />
          </div>

          {/* AI Skill Radar */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">AI Skill Radar</h2>
            </div>
            <SkillRadar />
          </div>
        </div>

        {/* Leaderboard Preview */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <h2 className="text-lg font-semibold text-white">Leaderboard</h2>
            </div>
            <Link href="/leaderboard">
              <Button variant="outline" size="sm" className="border-white/10 hover:bg-white/5 text-white/60 hover:text-white">
                View All
              </Button>
            </Link>
          </div>
          <LeaderboardTable />
        </div>

        {/* Tech-Tree Progression */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Tech-Tree Progression</h2>
            <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400 bg-purple-500/10 ml-auto">
              AI-GROWN
            </Badge>
          </div>
          <SkillTree />
        </div>
      </main>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const gradients: Record<string, string> = {
    purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20',
    cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20',
    pink: 'from-pink-500/10 to-pink-500/5 border-pink-500/20',
    green: 'from-green-500/10 to-green-500/5 border-green-500/20',
  };
  const iconColors: Record<string, string> = {
    purple: 'text-purple-400',
    cyan: 'text-cyan-400',
    pink: 'text-pink-400',
    green: 'text-green-400',
  };

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${gradients[color]} border backdrop-blur-sm`}>
      <div className={`${iconColors[color]} mb-1`}>{icon}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/30">{label}</div>
    </div>
  );
}