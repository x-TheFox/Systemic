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

const rarityStyles: Record<string, { border: string; glow: string; text: string; bg: string; label: string }> = {
  common:    { border: "border-white/[0.06]",    glow: "",                                                                  text: "text-white/40",  bg: "bg-[#111113]",                                                        label: "bg-[#18181b] text-white/30 border-white/[0.06]" },
  rare:      { border: "border-cyan-500/20",     glow: "hover:border-cyan-500/30",                                           text: "text-cyan-400",  bg: "bg-[#111113]",                                                        label: "bg-cyan-500/[0.08] text-cyan-500/80 border-cyan-500/20" },
  epic:      { border: "border-violet-500/25",   glow: "hover:border-violet-500/40",                                         text: "text-violet-400",bg: "bg-[#111113]",                                                        label: "bg-violet-500/[0.08] text-violet-400/80 border-violet-500/20" },
  legendary: { border: "border-amber-500/30",    glow: "hover:border-amber-500/50 hover:shadow-[0_0_20px_-5px_rgba(245,158,11,0.15)]", text: "text-amber-400",  bg: "bg-[#111113]",                              label: "bg-amber-500/[0.08] text-amber-400/80 border-amber-500/20" },
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
        className={`relative p-4 sm:p-5 rounded-2xl border ${style.border} ${style.glow} ${style.bg} transition-all duration-200 overflow-hidden`}
      >
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div
            className="relative flex-shrink-0 h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-[#18181b] border border-white/[0.06]"
            style={{ boxShadow: svgInfo.shadow }}
          >
            <img src={svgInfo.src} alt={badge.name} className="h-full w-full object-contain scale-90" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-bold text-white">{badge.name}</span>
              <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md border font-semibold ${style.label}`}>
                {badge.rarity}
              </span>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">{badge.description}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={badgeItem}
      className={`relative p-4 rounded-2xl border ${style.border} ${style.glow} ${style.bg} transition-all duration-200 overflow-hidden`}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
          style={{ background: `${badge.color}10`, border: `1px solid ${badge.color}25` }}
        >
          <Icon className="h-4 w-4" style={{ color: badge.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-white/90">{badge.name}</span>
            <span className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-md border font-semibold ${style.label}`}>
              {badge.rarity}
            </span>
          </div>
          <p className="text-xs text-white/35 leading-relaxed">{badge.description}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function BadgeGrid({ badges }: { badges: Badge[] }) {
  if (!badges || badges.length === 0) {
    return (
      <div className="text-center py-8 text-white/30 font-medium">
        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50 text-white/20" />
        <p className="text-sm">No badges obtained yet. Grinding required.</p>
      </div>
    );
  }

  const rarityOrder: Record<string, number> = { legendary: 4, epic: 3, rare: 2, common: 1 };
  const sortByRarity = (a: Badge, b: Badge) => (rarityOrder[b.rarity?.toLowerCase()] || 0) - (rarityOrder[a.rarity?.toLowerCase()] || 0);

  const weeklyBadges = badges.filter((b) => b.category === "weekly_leaderboard").sort(sortByRarity);
  const aiBadges = badges.filter((b) => b.category !== "weekly_leaderboard").sort(sortByRarity);

  return (
    <div className="space-y-6">
      {weeklyBadges.length > 0 && (
        <div>
          <h3 className="text-[10px] text-white/35 tracking-widest uppercase font-semibold mb-3 flex items-center gap-2">
            <Crown className="h-3.5 w-3.5 text-amber-500/70" />
            Weekly Honors
          </h3>
          <motion.div
            variants={badgeContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-2"
          >
            {weeklyBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </motion.div>
        </div>
      )}
      {aiBadges.length > 0 && (
        <div>
          <h3 className="text-[10px] text-white/35 tracking-widest uppercase font-semibold mb-3 flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5 text-violet-500/70" />
            AI-Forged Badges
          </h3>
          <motion.div
            variants={badgeContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
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
