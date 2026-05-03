"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Code2, Trophy, Zap, RefreshCw,
  Brain, X, Crown, Sparkles, Clock, Copy, Check,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { BadgeGrid, BadgeCard } from "@/components/BadgeGrid";
import { pageEntrance, staggerItem, statReveal } from "@/lib/motion";

const platformIcons: Record<string, React.ReactNode> = {
  githubHandle: <Code2 className="h-4 w-4" />,
  leetcodeHandle: <Code2 className="h-4 w-4" />,
  codeforcesHandle: <Trophy className="h-4 w-4" />,
  hackerrankHandle: <Zap className="h-4 w-4" />,
};

const platformLabels: Record<string, string> = {
  githubHandle: "GitHub",
  leetcodeHandle: "LeetCode",
  codeforcesHandle: "Codeforces",
  hackerrankHandle: "HackerRank",
};

interface PastTitle {
  id: string;
  title: string;
  weekNumber: number;
  year: number;
  createdAt: string;
}

interface ProfileViewProps {
  profile: any;
  isOwnProfile: boolean;
  onEdit?: () => void;
  editing?: boolean;
  formData?: any;
  setFormData?: (data: any) => void;
  onSave?: () => void;
  onSync?: () => void;
  onDeepDive?: () => void;
}

export function ProfileView({
  profile,
  isOwnProfile,
  onEdit,
  editing,
  formData,
  setFormData,
  onSave,
  onSync,
  onDeepDive,
}: ProfileViewProps) {
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  if (!profile) return null;

  const pastTitles: PastTitle[] = profile.pastTitles || [];
  const rarityOrder: Record<string, number> = { legendary: 4, epic: 3, rare: 2, common: 1 };
  const sortByRarity = (a: any, b: any) => (rarityOrder[b.rarity?.toLowerCase()] || 0) - (rarityOrder[a.rarity?.toLowerCase()] || 0);
  const weeklyBadges = (profile.badges || []).filter((b: any) => b.category === "weekly_leaderboard").sort(sortByRarity);
  const aiBadges = (profile.badges || []).filter((b: any) => b.category !== "weekly_leaderboard").sort(sortByRarity);

  const stats = [
    { key: "xp", label: "Total XP", value: profile?.xp || 0, color: "accent" as const },
    { key: "totalCommits", label: "Commits", value: profile?.totalCommits || 0, color: "cyan" as const },
    { key: "totalPRs", label: "PRs", value: profile?.totalPRs || 0, color: "success" as const },
    { key: "leetcodeHard", label: "LC Hard", value: profile?.leetcodeHard || 0, color: "pink" as const },
    { key: "codeforcesRating", label: "CF Rating", value: profile?.codeforcesRating || 0, color: "amber" as const },
    { key: "hackerrankBadges", label: "HR Badges", value: profile?.hackerrankBadges || 0, color: "warning" as const },
  ];
  const maxStat = stats.reduce((a, b) => (a.value > b.value ? a : b), stats[0]);

  return (
    <motion.main
      variants={pageEntrance}
      initial="hidden"
      animate="visible"
      className="min-h-screen p-4 md:p-8"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <motion.div variants={staggerItem} className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center h-9 w-9 rounded-[var(--radius-compact)] border border-white/[0.08] text-fg-dim hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Avatar className="h-14 w-14 border-2 border-accent/40 flex-shrink-0">
            <AvatarImage src={profile.imageUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-accent to-cyan-500 text-white text-xl font-bold">
              {(profile.name || profile.email).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-display gradient-text">{profile.name || profile.email}</h1>
            {profile.title ? (
              <div className="flex items-center gap-2 mt-1">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-subheading text-amber-400 tracking-wide">{profile.title}</span>
              </div>
            ) : profile.skillTreeState?.currentGrind ? (
              <p className="text-sm text-accent mt-0.5">{profile.skillTreeState.currentGrind}</p>
            ) : null}
          </div>
          {profile.githubHandle && (
            <a href={`https://github.com/${profile.githubHandle}`} target="_blank" rel="noopener noreferrer">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-[var(--radius-compact)] border border-white/[0.08] text-fg-dim hover:text-white hover:bg-white/[0.04] transition-colors">
                <Code2 className="h-4 w-4" />
                <span className="hidden sm:inline">{profile.githubHandle}</span>
              </span>
            </a>
          )}
        </motion.div>

        {/* Past Titles */}
        {pastTitles.length > 0 && (
          <motion.div variants={staggerItem} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-fg-muted" />
              <h2 className="text-label text-fg-dim">Title History</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {pastTitles.map((pt: PastTitle) => (
                <div
                  key={pt.id}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-fg-dim hover:text-white/70 hover:border-white/20 transition-all cursor-default whitespace-nowrap"
                  title={`Week ${pt.weekNumber}, ${pt.year}`}
                >
                  {pt.title}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Badges */}
        {profile.badges && profile.badges.length > 0 && (
          <motion.div variants={staggerItem} className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <h2 className="text-heading text-white">Badges</h2>
                <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-accent/20 text-accent bg-accent/10 ml-2">
                  {profile.badges.length}
                </span>
              </div>
              <button
                onClick={() => setSelectedBadge(profile.badges[0])}
                className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors px-3 py-1.5 rounded-[var(--radius-compact)] border border-accent/20 hover:bg-accent/5"
              >
                View All
              </button>
            </div>
            {weeklyBadges.length > 0 && (
              <div className="space-y-3 mb-4">
                {weeklyBadges.map((badge: any) => (
                  <div key={badge.id} className="cursor-pointer" onClick={() => setSelectedBadge(badge)}>
                    <BadgeCard badge={badge} />
                  </div>
                ))}
              </div>
            )}
            {aiBadges.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {aiBadges.slice(0, 4).map((badge: any) => (
                  <div key={badge.id} className="cursor-pointer" onClick={() => setSelectedBadge(badge)}>
                    <BadgeCard badge={badge} />
                  </div>
                ))}
              </div>
            )}
            {(weeklyBadges.length + aiBadges.length > 4) && (
              <button
                onClick={() => setSelectedBadge(profile.badges[0])}
                className="w-full py-2 text-center text-xs text-fg-muted hover:text-fg-dim transition-colors mt-2"
              >
                +{weeklyBadges.length + aiBadges.length - 4} more badges — tap to see all
              </button>
            )}
          </motion.div>
        )}

        {/* Stats */}
        <motion.div variants={staggerItem} className="glass-card p-6">
          <h2 className="text-heading text-white mb-4">Stats</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((stat) => (
              <motion.div
                key={stat.key}
                variants={statReveal}
                className={`p-4 rounded-[var(--radius-standard)] border text-center transition-all hover:shadow-glow ${
                  stat.key === maxStat.key
                    ? "bg-gradient-to-b from-accent/20 to-accent/5 border-accent/30 shadow-glow"
                    : "bg-gradient-to-b from-white/[0.04] to-transparent border-white/[0.06]"
                }`}
              >
                <div className="text-stat text-white">{stat.value.toLocaleString()}</div>
                <div className="text-label text-fg-muted mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Platform Handles */}
        {isOwnProfile && (
          <motion.div variants={staggerItem} className="glass-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-heading text-white">Platform Handles</h2>
              <button
                onClick={() => (editing ? onSave?.() : onEdit?.())}
                className="text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-compact)] border border-white/[0.08] text-fg-dim hover:text-white hover:bg-white/[0.04] transition-colors"
              >
                {editing ? "Save" : "Edit"}
              </button>
            </div>

            {editing && formData && setFormData ? (
              <div className="space-y-4">
                <div>
                  <label className="text-label text-fg-muted mb-1 block">Display Name</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-[var(--radius-compact)] bg-surface border border-white/[0.08] text-white text-sm focus:outline-none focus:border-accent/50 transition-colors"
                    placeholder="Your name"
                  />
                </div>
                {Object.entries(platformLabels).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-label text-fg-muted mb-1 block">{label}</label>
                    <input
                      value={(formData as any)[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      className="w-full h-10 px-3 rounded-[var(--radius-compact)] bg-surface border border-white/[0.08] text-white text-sm focus:outline-none focus:border-accent/50 transition-colors"
                      placeholder={`Your ${label} username`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(platformLabels).map(([key, label]) => {
                  const value = (profile as any)?.[key];
                  return (
                    <button
                      key={key}
                      onClick={() => value && copyToClipboard(value, key)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-compact)] bg-white/[0.03] border border-white/[0.06] text-sm hover:border-white/[0.12] transition-colors"
                    >
                      <span className="text-accent">{platformIcons[key]}</span>
                      <span className="text-fg-dim">{label}</span>
                      <span className="text-white font-medium">{value || <span className="text-fg-muted italic">Not linked</span>}</span>
                      {value && (
                        copied === key ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-fg-muted" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Action Buttons */}
        {isOwnProfile && (
          <motion.div variants={staggerItem} className="glass-card p-6">
            <div className="space-y-2">
              <button
                onClick={onSync}
                className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-[var(--radius-compact)] bg-accent text-white font-semibold text-sm shadow-glow hover:shadow-[0_0_24px_hsl(265_85%_60%/_0.4)] transition-shadow"
              >
                <RefreshCw className="h-4 w-4" />
                Sync Now
              </button>
              <button
                onClick={onDeepDive}
                className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-[var(--radius-compact)] border border-white/[0.08] text-fg-dim hover:text-white hover:bg-white/[0.04] transition-colors text-sm font-medium"
              >
                <Brain className="h-4 w-4" />
                Deep Dive (AI Research)
              </button>
            </div>
          </motion.div>
        )}

        {/* Unlocked Skill Nodes */}
        {profile?.dynamicNodes && profile.dynamicNodes.length > 0 && (
          <motion.div variants={staggerItem} className="glass-card p-6">
            <h2 className="text-heading text-white mb-4">Unlocked Skills</h2>
            <div className="flex flex-wrap gap-2">
              {profile.dynamicNodes.map((node: any) => (
                <span
                  key={node.id}
                  className="text-xs border border-accent/20 text-accent bg-accent/10 px-3 py-1 rounded-full"
                >
                  {node.name}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Badge Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedBadge(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-[var(--radius-container)] border border-white/[0.08] bg-overlay backdrop-blur-xl p-5 sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedBadge(null)}
              className="absolute top-4 right-4 text-fg-muted hover:text-white transition-colors z-10"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-5 sticky top-0 bg-overlay/95 backdrop-blur-xl pb-3 -mt-1 pt-1 z-[1]">
              <Crown className="h-5 w-5 text-amber-400" />
              <h2 className="text-subheading text-white">All Badges</h2>
              <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-accent/20 text-accent bg-accent/10">
                {profile.badges.length}
              </span>
            </div>

            <BadgeGrid badges={profile.badges} />
          </motion.div>
        </div>
      )}
    </motion.main>
  );
}
