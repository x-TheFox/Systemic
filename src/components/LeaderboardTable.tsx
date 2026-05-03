"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

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
  rankChange?: number;
}

const podiumConfig: Record<number, { src: string; title: string; subtitle: string; color: string; ring: string; shadow: string; border: string; nameColor: string }> = {
  1: {
    src: '/badges/mvp.svg',
    title: 'THE HONORED ONE',
    subtitle: '1ST PLACE',
    color: 'var(--color-accent-achievement)',
    ring: 'ring-2 ring-amber-400/80',
    shadow: '0 0 40px rgba(251,191,36,0.5), 0 0 80px rgba(251,191,36,0.2), 0 0 120px rgba(251,191,36,0.08)',
    border: 'border-amber-400/40',
    nameColor: 'text-amber-400',
  },
  2: {
    src: '/badges/2nd.svg',
    title: 'SILVER RUNNER',
    subtitle: '2ND PLACE',
    color: 'var(--color-accent-secondary)',
    ring: 'ring-2 ring-purple-500/80',
    shadow: '0 0 30px rgba(168,85,247,0.4), 0 0 60px rgba(168,85,247,0.15)',
    border: 'border-purple-500/40',
    nameColor: 'text-purple-400',
  },
  3: {
    src: '/badges/3rd.svg',
    title: 'BRONZE CHALLENGER',
    subtitle: '3RD PLACE',
    color: '#22D3EE',
    ring: 'ring-2 ring-cyan-400/80',
    shadow: '0 0 25px rgba(34,211,238,0.35), 0 0 50px rgba(34,211,238,0.1)',
    border: 'border-cyan-400/40',
    nameColor: 'text-cyan-400',
  },
};

const bottomBadgeConfig: Record<string, { src: string; label: string; color: string; border: string; shadow: string }> = {
  'svg:last1': {
    src: '/badges/last1.svg',
    label: 'THE LURKER',
    color: 'var(--color-text-muted)',
    border: 'border-[var(--color-border-subtle)]',
    shadow: '0 0 15px rgba(107,114,128,0.25)',
  },
  'svg:last2': {
    src: '/badges/last2.svg',
    label: 'THE PENULTIMATE',
    color: 'var(--color-text-muted)',
    border: 'border-[var(--color-border-subtle)]',
    shadow: '0 0 15px rgba(107,114,128,0.25)',
  },
};

