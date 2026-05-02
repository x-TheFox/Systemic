"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Code2, Trophy, Zap, RefreshCw, ExternalLink, Brain } from 'lucide-react';
import Link from 'next/link';
import { BadgeGrid } from '@/components/BadgeGrid';

const platformIcons: Record<string, any> = {
  githubHandle: <Code2 className="h-4 w-4" />,
  leetcodeHandle: <Code2 className="h-4 w-4" />,
  codeforcesHandle: <Trophy className="h-4 w-4" />,
  hackerrankHandle: <Zap className="h-4 w-4" />,
};

export default function ProfilePage() {
  const { user: clerkUser, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const githubHandleParam = searchParams.get('github');

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [formData, setFormData] = useState({
    githubHandle: '',
    leetcodeHandle: '',
    codeforcesHandle: '',
    hackerrankHandle: '',
    name: '',
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        let url = '/api/profile';
        if (githubHandleParam) {
          url = `/api/profile?githubHandle=${githubHandleParam}`;
        } else if (isLoaded && clerkUser) {
          url = `/api/profile?clerkId=${clerkUser.id}`;
        } else {
          setLoading(false);
          return;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setProfile(data.user);

        // Check if this is the logged-in user's own profile
        const own = clerkUser?.id === data.user?.clerkId;
        setIsOwnProfile(own);

        setFormData({
          githubHandle: data.user.githubHandle || '',
          leetcodeHandle: data.user.leetcodeHandle || '',
          codeforcesHandle: data.user.codeforcesHandle || '',
          hackerrankHandle: data.user.hackerrankHandle || '',
          name: data.user.name || '',
        });
      } catch (err) {
        console.error('Profile load error:', err);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [isLoaded, clerkUser, githubHandleParam]);

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
    toast.info('Sync triggered in the background. Check back in a minute!');
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}` },
      });
      if (!res.ok) throw new Error('Sync failed');
      toast.success('Sync complete! Refresh to see changes.');
    } catch {
      toast.error('Sync failed. Try again later.');
    }
  }

  async function triggerDeepDive() {
    toast.info('Deep dive started. Analyzing your entire GitHub history...');
    try {
      const res = await fetch('/api/deepdive', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: profile?.id }),
      });
      if (!res.ok) throw new Error('Deep dive failed');
      const data = await res.json();
      toast.success(`Deep dive complete! Archetype: ${data.archetype}`);
    } catch {
      toast.error('Deep dive failed. Try again later.');
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-96 h-96 rounded-2xl" />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white/60">
        {githubHandleParam ? `User "${githubHandleParam}" not found.` : 'Please sign in to view your profile.'}
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon" className="border-white/10 hover:bg-white/5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold gradient-text">{profile.name || profile.email}</h1>
            {profile.title && (
              <p className="text-sm text-purple-400 mt-0.5">{profile.title}</p>
            )}
          </div>
          {profile.githubHandle && (
            <a href={`https://github.com/${profile.githubHandle}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="border-white/10 hover:bg-white/5 gap-2">
                <Code2 className="h-4 w-4" />
                <span className="hidden sm:inline">{profile.githubHandle}</span>
              </Button>
            </a>
          )}
        </div>

        {/* AI Badges */}
        {profile.badges && profile.badges.length > 0 && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Badges</h2>
              <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 bg-amber-500/10 ml-auto">
                AI-FORGED
              </Badge>
            </div>
            <BadgeGrid badges={profile.badges} />
          </div>
        )}

        {/* Stats */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Stats</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total XP" value={profile?.xp || 0} icon="⚡" color="purple" />
            <StatCard label="Commits" value={profile?.totalCommits || 0} icon="📝" color="cyan" />
            <StatCard label="PRs" value={profile?.totalPRs || 0} icon="🔀" color="green" />
            <StatCard label="LC Hard" value={profile?.leetcodeHard || 0} icon="🧠" color="pink" />
          </div>
        </div>

        {/* Platform Handles */}
        {isOwnProfile && (
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
        )}

        {/* Action Buttons (own profile only) */}
        {isOwnProfile && (
          <div className="glass-card p-6">
            <div className="space-y-2">
              <Button
                onClick={triggerSync}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-purple-500/20"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
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
        )}

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

        {/* Unlocked Skill Nodes */}
        {profile?.dynamicNodes && profile.dynamicNodes.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Unlocked Skills</h2>
            <div className="flex flex-wrap gap-2">
              {profile.dynamicNodes.map((node: any) => (
                <Badge
                  key={node.id}
                  variant="outline"
                  className="text-xs border-purple-500/30 text-purple-400 bg-purple-500/10 px-3 py-1"
                >
                  {node.name}
                </Badge>
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