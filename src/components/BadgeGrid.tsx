"use client";

import { Zap, Shield, Cpu, Flame, Target, Code, Database, Globe, Trophy, Star, Crown, Sword } from 'lucide-react';

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

const rarityStyles: Record<string, { border: string; glow: string; text: string; bg: string }> = {
  common: { border: 'border-gray-500/30', glow: 'shadow-gray-500/10', text: 'text-gray-400', bg: 'from-gray-500/10 to-transparent' },
  rare: { border: 'border-blue-500/30', glow: 'shadow-blue-500/10', text: 'text-blue-400', bg: 'from-blue-500/10 to-transparent' },
  epic: { border: 'border-purple-500/30', glow: 'shadow-purple-500/10', text: 'text-purple-400', bg: 'from-purple-500/10 to-transparent' },
  legendary: { border: 'border-amber-500/30', glow: 'shadow-amber-500/10', text: 'text-amber-400', bg: 'from-amber-500/10 to-transparent' },
};

const weeklyBadgeSvgMap: Record<string, string> = {
  'svg:mvp': '/badges/mvp.svg',
  'svg:2nd': '/badges/2nd.svg',
  'svg:3rd': '/badges/3rd.svg',
  'svg:last1': '/badges/last1.svg',
  'svg:last2': '/badges/last2.svg',
};

export function BadgeCard({ badge }: { badge: Badge }) {
  const style = rarityStyles[badge.rarity.toLowerCase()] || rarityStyles.common;
  const isSvg = badge.icon?.startsWith('svg:');
  const svgSrc = isSvg ? weeklyBadgeSvgMap[badge.icon] : null;
  const Icon = !isSvg ? iconMap[badge.icon] || Zap : null;
  const isWeeklyLeaderboard = badge.category === 'weekly_leaderboard';

  return (
    <div
      className={`relative p-4 rounded-xl border ${style.border} bg-gradient-to-br ${style.bg} backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-lg ${style.glow} ${isWeeklyLeaderboard ? 'ring-1 ring-white/10' : ''}`}
      style={{ boxShadow: `0 0 ${isWeeklyLeaderboard ? '30px' : '20px'} ${badge.color}20` }}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex items-center justify-center rounded-lg shrink-0 ${isWeeklyLeaderboard ? 'h-16 w-16' : 'h-10 w-10'}`}
          style={{ background: `linear-gradient(135deg, ${badge.color}30, ${badge.color}10)`, border: `1px solid ${badge.color}40` }}
        >
          {isSvg && svgSrc ? (
            <img src={svgSrc} alt={badge.name} className="h-full w-full object-contain p-1" />
          ) : (
            <Icon className={`${isWeeklyLeaderboard ? 'h-8 w-8' : 'h-5 w-5'}`} style={{ color: badge.color }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`${isWeeklyLeaderboard ? 'text-base' : 'text-sm'} font-bold text-white truncate`}>{badge.name}</span>
            <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${style.border} ${style.text}`}>
              {badge.rarity}
            </span>
          </div>
          <p className="text-xs text-white/40 leading-snug">{badge.description}</p>
        </div>
      </div>
    </div>
  );
}

export function BadgeGrid({ badges }: { badges: Badge[] }) {
  if (!badges || badges.length === 0) {
    return (
      <div className="text-center py-8 text-white/20">
        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No badges yet. Keep grinding!</p>
      </div>
    );
  }

  const weeklyBadges = badges.filter(b => b.category === 'weekly_leaderboard');
  const aiBadges = badges.filter(b => b.category !== 'weekly_leaderboard');

  return (
    <div className="space-y-4">
      {weeklyBadges.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-white/30 mb-2 flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5 text-amber-400" />
            Weekly Honors
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {weeklyBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      )}
      {aiBadges.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-white/30 mb-2 flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-purple-400" />
            AI-Forged Badges
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {aiBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}