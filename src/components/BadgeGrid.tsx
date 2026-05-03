"use client";

import { motion } from "framer-motion";
import { Zap, Shield, Cpu, Flame, Target, Code, Database, Globe, Trophy, Star, Crown, Sword } from "lucide-react";
import { badgeContainer, badgeItem } from "@/lib/motion";

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

const rarityStyles: Record<string, { border: string; glow: string; text: string; bg: string; shimmer?: string }> = {
  common: { border: "border-white/[0.08]", glow: "shadow-gray-500/10", text: "text-fg-muted", bg: "from-white/[0.03] to-transparent" },
  rare: { border: "border-blue-500/30", glow: "shadow-blue-500/10", text: "text-blue-400", bg: "from-blue-500/10 to-transparent" },
  epic: { border: "border-accent/30", glow: "shadow-accent/10", text: "text-accent", bg: "from-accent/10 to-transparent", shimmer: "bg-gradient-to-r from-transparent via-accent/10 to-transparent" },
  legendary: { border: "border-amber-500/30", glow: "shadow-amber-500/10", text: "text-amber-400", bg: "from-amber-500/10 to-transparent", shimmer: "bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" },
};

const weeklySvgMap: Record<string, { src: string; shadow: string }> = {
  "svg:mvp": { src: "/badges/mvp.svg", shadow: "0 0 40px rgba(245,158,11,0.5), 0 0 80px rgba(245,158,11,0.2)" },
  "svg:2nd": { src: "/badges/2nd.svg", shadow: "0 0 35px rgba(168,85,247,0.4), 0 0 70px rgba(168,85,247,0.15)" },
  "svg:3rd": { src: "/badges/3rd.svg", shadow: "0 0 30px rgba(59,130,246,0.35), 0 0 60px rgba(59,130,246,0.1)" },
  "svg:last2": { src: "/badges/last2.svg", shadow: "0 0 15px rgba(107,114,128,0.2)" },
  "svg:last1": { src: "/badges/last1.svg", shadow: "0 0 15px rgba(107,114,128,0.2)" },
};

export function BadgeCard({ badge }: { badge: Badge }) {
  const style = rarityStyles[badge.rarity.toLowerCase()] || rarityStyles.common;
  const isSvg = badge.icon?.startsWith("svg:");
  const svgInfo = isSvg ? weeklySvgMap[badge.icon] : null;
  const Icon = !isSvg ? iconMap[badge.icon] || Zap : null;
  const isWeekly = badge.category === "weekly_leaderboard";

  if (isWeekly && svgInfo) {
    return (
      <motion.div
        variants={badgeItem}
        className={`relative p-5 sm:p-6 rounded-[var(--radius-container)] border ${style.border} bg-gradient-to-br ${style.bg} backdrop-blur-sm transition-all hover:scale-[1.02] overflow-hidden`}
        style={{ boxShadow: svgInfo.shadow }}
      >
        {style.shimmer && (
          <div className="absolute inset-0 animate-shimmer" style={{ backgroundSize: "200% 100%", backgroundImage: style.shimmer }} />
        )}
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div
            className="relative flex-shrink-0 h-20 w-20 sm:h-24 sm:w-24 rounded-[var(--radius-standard)] overflow-hidden ring-2 ring-white/10"
            style={{ boxShadow: svgInfo.shadow }}
          >
            <img src={svgInfo.src} alt={badge.name} className="h-full w-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-base sm:text-lg font-bold text-white">{badge.name}</span>
              <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border font-bold ${style.border} ${style.text}`}>
                {badge.rarity}
              </span>
            </div>
            <p className="text-sm text-fg-dim leading-relaxed">{badge.description}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={badgeItem}
      className={`relative p-3 sm:p-4 rounded-[var(--radius-standard)] border ${style.border} bg-gradient-to-br ${style.bg} backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-lg ${style.glow}`}
      style={{ boxShadow: `0 0 20px ${badge.color}15` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-[var(--radius-compact)] shrink-0"
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
          <p className="text-xs text-fg-muted leading-relaxed">{badge.description}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function BadgeGrid({ badges }: { badges: Badge[] }) {
  if (!badges || badges.length === 0) {
    return (
      <div className="text-center py-8 text-fg-muted">
        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No badges yet. Keep grinding!</p>
      </div>
    );
  }

  const rarityOrder: Record<string, number> = { legendary: 4, epic: 3, rare: 2, common: 1 };
  const sortByRarity = (a: Badge, b: Badge) => (rarityOrder[b.rarity?.toLowerCase()] || 0) - (rarityOrder[a.rarity?.toLowerCase()] || 0);

  const weeklyBadges = badges.filter((b) => b.category === "weekly_leaderboard").sort(sortByRarity);
  const aiBadges = badges.filter((b) => b.category !== "weekly_leaderboard").sort(sortByRarity);

  return (
    <div className="space-y-5">
      {weeklyBadges.length > 0 && (
        <div>
          <h3 className="text-label text-fg-dim mb-3 flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5 text-amber-400" />
            Weekly Honors
          </h3>
          <motion.div
            variants={badgeContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-3"
          >
            {weeklyBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </motion.div>
        </div>
      )}
      {aiBadges.length > 0 && (
        <div>
          <h3 className="text-label text-fg-dim mb-3 flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-accent" />
            AI-Forged Badges
          </h3>
          <motion.div
            variants={badgeContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {aiBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}
