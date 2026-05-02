"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Code2, Trophy, Zap, RefreshCw, ExternalLink, Brain, X, Crown, Sparkles, Clock, Shield } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { BadgeGrid, BadgeCard } from '@/components/BadgeGrid';

const platformIcons: Record<string, any> = {
  githubHandle: <Code2 className="h-4 w-4" />,
  leetcodeHandle: <Code2 className="h-4 w-4" />,
  codeforcesHandle: <Trophy className="h-4 w-4" />,
  hackerrankHandle: <Zap className="h-4 w-4" />,
  tryhackmeHandle: <Shield className="h-4 w-4" />,
};

const platformLabels: Record<string, string> = {
  githubHandle: 'GitHub',
  leetcodeHandle: 'LeetCode',
  codeforcesHandle: 'Codeforces',
  hackerrankHandle: 'HackerRank',
  tryhackmeHandle: 'TryHackMe',
};

interface PastTitle {
  id: string;
  title: string;
  weekNumber: number;
  year: number;
  createdAt: string;
}

export default function ProfilePage() {
  const { user: clerkUser, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const githubHandleParam = searchParams.get('github');

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<any>(null);

  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [formData, setFormData] = useState({
    githubHandle: '',
    leetcodeHandle: '',
    codeforcesHandle: '',
    hackerrankHandle: '',
    tryhackmeHandle: '',
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

        const own = clerkUser?.id === data.user?.clerkId;
        setIsOwnProfile(own);

        setFormData({
          githubHandle: data.user.githubHandle || '',
          leetcodeHandle: data.user.leetcodeHandle || '',
          codeforcesHandle: data.user.codeforcesHandle || '',
          hackerrankHandle: data.user.hackerrankHandle || '',
          tryhackmeHandle: data.user.tryhackmeHandle || '',
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

  const pastTitles: PastTitle[] = profile.pastTitles || [];
  const weeklyBadges = (profile.badges || []).filter((b: any) => b.category === 'weekly_leaderboard');
  const aiBadges = (profile.badges || []).filter((b: any) => b.category !== 'weekly_leaderboard');

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
          <Avatar className="h-14 w-14 border-2 border-purple-500/40 flex-shrink-0">
            <AvatarImage src={profile.imageUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-cyan-600 text-white text-xl font-bold">
              {(profile.name || profile.email).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold gradient-text">{profile.name || profile.email}</h1>
            {profile.title ? (
              <div className="flex items-center gap-2 mt-1">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-base font-semibold text-amber-400 tracking-wide">{profile.title}</span>
              </div>
            ) : profile.skillTreeState?.currentGrind ? (
              <p className="text-sm text-purple-400 mt-0.5">{profile.skillTreeState.currentGrind}</p>
            ) : null}
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

        {/* Past Titles */}
        {pastTitles.length > 0 && (
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-white/40" />
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Title History</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {pastTitles.slice(0, 8).map((pt: PastTitle) => (
                <div
                  key={pt.id}
                  className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-white/50 hover:text-white/70 hover:border-white/20 transition-all cursor-default"
                  title={`Week ${pt.weekNumber}, ${pt.year}`}
                >
                  {pt.title}
                </div>
              ))}
              {pastTitles.length > 8 && (
                <div className="px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.06] text-sm text-white/30">
                  +{pastTitles.length - 8} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Badges with modal trigger */}
        {profile.badges && profile.badges.length > 0 && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-white">Badges</h2>
                <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400 bg-purple-500/10 ml-2">
                  {profile.badges.length}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBadge(profile.badges[0])}
                className="border-white/10 hover:bg-white/5 text-white/60 hover:text-white text-xs"
              >
                View All
              </Button>
            </div>
            {/* Show top 2 weekly + top 2 AI badges inline */}
            <div className="space-y-2">
              {weeklyBadges.slice(0, 2).map((badge: any) => (
                <div
                  key={badge.id}
                  className="cursor-pointer hover:scale-[1.01] transition-transform"
                  onClick={() => setSelectedBadge(badge)}
                >
                  <BadgeCard badge={badge} />
                </div>
              ))}
              {aiBadges.slice(0, 2).map((badge: any) => (
                <div
                  key={badge.id}
                  className="cursor-pointer hover:scale-[1.01] transition-transform"
                  onClick={() => setSelectedBadge(badge)}
                >
                  <BadgeCard badge={badge} />
                </div>
              ))}
              {(weeklyBadges.length + aiBadges.length > 4) && (
                <button
                  onClick={() => setSelectedBadge(profile.badges[0])}
                  className="w-full py-2 text-center text-xs text-white/30 hover:text-white/50 transition-colors"
                >
                  +{weeklyBadges.length + aiBadges.length - 4} more badges — tap to see all
                </button>
              )}
            </div>
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
            <StatCard label="CF Rating" value={profile?.codeforcesRating || 0} icon="🏆" color="amber" />
            <StatCard label="HR Badges" value={profile?.hackerrankBadges || 0} icon="⚡" color="yellow" />
            <StatCard label="THM Points" value={profile?.tryhackmePoints || 0} icon="🛡" color="emerald" />
            <StatCard label="THM Rank" value={profile?.tryhackmeRank || 0} icon="⚔" color="red" />
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
                {Object.entries(platformLabels).map(([key, label]) => (
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
                {Object.entries(platformLabels).map(([key, label]) => (
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
                variant="outline"
                className="w-full border-white/10 hover:bg-white/5 text-white/70 hover:text-white"
              >
                <Brain className="h-4 w-4 mr-2" />
                Deep Dive (AI Research)
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

      {/* Badge Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedBadge(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0a0a12]/95 backdrop-blur-xl p-5 sm:p-7" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedBadge(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors z-10"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-5 sticky top-0 bg-[#0a0a12]/95 backdrop-blur-xl pb-3 -mt-1 pt-1 z-[1]">
              <Crown className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">All Badges</h2>
              <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400 bg-purple-500/10">
                {profile.badges.length}
              </Badge>
            </div>

            <BadgeGrid badges={profile.badges} />
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const colorClasses: Record<string, string> = {
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
    green: 'from-green-500/20 to-green-500/5 border-green-500/20 text-green-400',
    pink: 'from-pink-500/20 to-pink-500/5 border-pink-500/20 text-pink-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
    yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20 text-yellow-400',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    red: 'from-red-500/20 to-red-500/5 border-red-500/20 text-red-400',
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