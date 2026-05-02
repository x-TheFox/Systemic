"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Code2, Trophy, Zap, RefreshCw, ExternalLink, Brain } from 'lucide-react';
import Link from 'next/link';

const platformIcons: Record<string, any> = {
  githubHandle: <Code2 className="h-4 w-4" />,
  leetcodeHandle: <Code2 className="h-4 w-4" />,
  codeforcesHandle: <Trophy className="h-4 w-4" />,
  hackerrankHandle: <Zap className="h-4 w-4" />,
};

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deepDiving, setDeepDiving] = useState(false);
  const [formData, setFormData] = useState({
    githubHandle: '',
    leetcodeHandle: '',
    codeforcesHandle: '',
    hackerrankHandle: '',
    name: '',
  });

  useEffect(() => {
    if (!isLoaded || !user) return;
    async function loadProfile() {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setProfile(data.user);
        setFormData({
          githubHandle: data.user.githubHandle || '',
          leetcodeHandle: data.user.leetcodeHandle || '',
          codeforcesHandle: data.user.codeforcesHandle || '',
          hackerrankHandle: data.user.hackerrankHandle || '',
          name: data.user.name || '',
        });
      } catch (err) {
        console.error('Profile load error:', err);
        toast.error('Failed to load profile. Try refreshing.');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [isLoaded, user]);

  async function handleSave() {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to save');
      const data = await res.json();
      setProfile(data.user);
      setEditing(false);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to save profile');
    }
  }

  async function triggerSync() {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}` },
      });
      if (!res.ok) throw new Error('Sync failed');
      toast.success('Sync triggered! This may take a minute. Refresh to see changes.');
    } catch {
      toast.error('Sync failed. Try again later.');
    } finally {
      setSyncing(false);
    }
  }

  async function triggerDeepDive() {
    setDeepDiving(true);
    try {
      const res = await fetch('/api/deepdive', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.id }),
      });
      if (!res.ok) throw new Error('Deep dive failed');
      const data = await res.json();
      toast.success(`Deep dive complete! Archetype: ${data.archetype}`);
    } catch {
      toast.error('Deep dive failed. Try again later.');
    } finally {
      setDeepDiving(false);
    }
  }

  if (!isLoaded || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center"><Skeleton className="w-96 h-96 rounded-2xl" /></main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white/60">
        Please sign in to view your profile.
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon" className="border-white/10 hover:bg-white/5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold gradient-text">Profile</h1>
        </div>

        {/* Platform Handles */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Platform Handles</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => editing ? handleSave() : setEditing(true)}
              className="border-white/10 hover:bg-white/5"
            >
              {editing ? 'Save' : 'Edit'}
            </Button>
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/50 mb-1 block">Display Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white/5 border-white/10 focus:border-purple-500"
                  placeholder="Your name"
                />
              </div>
              {Object.entries({ githubHandle: 'GitHub', leetcodeHandle: 'LeetCode', codeforcesHandle: 'Codeforces', hackerrankHandle: 'HackerRank' }).map(([key, label]) => (
                <div key={key}>
                  <label className="text-sm text-white/50 mb-1 block">{label}</label>
                  <Input
                    value={(formData as any)[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className="bg-white/5 border-white/10 focus:border-purple-500"
                    placeholder={`Your ${label} username`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries({ githubHandle: 'GitHub', leetcodeHandle: 'LeetCode', codeforcesHandle: 'Codeforces', hackerrankHandle: 'HackerRank' }).map(([key, label]) => (
                <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-purple-400">{platformIcons[key]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-white/30">{label}</p>
                    <p className="text-sm font-medium truncate">{(profile as any)?.[key] || <span className="text-white/20 italic">Not linked</span>}</p>
                  </div>
                  {(profile as any)?.[key] && <ExternalLink className="h-3 w-3 text-white/20" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Stats</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total XP" value={profile?.xp || 0} icon="⚡" color="purple" />
            <StatCard label="Commits" value={profile?.totalCommits || 0} icon="📝" color="cyan" />
            <StatCard label="PRs" value={profile?.totalPRs || 0} icon="🔀" color="green" />
            <StatCard label="LC Hard" value={profile?.leetcodeHard || 0} icon="🧠" color="pink" />
          </div>
          <div className="mt-4 space-y-2">
            <Button
              onClick={triggerSync}
              disabled={syncing}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-purple-500/20"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            <Button
              onClick={triggerDeepDive}
              disabled={deepDiving}
              variant="outline"
              className="w-full border-white/10 hover:bg-white/5 text-white/70 hover:text-white"
            >
              <Brain className={`h-4 w-4 mr-2 ${deepDiving ? 'animate-pulse' : ''}`} />
              {deepDiving ? 'Analyzing entire GitHub...' : 'Deep Dive (AI Research)'}
            </Button>
          </div>
        </div>

        {/* Achievements */}
        {profile?.achievements?.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Achievements</h2>
            <div className="space-y-2">
              {profile.achievements.map((ach: any) => (
                <div key={ach.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-xl">🏆</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{ach.title}</p>
                    <p className="text-xs text-white/40">{ach.description}</p>
                  </div>
                  {ach.xpBonus > 0 && (
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">+{ach.xpBonus} XP</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const colorClasses: Record<string, string> = {
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
    green: 'from-green-500/20 to-green-500/5 border-green-500/20 text-green-400',
    pink: 'from-pink-500/20 to-pink-500/5 border-pink-500/20 text-pink-400',
  };
  const cls = colorClasses[color] || colorClasses.purple;

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-b ${cls} border text-center`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/40 mt-1">{label}</div>
    </div>
  );
}