/* ── Animation presets ── */
const containerStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const podiumVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const podiumItem = (rank: number) => ({
  hidden: { opacity: 0, y: rank === 1 ? 40 : 28, scale: rank === 1 ? 0.9 : 0.92 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: (3 - rank) * 0.08 },
  },
});

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
          <Skeleton key={i} className="h-20 w-full" style={{ borderRadius: 'var(--radius-standard)' }} />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12"
        style={{ color: 'var(--color-text-dim)' }}
      >
        No players yet. Be the first to sync!
      </motion.div>
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

  function RankChangeIndicator({ change }: { change?: number }) {
    if (change === undefined || change === 0) return null;
    const isUp = change > 0;
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${
          isUp ? 'text-emerald-400' : 'text-red-400'
        }`}
      >
        {isUp ? '▲' : '▼'}
        {Math.abs(change)}
      </span>
    );
  }

  /* Reorder podium for asymmetric visual: 2nd | 1st | 3rd */
  const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <motion.div
      className="space-y-6"
      variants={containerStagger}
      initial="hidden"
      animate="visible"
    >
      {/* ── Podium — Top 3 ── */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"
        variants={podiumVariants}
      >
        {podiumOrder.map((user) => {
          const rank = users.indexOf(user) + 1;
          const cfg = podiumConfig[rank];
          const profileUrl = user.githubHandle ? `/profile?github=${user.githubHandle}` : '#';
          const isClickable = !!user.githubHandle;
          const Wrapper = isClickable ? Link : 'div';
          const wrapperProps = isClickable ? { href: profileUrl } : {};
          const isFirst = rank === 1;

          return (
            // @ts-expect-error dynamic wrapper
            <Wrapper key={user.id} {...wrapperProps} className="block">
              <motion.div
                variants={podiumItem(rank)}
                className={`hero-card relative flex flex-col items-center rounded-2xl border backdrop-blur-sm transition-all hover:scale-[1.02] cursor-pointer ${
                  isFirst ? 'p-8 pb-10' : 'p-6 pb-8'
                } ${cfg.border}`}
                style={{
                  boxShadow: cfg.shadow,
                  background: isFirst
                    ? 'linear-gradient(to bottom, rgba(251,191,36,0.08), rgba(251,191,36,0.02))'
                    : 'linear-gradient(to bottom, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                  borderRadius: 'var(--radius-container)',
                }}
              >
                {/* Crown for 1st */}
                {isFirst && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.4, type: 'spring' }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2 text-3xl drop-shadow-lg"
                  >
                    👑
                  </motion.div>
                )}

                {/* Badge image with glow */}
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 + (3 - rank) * 0.1, duration: 0.5, type: 'spring' }}
                  className={`rounded-2xl overflow-hidden ${cfg.ring} mb-4 flex items-center justify-center ${
                    isFirst ? 'h-40 w-40' : 'h-32 w-32'
                  }`}
                  style={{
                    boxShadow: cfg.shadow,
                    background: isFirst
                      ? 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)'
                      : rank === 2
                        ? 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)',
                  }}
                >
                  <img
                    src={cfg.src}
                    alt={cfg.title}
                    className="h-full w-full object-contain"
                    style={{
                      filter: isFirst
                        ? 'drop-shadow(0 0 16px rgba(251,191,36,0.6))'
                        : rank === 2
                          ? 'drop-shadow(0 0 12px rgba(168,85,247,0.5))'
                          : 'drop-shadow(0 0 10px rgba(34,211,238,0.5))',
                    }}
                  />
                </motion.div>

                {/* Title & subtitle */}
                <div className="text-center mb-2">
                  <div
                    className={`text-xs font-black tracking-[0.2em] ${cfg.nameColor} opacity-80`}
                  >
                    {cfg.title}
                  </div>
                  <div
                    className="text-[10px] tracking-wider"
                    style={{ color: 'var(--color-text-dim)' }}
                  >
                    {cfg.subtitle}
                  </div>
                </div>

                {/* Avatar */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4 + (3 - rank) * 0.08, type: 'spring' }}
                >
                  <Avatar
                    className={`border-2 mb-2 ${isFirst ? 'h-12 w-12' : 'h-11 w-11'}`}
                    style={{ borderColor: 'var(--color-border-default)' }}
                  >
                    <AvatarImage src={user.imageUrl || undefined} />
                    <AvatarFallback
                      className="text-white text-sm font-bold"
                      style={{ background: 'linear-gradient(to bottom right, var(--color-accent-secondary), #22D3EE)' }}
                    >
                      {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>

                {/* Name & stats */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      className="font-bold truncate max-w-[180px]"
                      style={{ color: 'var(--color-text-primary)', fontSize: isFirst ? '1.05rem' : '0.95rem' }}
                    >
                      {user.name || user.email.split('@')[0]}
                    </span>
                    <RankChangeIndicator change={user.rankChange} />
                  </div>

                  {user.title && (
                    <span
                      className="inline-block mt-1 px-3 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{
                        background: 'linear-gradient(to right, rgba(251,191,36,0.2), rgba(251,191,36,0.05))',
                        border: '1px solid rgba(251,191,36,0.3)',
                        color: 'var(--color-accent-achievement)',
                        borderRadius: 'var(--radius-compact)',
                      }}
                    >
                      {user.title}
                    </span>
                  )}
                  {!user.title && user.skillTreeState?.currentGrind && (
                    <span
                      className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px]"
                      style={{
                        border: '1px solid rgba(168,85,247,0.3)',
                        color: 'var(--color-accent-secondary)',
                        background: 'rgba(168,85,247,0.1)',
                        borderRadius: 'var(--radius-compact)',
                      }}
                    >
                      {user.skillTreeState.currentGrind}
                    </span>
                  )}

                  <div className="mt-2">
                    <span className="stat-value" style={{ color: 'var(--color-text-primary)', fontSize: isFirst ? '1.65rem' : '1.5rem' }}>
                      {user.xp.toLocaleString()}
                    </span>
                    <span className="stat-label" style={{ color: 'var(--color-accent-secondary)', fontSize: '0.8rem', marginLeft: '4px' }}>
                      XP
                    </span>
                  </div>

                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {user.totalCommits} commits · {user.totalPRs} PRs · {user.leetcodeHard}H
                  </div>
                </div>
              </motion.div>
            </Wrapper>
          );
        })}
      </motion.div>

      {/* ── Middle — Rank 4+ ── */}
      {middleUsers.length > 0 && (
        <motion.div
          className="space-y-2"
          variants={containerStagger}
          initial="hidden"
          animate="visible"
        >
          {middleUsers.map((user, idx) => {
            const rank = users.indexOf(user) + 1;
            const profileUrl = user.githubHandle ? `/profile?github=${user.githubHandle}` : '#';
            const isClickable = !!user.githubHandle;

            return (
              <motion.div key={user.id} variants={fadeUp} custom={idx}>
                {isClickable ? (
                  <Link href={profileUrl} className="block">
                    <div
                      className="prismatic-card flex items-center gap-3 p-3 border backdrop-blur-sm transition-all hover:scale-[1.005] hover:bg-white/[0.05]"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderColor: 'var(--color-border-subtle)',
                        borderRadius: 'var(--radius-standard)',
                      }}
                    >
                      <div
                        className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold flex-shrink-0"
                        style={{
                          background: 'var(--color-surface)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {rank}
                      </div>

                      <Avatar className="h-8 w-8 flex-shrink-0" style={{ border: '1px solid var(--color-border-subtle)' }}>
                        <AvatarImage src={user.imageUrl || undefined} />
                        <AvatarFallback
                          className="text-white text-xs font-bold"
                          style={{ background: 'linear-gradient(to bottom right, var(--color-accent-secondary), #22D3EE)' }}
                        >
                          {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {user.name || user.email.split('@')[0]}
                          </span>
                          <RankChangeIndicator change={user.rankChange} />
                          {user.title && (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-semibold tracking-wide"
                              style={{
                                borderColor: 'rgba(251,191,36,0.4)',
                                color: 'var(--color-accent-achievement)',
                                background: 'rgba(251,191,36,0.15)',
                              }}
                            >
                              {user.title}
                            </Badge>
                          )}
                          {user.skillTreeState?.currentGrind && !user.title && (
                            <Badge
                              variant="outline"
                              className="text-[9px]"
                              style={{
                                borderColor: 'rgba(168,85,247,0.3)',
                                color: 'var(--color-accent-secondary)',
                                background: 'rgba(168,85,247,0.1)',
                              }}
                            >
                              {user.skillTreeState.currentGrind}
                            </Badge>
                          )}
                        </div>
                        <Progress
                          value={(user.xp / maxXP) * 100}
                          className="h-1 mt-1"
                          style={{ background: 'var(--color-surface)' }}
                        />
                      </div>

                      <div className="text-right shrink-0">
                        <div>
                          <span className="stat-value font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {user.xp.toLocaleString()}
                          </span>
                          <span className="stat-label" style={{ color: 'var(--color-accent-secondary)', fontSize: '10px', marginLeft: '2px' }}>
                            XP
                          </span>
                        </div>
                        <div className="text-[9px]" style={{ color: 'var(--color-text-dim)' }}>
                          {user.totalCommits}c · {user.totalPRs}p · {user.leetcodeHard}H
                        </div>
                      </div>

                      <ExternalLink className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--color-text-dim)' }} />
                    </div>
                  </Link>
                ) : (
                  <div
                    className="prismatic-card flex items-center gap-3 p-3 border backdrop-blur-sm"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderColor: 'var(--color-border-subtle)',
                      borderRadius: 'var(--radius-standard)',
                    }}
                  >
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold flex-shrink-0"
                      style={{
                        background: 'var(--color-surface)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {rank}
                    </div>

                    <Avatar className="h-8 w-8 flex-shrink-0" style={{ border: '1px solid var(--color-border-subtle)' }}>
                      <AvatarImage src={user.imageUrl || undefined} />
                      <AvatarFallback
                        className="text-white text-xs font-bold"
                        style={{ background: 'linear-gradient(to bottom right, var(--color-accent-secondary), #22D3EE)' }}
                      >
                        {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {user.name || user.email.split('@')[0]}
                        </span>
                        <RankChangeIndicator change={user.rankChange} />
                        {user.title && (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-semibold tracking-wide"
                            style={{
                              borderColor: 'rgba(251,191,36,0.4)',
                              color: 'var(--color-accent-achievement)',
                              background: 'rgba(251,191,36,0.15)',
                            }}
                          >
                            {user.title}
                          </Badge>
                        )}
                        {user.skillTreeState?.currentGrind && !user.title && (
                          <Badge
                            variant="outline"
                            className="text-[9px]"
                            style={{
                              borderColor: 'rgba(168,85,247,0.3)',
                              color: 'var(--color-accent-secondary)',
                              background: 'rgba(168,85,247,0.1)',
                            }}
                          >
                            {user.skillTreeState.currentGrind}
                          </Badge>
                        )}
                      </div>
                      <Progress
                        value={(user.xp / maxXP) * 100}
                        className="h-1 mt-1"
                        style={{ background: 'var(--color-surface)' }}
                      />
                    </div>

                    <div className="text-right shrink-0">
                      <div>
                        <span className="stat-value font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {user.xp.toLocaleString()}
                        </span>
                        <span className="stat-label" style={{ color: 'var(--color-accent-secondary)', fontSize: '10px', marginLeft: '2px' }}>
                          XP
                        </span>
                      </div>
                      <div className="text-[9px]" style={{ color: 'var(--color-text-dim)' }}>
                        {user.totalCommits}c · {user.totalPRs}p · {user.leetcodeHard}H
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ── Bottom — Last 2 ── */}
      {bottom2.length > 0 && (
        <motion.div
          variants={containerStagger}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <motion.div
            variants={fadeUp}
            className="text-[10px] uppercase tracking-[0.25em] text-center"
            style={{ color: 'var(--color-text-dim)' }}
          >
            The Shadows Below
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            variants={containerStagger}
            initial="hidden"
            animate="visible"
          >
            {bottom2.map((user) => {
              const badgeInfo = getBottomBadge(user);
              const profileUrl = user.githubHandle ? `/profile?github=${user.githubHandle}` : '#';
              const isClickable = !!user.githubHandle;
              const Wrapper = isClickable ? Link : 'div';
              const wrapperProps = isClickable ? { href: profileUrl } : {};

              return (
                // @ts-expect-error dynamic wrapper
                <Wrapper key={user.id} {...wrapperProps} className="block">
                  <motion.div
                    variants={scaleIn}
                    className="prismatic-card relative flex flex-col items-center p-6 pb-8 border backdrop-blur-sm transition-all hover:scale-[1.01] cursor-pointer"
                    style={{
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                      borderColor: 'var(--color-border-subtle)',
                      borderRadius: 'var(--radius-container)',
                    }}
                  >
                    {badgeInfo && (
                      <>
                        <motion.div
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.2, duration: 0.45, type: 'spring' }}
                          className="h-24 w-24 rounded-xl overflow-hidden mb-2 flex items-center justify-center"
                          style={{
                            border: '1px solid var(--color-border-subtle)',
                            boxShadow: badgeInfo.shadow,
                            background: 'radial-gradient(circle, rgba(107,114,128,0.08) 0%, transparent 70%)',
                            borderRadius: 'var(--radius-standard)',
                          }}
                        >
                          <img
                            src={badgeInfo.src}
                            alt={badgeInfo.label}
                            className="h-full w-full object-contain"
                            style={{ filter: 'drop-shadow(0 0 8px rgba(107,114,128,0.35))' }}
                          />
                        </motion.div>
                        <div
                          className="text-[10px] font-black tracking-[0.2em] mb-2"
                          style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}
                        >
                          {badgeInfo.label}
                        </div>
                      </>
                    )}

                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.35, type: 'spring' }}
                    >
                      <Avatar
                        className="h-10 w-10 mb-2"
                        style={{ border: '1px solid var(--color-border-subtle)' }}
                      >
                        <AvatarImage src={user.imageUrl || undefined} />
                        <AvatarFallback
                          className="text-white text-xs font-bold"
                          style={{ background: 'linear-gradient(to bottom right, var(--color-text-muted), var(--color-text-dim))' }}
                        >
                          {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>

                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className="text-sm font-medium truncate max-w-[160px]"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {user.name || user.email.split('@')[0]}
                        </span>
                        <RankChangeIndicator change={user.rankChange} />
                      </div>

                      {user.title && (
                        <span
                          className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px]"
                          style={{
                            border: '1px solid rgba(251,191,36,0.2)',
                            color: 'rgba(251,191,36,0.5)',
                            background: 'rgba(251,191,36,0.1)',
                            borderRadius: 'var(--radius-compact)',
                          }}
                        >
                          {user.title}
                        </span>
                      )}

                      <div className="mt-1">
                        <span className="stat-value font-bold text-xl" style={{ color: 'var(--color-text-secondary)' }}>
                          {user.xp.toLocaleString()}
                        </span>
                        <span className="stat-label" style={{ color: 'var(--color-accent-secondary)', fontSize: '10px', marginLeft: '3px', opacity: 0.5 }}>
                          XP
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Wrapper>
              );
            })}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
