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

const weeklySvgMap: Record<string, { src: string; shadow: string }> = {
  'svg:mvp': { src: '/badges/mvp.svg', shadow: '0 0 40px rgba(245,158,11,0.5), 0 0 80px rgba(245,158,11,0.2)' },
  'svg:2nd': { src: '/badges/2nd.svg', shadow: '0 0 35px rgba(168,85,247,0.4), 0 0 70px rgba(168,85,247,0.15)' },
  'svg:3rd': { src: '/badges/3rd.svg', shadow: '0 0 30px rgba(59,130,246,0.35), 0 0 60px rgba(59,130,246,0.1)' },
  'svg:last2': { src: '/badges/last2.svg', shadow: '0 0 15px rgba(107,114,128,0.2)' },
  'svg:last1': { src: '/badges/last1.svg', shadow: '0 0 15px rgba(107,114,128,0.2)' },
};

export function BadgeCard({ badge }: { badge: Badge }) {
  const style = rarityStyles[badge.rarity.toLowerCase()] || rarityStyles.common;
  const isSvg = badge.icon?.startsWith('svg:');
  const svgInfo = isSvg ? weeklySvgMap[badge.icon] : null;
  const Icon = !isSvg ? iconMap[badge.icon] || Zap : null;
  const isWeekly = badge.category === 'weekly_leaderboard';

  if (isWeekly && svgInfo) {
    return (
      <div
        className={`relative p-5 sm:p-6 rounded-xl border ${style.border} bg-gradient-to-br ${style.bg} backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-xl ${style.glow}`}
        style={{ boxShadow: svgInfo.shadow }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div
            className="relative flex-shrink-0 h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden ring-2 ring-white/10 animate-pulse"
            style={{ boxShadow: svgInfo.shadow }}
          >
            <img
              src={svgInfo.src}
              alt={badge.name}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-base sm:text-lg font-bold text-white">{badge.name}</span>
              <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border font-bold ${style.border} ${style.text}`}>
                {badge.rarity}
              </span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed">{badge.description}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative p-3 sm:p-4 rounded-xl border ${style.border} bg-gradient-to-br ${style.bg} backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-lg ${style.glow}`}
      style={{ boxShadow: `0 0 20px ${badge.color}15` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg shrink-0"
          style={{ background: `linear-gradient(135deg, ${badge.color}30, ${badge.color}10)`, border: `1px solid ${badge.color}40` }}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: badge.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="text-sm font-bold text-white">{badge.name}</span>
            <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${style.border} ${style.text}`}>
              {badge.rarity}
            </span>
          </div>
          <p className="text-xs text-white/40 leading-relaxed">{badge.description}</p>
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

  const rarityOrder: Record<string, number> = { legendary: 4, epic: 3, rare: 2, common: 1 };
  const sortByRarity = (a: Badge, b: Badge) => (rarityOrder[b.rarity.toLowerCase()] || 0) - (rarityOrder[a.rarity.toLowerCase()] || 0);

  const weeklyBadges = badges.filter(b => b.category === 'weekly_leaderboard').sort(sortByRarity);
  const aiBadges = badges.filter(b => b.category !== 'weekly_leaderboard').sort(sortByRarity);

  return (
    <div className="space-y-5">
      {weeklyBadges.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-white/30 mb-3 flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5 text-amber-400" />
            Weekly Honors
          </h3>
          <div className="space-y-3">
            {weeklyBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      )}
      {aiBadges.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-white/30 mb-3 flex items-center gap-1.5">
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