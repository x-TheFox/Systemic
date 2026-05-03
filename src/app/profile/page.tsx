"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ArrowLeft, Code2, Trophy, Zap, RefreshCw, ExternalLink,
  Brain, X, Crown, Sparkles, Clock, Shield, Swords,
  FileText, GitPullRequest,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { BadgeGrid, BadgeCard } from '@/components/BadgeGrid';
import { motion, AnimatePresence } from 'framer-motion';
import {
  cascadeVariants, heroCascadeVariants, childCascadeVariants,
  fadeInUp, scaleIn, cardHover, durations,
} from '@/lib/motion';

/* ═══════════════════════════════════════════
   Platform config — Lucide icons, no emoji
   ═══════════════════════════════════════════ */
const platformIcons: Record<string, any> = {
  githubHandle: <Code2 className="h-4 w-4" />,
  leetcodeHandle: <Brain className="h-4 w-4" />,
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

/* ═══════════════════════════════════════════
   Title rarity → mesh background map
   ═══════════════════════════════════════════ */
const rarityMeshMap: Record<string, string> = {
  legendary: 'mesh-gradient-arena',
  epic: 'mesh-gradient-primary',
  rare: 'mesh-gradient-garden',
  common: 'mesh-gradient-primary',
};

/* ═══════════════════════════════════════════
   StatCard accent color map
   ═══════════════════════════════════════════ */
const statAccentMap: Record<string, { color: string; dim: string; glow: string; strip: string }> = {
  coral: {
    color: 'var(--color-accent-primary)',
    dim: 'var(--color-accent-primary-dim)',
    glow: 'glow-primary',
    strip: 'section-strip-primary',
  },
  cyan: {
    color: 'var(--color-accent-tertiary)',
    dim: 'var(--color-accent-tertiary-dim)',
    glow: 'glow-tertiary',
    strip: 'section-strip-tertiary',
  },
  emerald: {
    color: 'var(--color-accent-success)',
    dim: 'var(--color-accent-success-dim)',
    glow: 'glow-success',
    strip: 'section-strip-success',
  },
  violet: {
    color: 'var(--color-accent-secondary)',
    dim: 'var(--color-accent-secondary-dim)',
    glow: 'glow-secondary',
    strip: 'section-strip-secondary',
  },
  gold: {
    color: 'var(--color-accent-achievement)',
    dim: 'var(--color-accent-achievement-dim)',
    glow: 'glow-achievement',
    strip: 'section-strip-achievement',
  },
};

/* ═══════════════════════════════════════════
   Stat definitions — Lucide icons, accent colors
   ═══════════════════════════════════════════ */
const statDefs: Array<{
  key: string;
  label: string;
  icon: React.ReactNode;
  accent: keyof typeof statAccentMap;
}> = [
  { key: 'xp', label: 'Total XP', icon: <Zap className="h-4 w-4" />, accent: 'coral' },
  { key: 'totalCommits', label: 'Commits', icon: <FileText className="h-4 w-4" />, accent: 'cyan' },
  { key: 'totalPRs', label: 'PRs', icon: <GitPullRequest className="h-4 w-4" />, accent: 'emerald' },
  { key: 'leetcodeHard', label: 'LC Hard', icon: <Brain className="h-4 w-4" />, accent: 'violet' },
  { key: 'codeforcesRating', label: 'CF Rating', icon: <Trophy className="h-4 w-4" />, accent: 'gold' },
  { key: 'hackerrankBadges', label: 'HR Badges', icon: <Trophy className="h-4 w-4" />, accent: 'gold' },
  { key: 'tryhackmePoints', label: 'THM Points', icon: <Shield className="h-4 w-4" />, accent: 'emerald' },
  { key: 'tryhackmeRank', label: 'THM Rank', icon: <Swords className="h-4 w-4" />, accent: 'coral' },
];

interface PastTitle {
  id: string;
  title: string;
  weekNumber: number;
  year: number;
  createdAt: string;
}

/* ═══════════════════════════════════════════
   PROFILE PAGE
   ═══════════════════════════════════════════ */
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
      <main className="min-h-screen flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
        {githubHandleParam ? `User "${githubHandleParam}" not found.` : 'Please sign in to view your profile.'}
      </main>
    );
  }

  const pastTitles: PastTitle[] = profile.pastTitles || [];
  const rarityOrder: Record<string, number> = { legendary: 4, epic: 3, rare: 2, common: 1 };
  const sortByRarity = (a: any, b: any) => (rarityOrder[b.rarity?.toLowerCase()] || 0) - (rarityOrder[a.rarity?.toLowerCase()] || 0);
  const weeklyBadges = (profile.badges || []).filter((b: any) => b.category === 'weekly_leaderboard').sort(sortByRarity);
  const aiBadges = (profile.badges || []).filter((b: any) => b.category !== 'weekly_leaderboard').sort(sortByRarity);

  // Determine hero mesh from title rarity
  const titleRarity = (profile.titleRarity || 'common').toLowerCase();
  const heroMesh = rarityMeshMap[titleRarity] || rarityMeshMap.common;

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-8">

        {/* ──────────────────────────────────────
            HERO SECTION
            Full-width atmospheric hero with
            gradient mesh matching title rarity
            ────────────────────────────────────── */}
        <motion.section
          variants={heroCascadeVariants}
          initial="hidden"
          animate="visible"
          className={`hero-card ${heroMesh} p-6 sm:p-8`}
        >
          <div className="flex items-center gap-5">
            <Link href="/">
              <Button
                variant="outline"
                size="icon"
                className="transition-all flex-shrink-0"
                style={{
                  borderColor: 'var(--color-border-default)',
                  color: 'var(--color-text-muted)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-accent-primary)';
                  e.currentTarget.style.color = 'var(--color-accent-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-default)';
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>

            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              custom={0.1}
            >
              <Avatar
                className="h-20 w-20 border-2 flex-shrink-0"
                style={{ borderColor: 'var(--color-accent-secondary)' }}
              >
                <AvatarImage src={profile.imageUrl || undefined} />
                <AvatarFallback
                  className="text-white text-2xl font-bold"
                  style={{
                    background: 'linear-gradient(to bottom right, var(--color-accent-secondary), var(--color-accent-tertiary))',
                  }}
                >
                  {(profile.name || profile.email).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              custom={0.15}
              className="flex-1 min-w-0"
            >
              <h1 className="text-3xl font-bold gradient-text-warm truncate">
                {profile.name || profile.email}
              </h1>
              {profile.title ? (
                <div className="flex items-center gap-2 mt-1">
                  <Sparkles
                    className="h-4 w-4"
                    style={{ color: 'var(--color-accent-achievement)' }}
                  />
                  <span
                    className="text-base font-semibold tracking-wide"
                    style={{ color: 'var(--color-accent-achievement)' }}
                  >
                    {profile.title}
                  </span>
                </div>
              ) : profile.skillTreeState?.currentGrind ? (
                <p
                  className="text-sm mt-0.5"
                  style={{ color: 'var(--color-accent-secondary)' }}
                >
                  {profile.skillTreeState.currentGrind}
                </p>
              ) : null}
            </motion.div>

            {profile.githubHandle && (
              <motion.a
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                custom={0.2}
                href={`https://github.com/${profile.githubHandle}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 transition-all"
                  style={{
                    borderColor: 'var(--color-border-default)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <Code2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{profile.githubHandle}</span>
                </Button>
              </motion.a>
            )}
          </div>
        </motion.section>

        {/* ──────────────────────────────────────
            TITLE HISTORY
            prismatic-card + section-strip-secondary
            ────────────────────────────────────── */}
        {pastTitles.length > 0 && (
          <motion.section
            variants={cascadeVariants}
            initial="hidden"
            animate="visible"
            custom={1}
            className="prismatic-card p-5"
          >
            <div className="section-strip-secondary pt-3 mb-3 flex items-center gap-2">
              <Clock
                className="h-4 w-4"
                style={{ color: 'var(--color-accent-secondary)' }}
              />
              <h2
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-accent-secondary)' }}
              >
                Title History
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {pastTitles.slice(0, 8).map((pt: PastTitle, i: number) => (
                <motion.div
                  key={pt.id}
                  variants={childCascadeVariants}
                  initial="hidden"
                  animate="visible"
                  custom={i}
                  className="px-3 py-1.5 rounded-full cursor-default transition-all hover:scale-[1.03]"
                  style={{
                    background: 'var(--color-border-subtle)',
                    border: '1px solid var(--color-border-default)',
                    color: 'var(--color-text-muted)',
                  }}
                  title={`Week ${pt.weekNumber}, ${pt.year}`}
                >
                  <span className="text-sm">{pt.title}</span>
                </motion.div>
              ))}
              {pastTitles.length > 8 && (
                <div
                  className="px-3 py-1.5 rounded-full text-sm"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-border-subtle)',
                    color: 'var(--color-text-dim)',
                  }}
                >
                  +{pastTitles.length - 8} more
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* ──────────────────────────────────────
            BADGES (2/3) + STATS GRID (1/3)
            Asymmetric on desktop
            ────────────────────────────────────── */}
        <motion.section
          variants={cascadeVariants}
          initial="hidden"
          animate="visible"
          custom={2}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Badges — 2/3 */}
          {profile.badges && profile.badges.length > 0 && (
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              custom={0.1}
              className="lg:col-span-2 prismatic-card p-6"
            >
              <div className="section-strip-achievement pt-3 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy
                    className="h-5 w-5"
                    style={{ color: 'var(--color-accent-achievement)' }}
                  />
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Badges
                  </h2>
                  <Badge
                    variant="outline"
                    className="text-[9px]"
                    style={{
                      borderColor: 'var(--color-accent-secondary)',
                      color: 'var(--color-accent-secondary)',
                      background: 'var(--color-accent-secondary-dim)',
                    }}
                  >
                    {profile.badges.length}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedBadge(profile.badges[0])}
                  className="text-xs transition-all"
                  style={{
                    borderColor: 'var(--color-border-default)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  View All
                </Button>
              </div>

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
                    className="w-full py-2 text-center text-xs transition-colors"
                    style={{ color: 'var(--color-text-dim)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-dim)')}
                  >
                    +{weeklyBadges.length + aiBadges.length - 4} more badges — tap to see all
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Stats Grid — 1/3 */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            custom={0.2}
            className={profile.badges && profile.badges.length > 0 ? '' : 'lg:col-span-3'}
          >
            <div className="prismatic-card p-5">
              <div className="section-strip-primary pt-3 mb-4">
                <h2
                  className="text-lg font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Stats
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {statDefs.map((s) => {
                  const a = statAccentMap[s.accent];
                  const rawVal = (profile as any)?.[s.key] || 0;
                  return (
                    <motion.div
                      key={s.key}
                      variants={cardHover}
                      initial="rest"
                      whileHover="hover"
                      className={`prismatic-card ${a.strip} p-3 transition-shadow`}
                      style={{ borderLeft: `2px solid ${a.color}` }}
                    >
                      <div className="mb-1" style={{ color: a.color }}>
                        {s.icon}
                      </div>
                      <div
                        className="stat-value text-xl"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {typeof rawVal === 'number' ? rawVal.toLocaleString() : rawVal}
                      </div>
                      <div className="stat-label mt-0.5">{s.label}</div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* ──────────────────────────────────────
            PLATFORM HANDLES
            prismatic-card + section-strip-tertiary
            ────────────────────────────────────── */}
        {isOwnProfile && (
          <motion.section
            variants={cascadeVariants}
            initial="hidden"
            animate="visible"
            custom={3}
            className="prismatic-card p-6 space-y-5"
          >
            <div className="section-strip-tertiary pt-3 flex items-center justify-between">
              <h2
                className="text-lg font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Platform Handles
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => editing ? handleSave() : setEditing(true)}
                className="transition-all"
                style={{
                  borderColor: 'var(--color-border-default)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {editing ? 'Save' : 'Edit'}
              </Button>
            </div>

            {editing ? (
              <div className="space-y-4">
                <div>
                  <label
                    className="text-sm mb-1 block"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Display Name
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="transition-all"
                    style={{
                      background: 'var(--color-border-subtle)',
                      borderColor: 'var(--color-border-default)',
                    }}
                    placeholder="Your name"
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-accent-primary)';
                      e.currentTarget.style.boxShadow = '0 0 12px var(--color-accent-primary-dim)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border-default)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
                {Object.entries(platformLabels).map(([key, label]) => (
                  <div key={key}>
                    <label
                      className="text-sm mb-1 block"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {label}
                    </label>
                    <Input
                      value={(formData as any)[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      className="transition-all"
                      style={{
                        background: 'var(--color-border-subtle)',
                        borderColor: 'var(--color-border-default)',
                      }}
                      placeholder={`Your ${label} username`}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-accent-primary)';
                        e.currentTarget.style.boxShadow = '0 0 12px var(--color-accent-primary-dim)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border-default)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(platformLabels).map(([key, label]) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 p-3 rounded-lg transition-all"
                    style={{
                      background: 'var(--color-border-subtle)',
                      border: '1px solid var(--color-border-subtle)',
                    }}
                  >
                    <div style={{ color: 'var(--color-accent-secondary)' }}>
                      {platformIcons[key]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="stat-label">{label}</p>
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {(profile as any)?.[key] || (
                          <span style={{ color: 'var(--color-text-dim)' }} className="italic">
                            Not linked
                          </span>
                        )}
                      </p>
                    </div>
                    {(profile as any)?.[key] && (
                      <ExternalLink
                        className="h-3 w-3"
                        style={{ color: 'var(--color-text-dim)' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        )}

        {/* ──────────────────────────────────────
            ACTION BUTTONS (own profile only)
            Sync = gradient primary→secondary
            Deep Dive = accent-secondary outline
            ────────────────────────────────────── */}
        {isOwnProfile && (
          <motion.section
            variants={cascadeVariants}
            initial="hidden"
            animate="visible"
            custom={4}
            className="prismatic-card p-6"
          >
            <div className="space-y-3">
              <Button
                onClick={triggerSync}
                className="w-full text-white border-0 shadow-lg transition-all"
                style={{
                  background: 'linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary))',
                  boxShadow: '0 4px 20px var(--color-accent-primary-dim), 0 4px 20px var(--color-accent-secondary-dim)',
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </Button>
              <Button
                onClick={triggerDeepDive}
                variant="outline"
                className="w-full transition-all"
                style={{
                  borderColor: 'var(--color-accent-secondary)',
                  color: 'var(--color-accent-secondary)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-accent-secondary-dim)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Brain className="h-4 w-4 mr-2" />
                Deep Dive (AI Research)
              </Button>
            </div>
          </motion.section>
        )}

        {/* ──────────────────────────────────────
            ACHIEVEMENTS
            ────────────────────────────────────── */}
        {profile?.achievements?.length > 0 && (
          <motion.section
            variants={cascadeVariants}
            initial="hidden"
            animate="visible"
            custom={5}
            className="prismatic-card p-6"
          >
            <div className="section-strip-achievement pt-3 mb-4">
              <h2
                className="text-lg font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Achievements
              </h2>
            </div>
            <div className="space-y-2">
              {profile.achievements.map((ach: any) => (
                <div
                  key={ach.id}
                  className="flex items-center gap-3 p-3 rounded-lg transition-all"
                  style={{
                    background: 'var(--color-border-subtle)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <Trophy
                    className="h-5 w-5 flex-shrink-0"
                    style={{ color: 'var(--color-accent-achievement)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {ach.title}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {ach.description}
                    </p>
                  </div>
                  {ach.xpBonus > 0 && (
                    <Badge
                      className="text-xs"
                      style={{
                        background: 'var(--color-accent-secondary-dim)',
                        color: 'var(--color-accent-secondary)',
                        border: '1px solid rgba(168,85,247,0.3)',
                      }}
                    >
                      +{ach.xpBonus} XP
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ──────────────────────────────────────
            UNLOCKED SKILL NODES
            ────────────────────────────────────── */}
        {profile?.dynamicNodes && profile.dynamicNodes.length > 0 && (
          <motion.section
            variants={cascadeVariants}
            initial="hidden"
            animate="visible"
            custom={6}
            className="prismatic-card p-6"
          >
            <div className="section-strip-success pt-3 mb-4">
              <h2
                className="text-lg font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Unlocked Skills
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.dynamicNodes.map((node: any) => (
                <Badge
                  key={node.id}
                  variant="outline"
                  className="text-xs px-3 py-1"
                  style={{
                    borderColor: 'var(--color-accent-secondary)',
                    color: 'var(--color-accent-secondary)',
                    background: 'var(--color-accent-secondary-dim)',
                  }}
                >
                  {node.name}
                </Badge>
              ))}
            </div>
          </motion.section>
        )}
      </div>

      {/* ──────────────────────────────────────
          BADGE MODAL
          Float surface + noise-overlay +
          prismatic border + scale-in animation
          ────────────────────────────────────── */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedBadge(null)}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: durations.fast }}
              className="absolute inset-0"
              style={{
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(8px)',
              }}
            />

            {/* Modal panel */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto prismatic-card noise-overlay p-5 sm:p-7"
              style={{
                background: 'var(--color-float)',
                borderRadius: 'var(--radius-container)',
              }}
            >
              <button
                onClick={() => setSelectedBadge(null)}
                className="absolute top-4 right-4 z-10 transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
              >
                <X className="h-5 w-5" />
              </button>

              <div
                className="flex items-center gap-2 mb-5 sticky top-0 pb-3 pt-1 z-[1]"
                style={{
                  background: 'var(--color-float)',
                }}
              >
                <Crown
                  className="h-5 w-5"
                  style={{ color: 'var(--color-accent-achievement)' }}
                />
                <h2
                  className="text-lg font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  All Badges
                </h2>
                <Badge
                  variant="outline"
                  className="text-[9px]"
                  style={{
                    borderColor: 'var(--color-accent-secondary)',
                    color: 'var(--color-accent-secondary)',
                    background: 'var(--color-accent-secondary-dim)',
                  }}
                >
                  {profile.badges.length}
                </Badge>
              </div>

              <BadgeGrid badges={profile.badges} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
