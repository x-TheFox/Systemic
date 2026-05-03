"use client";

import { Zap, Shield, Cpu, Flame, Target, Code, Database, Globe, Trophy, Star, Crown, Sword } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cascadeVariants, badgeUnlockVariants, cardHover } from '@/lib/motion';

interface Badge {
  id: string;
  name: string;
  description: string;
  rarity: string;
  color: string;
  icon: string;
  category: string;
}

const iconMap: Record<string, any> = {
  Zap, Shield, Cpu, Flame, Target, Code, Database, Globe, Trophy, Star, Crown, Sword,
};

const rarityStyles: Record<string, {
  border: string;
  text: string;
  bg: string;
  glowClass: string;
  accentVar: string;
}> = {
  common: {
    border: 'var(--color-border-default)',
    text: 'var(--color-text-muted)',
    bg: 'var(--color-border-subtle)',
    glowClass: 'badge-glow-common',
    accentVar: 'var(--color-text-muted)',
  },
  rare: {
    border: 'var(--color-accent-tertiary)',
    text: 'var(--color-accent-tertiary)',
    bg: 'var(--color-accent-tertiary-dim)',
    glowClass: 'badge-glow-rare',
    accentVar: 'var(--color-accent-tertiary)',
  },
  epic: {
    border: 'var(--color-accent-secondary)',
    text: 'var(--color-accent-secondary)',
    bg: 'var(--color-accent-secondary-dim)',
    glowClass: 'badge-glow-epic',
    accentVar: 'var(--color-accent-secondary)',
  },
  legendary: {
    border: 'var(--color-accent-achievement)',
    text: 'var(--color-accent-achievement)',
    bg: 'var(--color-accent-achievement-dim)',
    glowClass: 'badge-glow-legendary',
    accentVar: 'var(--color-accent-achievement)',
  },
};

const weeklySvgMap: Record<string, { src: string; shadow: string }> = {
  'svg:mvp': { src: '/badges/mvp.svg', shadow: '0 0 40px rgba(251,191,36,0.5), 0 0 80px rgba(251,191,36,0.2)' },
  'svg:2nd': { src: '/badges/2nd.svg', shadow: '0 0 35px rgba(168,85,247,0.4), 0 0 70px rgba(168,85,247,0.15)' },
  'svg:3rd': { src: '/badges/3rd.svg', shadow: '0 0 30px rgba(34,211,238,0.35), 0 0 60px rgba(34,211,238,0.1)' },
  'svg:last2': { src: '/badges/last2.svg', shadow: '0 0 15px rgba(156,163,184,0.2)' },
  'svg:last1': { src: '/badges/last1.svg', shadow: '0 0 15px rgba(156,163,184,0.2)' },
};

export function BadgeCard({ badge }: { badge: Badge }) {
  const style = rarityStyles[badge.rarity.toLowerCase()] || rarityStyles.common;
  const isSvg = badge.icon?.startsWith('svg:');
  const svgInfo = isSvg ? weeklySvgMap[badge.icon] : null;
  const Icon = !isSvg ? iconMap[badge.icon] || Zap : null;
  const isWeekly = badge.category === 'weekly_leaderboard';

  // Weekly SVG badges with prismatic border glow
  if (isWeekly && svgInfo) {
    return (
      <motion.div
        variants={cardHover}
        initial="rest"
        whileHover="hover"
        className={`relative prismatic-card ${style.glowClass} p-5 sm:p-6 transition-shadow`}
        style={{
          boxShadow: svgInfo.shadow,
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div
            className={`relative flex-shrink-0 rounded-xl overflow-hidden ring-2 animate-pulse`}
            style={{
              width: '120px',
              height: '120px',
              boxShadow: svgInfo.shadow,
              ['--tw-ring-color' as string]: style.border,
            }}
          >
            <img
              src={svgInfo.src}
              alt={badge.name}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className="text-base sm:text-lg font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {badge.name}
              </span>
              <span
                className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border font-bold"
                style={{
                  borderColor: style.border,
                  color: style.text,
                  background: style.bg,
                }}
              >
                {badge.rarity}
              </span>
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {badge.description}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // AI / inline badges with shimmer on hover
  return (
    <motion.div
      variants={cardHover}
      initial="rest"
      whileHover="hover"
      className={`group relative prismatic-card p-3 sm:p-4 shimmer-sweep`}
      style={{
        boxShadow: `0 0 20px ${badge.color}15`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{
            width: '80px',
            height: '80px',
            background: `linear-gradient(135deg, ${badge.color}30, ${badge.color}10)`,
            border: `1px solid ${badge.color}40`,
          }}
        >
          <Icon
            className="h-8 w-8"
            style={{ color: badge.color }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span
              className="text-sm font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {badge.name}
            </span>
            <span
              className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border font-bold"
              style={{
                borderColor: style.border,
                color: style.text,
                background: style.bg,
              }}
            >
              {badge.rarity}
            </span>
          </div>
          <p
            className="text-xs leading-relaxed"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {badge.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function BadgeGrid({ badges }: { badges: Badge[] }) {
  if (!badges || badges.length === 0) {
    return (
      <motion.div
        variants={cascadeVariants}
        initial="hidden"
        animate="visible"
        custom={0}
        className="flex flex-col items-center justify-center py-10"
        style={{ color: 'var(--color-text-dim)' }}
      >
        {/* Dimmed wireframe with dashed animated border */}
        <div
          className="w-20 h-20 rounded-xl flex items-center justify-center mb-3"
          style={{
            border: '2px dashed var(--color-border-default)',
            animation: 'pulse-glow 3s ease-in-out infinite',
          }}
        >
          <Trophy className="h-8 w-8 opacity-30" />
        </div>
        <p className="text-sm">No badges yet. Keep grinding!</p>
      </motion.div>
    );
  }

  const rarityOrder: Record<string, number> = { legendary: 4, epic: 3, rare: 2, common: 1 };
  const sortByRarity = (a: Badge, b: Badge) => (rarityOrder[b.rarity.toLowerCase()] || 0) - (rarityOrder[a.rarity.toLowerCase()] || 0);

  const weeklyBadges = badges.filter(b => b.category === 'weekly_leaderboard').sort(sortByRarity);
  const aiBadges = badges.filter(b => b.category !== 'weekly_leaderboard').sort(sortByRarity);

  return (
    <motion.div
      variants={cascadeVariants}
      initial="hidden"
      animate="visible"
      custom={0}
      className="space-y-5"
    >
      {weeklyBadges.length > 0 && (
        <div>
          <h3
            className="section-strip-achievement pt-3 mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wider font-medium"
            style={{ color: 'var(--color-accent-achievement)' }}
          >
            <Crown className="h-3.5 w-3.5" />
            Weekly Honors
          </h3>
          <div className="space-y-3">
            <AnimatePresence>
              {weeklyBadges.map((badge, i) => (
                <motion.div
                  key={badge.id}
                  variants={badgeUnlockVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: i * 0.1 }}
                >
                  <BadgeCard badge={badge} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
      {aiBadges.length > 0 && (
        <div>
          <h3
            className="section-strip-secondary pt-3 mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wider font-medium"
            style={{ color: 'var(--color-accent-secondary)' }}
          >
            <Trophy className="h-3.5 w-3.5" />
            AI-Forged Badges
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence>
              {aiBadges.map((badge, i) => (
                <motion.div
                  key={badge.id}
                  variants={badgeUnlockVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.2 + i * 0.06 }}
                >
                  <BadgeCard badge={badge} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
}
