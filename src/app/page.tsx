"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { SkillRadar } from '@/components/SkillRadar';
import { SkillTree } from '@/components/SkillTree';
import { PulseFeed } from '@/components/PulseFeed';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import { WeeklyAnnouncement } from '@/components/WeeklyAnnouncement';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Activity, Trophy, Zap, GitBranch, Brain,
  Flame, ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  cascadeVariants, heroCascadeVariants, childCascadeVariants,
  fadeInUp, cardHover,
} from '@/lib/motion';
import Link from 'next/link';

/* ═══════════════════════════════════════════
   Accent color map for stat cards
   ═══════════════════════════════════════════ */
const accentMap: Record<string, { color: string; dim: string; glow: string; strip: string }> = {
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
  emerald: {
    color: 'var(--color-accent-success)',
    dim: 'var(--color-accent-success-dim)',
    glow: 'glow-success',
    strip: 'section-strip-success',
  },
};

/* ═══════════════════════════════════════════
   StatCard — prismatic-card with section strip,
   stat-value, stat-label, hover glow
   ═══════════════════════════════════════════ */
function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: keyof typeof accentMap;
}) {
  const a = accentMap[accent];
  return (
    <motion.div
      variants={cardHover}
      initial="rest"
      whileHover="hover"
      className={`prismatic-card ${a.strip} ${a.glow} p-4 transition-shadow`}
    >
      <div className="mb-2" style={{ color: a.color }}>
        {icon}
      </div>
      <div className="stat-value text-2xl" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </div>
      <div className="stat-label mt-1">{label}</div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   Section Header — each with distinct accent
   ═══════════════════════════════════════════ */
function SectionHeader({
  icon,
  title,
  stripClass,
  accentColor,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  stripClass: string;
  accentColor: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className={`${stripClass} pt-4 mb-4 flex items-center gap-3`}>
      <div style={{ color: accentColor }}>{icon}</div>
      <h2
        className="text-lg font-semibold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {title}
      </h2>
      {badge}
    </div>
  );
}

/* ═══════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════ */
export default function Home() {
  const { user, isLoaded } = useUser();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user) {
      setLoading(false);
      return;
    }
    async function loadStats() {
      if (!user) return;
      try {
        const res = await fetch(`/api/profile?clerkId=${user.id}`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setStats(data.user);
      } catch {
        // Stats will show placeholder
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [isLoaded, user]);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-10">
      {/* ──────────────────────────────────────
          1. XP HERO SECTION (full width, tall)
          hero-card + mesh-gradient-primary + ambient-coral
          ────────────────────────────────────── */}
      <motion.section
        variants={heroCascadeVariants}
        initial="hidden"
        animate="visible"
        className="hero-card mesh-gradient-primary ambient-coral shimmer-sweep p-8 sm:p-12"
      >
        <div className="section-strip-primary pt-5 mb-6">
          <div className="flex items-center gap-2">
            <Flame
              className="h-5 w-5"
              style={{ color: 'var(--color-accent-primary)' }}
            />
            <span
              className="stat-label"
              style={{ color: 'var(--color-accent-primary)' }}
            >
              Your Power Level
            </span>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-20 w-64 mb-6 rounded-xl" />
        ) : (
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            custom={0.15}
          >
            <span
              className="gradient-text-warm font-mono leading-none"
              style={{ fontSize: '48px', fontWeight: 900 }}
            >
              {stats?.xp?.toLocaleString() ?? '—'}
            </span>
            <span
              className="stat-label ml-3"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Total XP
            </span>
          </motion.div>
        )}

        {/* Compact secondary stats row */}
        <motion.div
          variants={childCascadeVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap gap-6 mt-6"
        >
          <div className="flex items-center gap-2">
            <GitBranch
              className="h-4 w-4"
              style={{ color: 'var(--color-accent-tertiary)' }}
            />
            <span
              className="stat-value text-lg"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {stats?.totalCommits?.toLocaleString() ?? '—'}
            </span>
            <span className="stat-label">Commits</span>
          </div>
          <div className="flex items-center gap-2">
            <Brain
              className="h-4 w-4"
              style={{ color: 'var(--color-accent-secondary)' }}
            />
            <span
              className="stat-value text-lg"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {stats?.leetcodeHard?.toString() ?? '—'}
            </span>
            <span className="stat-label">LC Hard</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity
              className="h-4 w-4"
              style={{ color: 'var(--color-accent-success)' }}
            />
            <span
              className="stat-value text-lg"
              style={{ color: 'var(--color-accent-success)' }}
            >
              {stats ? 'Now' : '—'}
            </span>
            <span className="stat-label">Active</span>
          </div>
        </motion.div>
      </motion.section>

      {/* ──────────────────────────────────────
          2. WEEKLY POST-MORTEM (60%) + STAT GRID (40%)
          Asymmetric split
          ────────────────────────────────────── */}
      <motion.section
        variants={cascadeVariants}
        initial="hidden"
        animate="visible"
        custom={1}
        className="grid grid-cols-1 lg:grid-cols-5 gap-6"
      >
        {/* Weekly Post-Mortem — 3/5 = 60% */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          custom={0.1}
          className="lg:col-span-3"
        >
          <WeeklyAnnouncement />
        </motion.div>

        {/* Stat Grid — 2/5 = 40% */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          custom={0.2}
          className="lg:col-span-2 grid grid-cols-2 gap-3 content-start"
        >
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          ) : (
            <>
              <StatCard
                icon={<Zap className="h-5 w-5" />}
                label="Total XP"
                value={stats?.xp?.toLocaleString() ?? '—'}
                accent="coral"
              />
              <StatCard
                icon={<GitBranch className="h-5 w-5" />}
                label="Commits"
                value={stats?.totalCommits?.toLocaleString() ?? '—'}
                accent="cyan"
              />
              <StatCard
                icon={<Brain className="h-5 w-5" />}
                label="LC Hard"
                value={stats?.leetcodeHard?.toString() ?? '—'}
                accent="violet"
              />
              <StatCard
                icon={<Activity className="h-5 w-5" />}
                label="Active"
                value={stats ? 'Now' : '—'}
                accent="emerald"
              />
            </>
          )}
        </motion.div>
      </motion.section>

      {/* ──────────────────────────────────────
          3. SKILL TREE (full width)
          mesh-gradient-garden + section-strip-success
          ══════════════════════════════════════ */}
      <motion.section
        variants={cascadeVariants}
        initial="hidden"
        animate="visible"
        custom={2}
        className="prismatic-card mesh-gradient-garden p-6"
      >
        <SectionHeader
          icon={<Zap className="h-5 w-5" />}
          title="Skill Tree"
          stripClass="section-strip-success"
          accentColor="var(--color-accent-success)"
          badge={
            <Badge
              variant="outline"
              className="text-[9px] ml-auto"
              style={{
                borderColor: 'var(--color-accent-secondary)',
                color: 'var(--color-accent-secondary)',
                background: 'var(--color-accent-secondary-dim)',
              }}
            >
              AI-GROWN
            </Badge>
          }
        />
        <SkillTree />
      </motion.section>

      {/* ──────────────────────────────────────
          4. THE PULSE (55%) + AI SKILL RADAR (45%)
          Asymmetric side by side
          ══════════════════════════════════════ */}
      <motion.section
        variants={cascadeVariants}
        initial="hidden"
        animate="visible"
        custom={3}
        className="grid grid-cols-1 lg:grid-cols-9 gap-6"
      >
        {/* The Pulse — 5/9 ≈ 55% */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          custom={0.1}
          className="lg:col-span-5"
        >
          <PulseFeed />
        </motion.div>

        {/* AI Skill Radar — 4/9 ≈ 45% */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          custom={0.2}
          className="lg:col-span-4"
        >
          <SkillRadar />
        </motion.div>
      </motion.section>

      {/* ──────────────────────────────────────
          5. LEADERBOARD PREVIEW (full width)
          mesh-gradient-arena + section-strip-achievement
          ══════════════════════════════════════ */}
      <motion.section
        variants={cascadeVariants}
        initial="hidden"
        animate="visible"
        custom={4}
        className="hero-card mesh-gradient-arena p-6"
      >
        <div className="flex items-center justify-between">
          <SectionHeader
            icon={<Trophy className="h-5 w-5" />}
            title="Leaderboard"
            stripClass="section-strip-achievement"
            accentColor="var(--color-accent-achievement)"
          />
          <Link href="/leaderboard">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 transition-all"
              style={{
                borderColor: 'var(--color-border-default)',
                color: 'var(--color-text-muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent-achievement)';
                e.currentTarget.style.color = 'var(--color-accent-achievement)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-default)';
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }}
            >
              View All
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
        <LeaderboardTable />
      </motion.section>
    </main>
  );
}
