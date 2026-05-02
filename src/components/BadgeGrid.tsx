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

export function BadgeCard({ badge }: { badge: Badge }) {
  const style = rarityStyles[badge.rarity.toLowerCase()] || rarityStyles.common;
  const isSvg = badge.icon?.startsWith('svg:');
  const svgSrc = isSvg ? `/badges/${badge.icon.slice(4)}.svg` : null;
  const Icon = !isSvg ? iconMap[badge.icon] || Zap : null;

  return (
    <div
      className={`relative p-4 rounded-xl border ${style.border} bg-gradient-to-br ${style.bg} backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-lg ${style.glow}`}
      style={{ boxShadow: `0 0 20px ${badge.color}15` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0 overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${badge.color}30, ${badge.color}10)`, border: `1px solid ${badge.color}40` }}
        >
          {isSvg && svgSrc ? (
            <img src={svgSrc} alt={badge.name} className="h-8 w-8 object-contain" />
          ) : (
            <Icon className="h-5 w-5" style={{ color: badge.color }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold text-white truncate">{badge.name}</span>
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {badges.map((badge) => (
        <BadgeCard key={badge.id} badge={badge} />
      ))}
    </div>
  );
}