"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, Code2, Trophy, Zap, RefreshCw,
  Brain, X, Crown, Sparkles, Clock, Copy, Check,
  GitPullRequest, FolderGit2, Shield, Swords, BarChart3,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { BadgeGrid, BadgeCard } from "@/components/BadgeGrid";
import { StreakHeatmap } from "@/components/StreakHeatmap";
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

interface Project {
  id: string;
  name: string;
  description: string | null;
  repoUrl: string;
  language: string | null;
  stars: number;
  forks: number;
  pinned: boolean;
  aiSummary: string | null;
}

interface ProfileViewProps {
  profile: any;
  isOwnProfile: boolean;
}

export function ProfileView({ profile, isOwnProfile }: ProfileViewProps) {
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    leetcodeHandle: profile?.leetcodeHandle || "",
    codeforcesHandle: profile?.codeforcesHandle || "",
    hackerrankHandle: profile?.hackerrankHandle || "",
    name: profile?.name || "",
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [compareInput, setCompareInput] = useState("");
  const [showCompare, setShowCompare] = useState(false);

  // Fetch projects
  useEffect(() => {
    if (!profile?.githubHandle) {
      setProjectsLoading(false);
      return;
    }
    async function loadProjects() {
      try {
        const res = await fetch(`/api/projects?handle=${profile.githubHandle}`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setProjects(data.projects || []);
      } catch {
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    }
    loadProjects();
  }, [profile?.githubHandle]);

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  async function handleSave() {
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Profile updated!");
      setEditing(false);
      // Refresh page to show updated data
      window.location.reload();
    } catch {
      toast.error("Failed to save profile");
    }
  }

  async function triggerSync() {
    toast.info("Sync triggered in the background. Check back in a minute!");
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}` },
      });
      if (!res.ok) throw new Error("Sync failed");
      toast.success("Sync complete! Refresh to see changes.");
    } catch {
      toast.error("Sync failed. Try again later.");
    }
  }

  async function triggerDeepDive() {
    toast.info("Deep dive started. Analyzing your entire GitHub history...");
    try {
      const res = await fetch("/api/deepdive", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: profile?.id }),
      });
      if (!res.ok) throw new Error("Deep dive failed");
      const data = await res.json();
      toast.success(`Deep dive complete! Archetype: ${data.archetype}`);
    } catch {
      toast.error("Deep dive failed. Try again later.");
    }
  }

  function goCompare() {
    if (!compareInput.trim()) return;
    window.location.href = `/compare/${encodeURIComponent(compareInput.trim())}/${encodeURIComponent(profile.githubHandle || profile.name || "")}`;
  }

  async function challengeToDuel() {
    if (!profile.githubHandle) {
      toast.error("This user has no GitHub handle to challenge.");
      return;
    }
    try {
      const res = await fetch("/api/duels/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentHandle: profile.githubHandle }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Duel challenge sent!");
    } catch {
      toast.error("Failed to send duel challenge.");
    }
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
    { key: "totalReviews", label: "Reviews", value: profile?.totalReviews || 0, color: "purple" as const },
    { key: "leetcodeHard", label: "LC Hard", value: profile?.leetcodeHard || 0, color: "pink" as const },
    { key: "codeforcesRating", label: "CF Rating", value: profile?.codeforcesRating || 0, color: "amber" as const },
    { key: "hackerrankBadges", label: "HR Badges", value: profile?.hackerrankBadges || 0, color: "warning" as const },
  ];
  const maxStat = stats.reduce((a, b) => (a.value > b.value ? a : b), stats[0]);

  // Language color map
  const langColors: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f7df1e",
    Python: "#3776ab",
    Rust: "#dea584",
    Go: "#00add8",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#555555",
    Shell: "#89e051",
    Ruby: "#701516",
    PHP: "#4F5D95",
    Swift: "#ffac45",
    Kotlin: "#A97BFF",
    Dart: "#00B4AB",
    HTML: "#e34c26",
    CSS: "#563d7c",
  };

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
              {(profile.name || profile.githubHandle || "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-display gradient-text">{profile.name || profile.githubHandle || "Anonymous"}</h1>
            {profile.title ? (
              <div className="flex items-center gap-2 mt-1">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-subheading text-amber-400 tracking-wide">{profile.title}</span>
              </div>
            ) : profile.skillTreeState?.currentGrind ? (
              <p className="text-sm text-accent mt-0.5">{profile.skillTreeState.currentGrind}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {profile.githubHandle && (
              <a href={`https://github.com/${profile.githubHandle}`} target="_blank" rel="noopener noreferrer">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-[var(--radius-compact)] border border-white/[0.08] text-fg-dim hover:text-white hover:bg-white/[0.04] transition-colors">
                  <Code2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{profile.githubHandle}</span>
                </span>
              </a>
            )}
            {/* Compare button */}
            <div className="relative">
              {showCompare ? (
                <div className="flex items-center gap-1">
                  <input
                    value={compareInput}
                    onChange={(e) => setCompareInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && goCompare()}
                    placeholder="GitHub handle..."
                    className="h-8 w-32 px-2 rounded-[var(--radius-compact)] bg-surface border border-white/[0.08] text-white text-xs focus:outline-none focus:border-accent/50"
                    autoFocus
                  />
                  <button onClick={goCompare} className="h-8 px-2 rounded-[var(--radius-compact)] bg-accent text-white text-xs font-semibold">
                    VS
                  </button>
                  <button onClick={() => setShowCompare(false)} className="h-8 px-2 text-fg-muted hover:text-white text-xs">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCompare(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-[var(--radius-compact)] border border-white/[0.08] text-fg-dim hover:text-white hover:bg-white/[0.04] transition-colors"
                  title="Compare with another developer"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Compare</span>
                </button>
              )}
            </div>
            {/* Duel button for other profiles */}
            {!isOwnProfile && profile.githubHandle && (
              <button
                onClick={challengeToDuel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-[var(--radius-compact)] bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 transition-colors"
              >
                <Swords className="h-4 w-4" />
                <span className="hidden sm:inline">Duel</span>
              </button>
            )}
          </div>
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

        {/* Streak Heatmap */}
        {profile.githubHandle && (
          <motion.div variants={staggerItem} className="glass-card p-6">
            <StreakHeatmap handle={profile.githubHandle} />
          </motion.div>
        )}

        {/* Projects */}
        {profile.githubHandle && (
          <motion.div variants={staggerItem} className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <FolderGit2 className="h-5 w-5 text-accent" />
              <h2 className="text-heading text-white">Projects</h2>
            </div>
            {projectsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-white/[0.02] rounded-[var(--radius-standard)] animate-pulse" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <p className="text-sm text-fg-muted">No projects indexed yet. Run a sync to auto-import from GitHub.</p>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 6).map((project) => (
                  <a
                    key={project.id}
                    href={project.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 rounded-[var(--radius-standard)] bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.10] hover:bg-white/[0.03] transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{project.name}</span>
                        {project.language && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: `${langColors[project.language] || '#6b7280'}20`,
                              color: langColors[project.language] || '#9ca3af',
                            }}
                          >
                            {project.language}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-fg-muted">
                        {project.stars > 0 && <span>⭐ {project.stars}</span>}
                        {project.forks > 0 && <span>🍴 {project.forks}</span>}
                      </div>
                    </div>
                    {project.aiSummary && (
                      <p className="text-xs text-fg-muted line-clamp-2">{project.aiSummary}</p>
                    )}
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Platform Handles */}
        {isOwnProfile && (
          <motion.div variants={staggerItem} className="glass-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-heading text-white">Platform Handles</h2>
              <button
                onClick={() => (editing ? handleSave() : setEditing(true))}
                className="text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-compact)] border border-white/[0.08] text-fg-dim hover:text-white hover:bg-white/[0.04] transition-colors"
              >
                {editing ? "Save" : "Edit"}
              </button>
            </div>

            {editing ? (
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
                {Object.entries(platformLabels)
                  .filter(([key]) => key !== "githubHandle")
                  .map(([key, label]) => (
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
                <div>
                  <label className="text-label text-fg-muted mb-1 block">GitHub</label>
                  <div className="w-full h-10 px-3 rounded-[var(--radius-compact)] bg-white/[0.02] border border-white/[0.06] text-fg-dim text-sm flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-accent" />
                    <span>{profile.githubHandle || <span className="italic">Linked via Clerk</span>}</span>
                  </div>
                  <p className="text-[11px] text-fg-muted mt-1">GitHub handle is managed by your Clerk account and cannot be changed here.</p>
                </div>
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
                onClick={triggerSync}
                className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-[var(--radius-compact)] bg-accent text-white font-semibold text-sm shadow-glow hover:shadow-[0_0_24px_hsl(265_85%_60%/_0.4)] transition-shadow"
              >
                <RefreshCw className="h-4 w-4" />
                Sync Now
              </button>
              <button
                onClick={triggerDeepDive}
                className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-[var(--radius-compact)] border border-white/[0.08] text-fg-dim hover:text-white hover:bg-white/[0.04] transition-colors text-sm font-medium"
              >
                <Brain className="h-4 w-4" />
                Deep Dive (AI Research)
              </button>
            </div>
          </motion.div>
        )}

      {/* Guild */}
      {profile?.guild && (
        <motion.div variants={staggerItem}>
          <Link href={`/guilds/${profile.guild.slug}`}>
            <div className="glass-card p-5 flex items-center gap-4 hover:border-accent/20 transition-colors cursor-pointer group">
              {/* Guild Icon / SVG */}
              <div className="relative flex-shrink-0">
                {profile.guild.iconUrl ? (
                  <div
                    className="h-14 w-14 rounded-[var(--radius-standard)] overflow-hidden border border-white/[0.08] bg-white/[0.03] flex items-center justify-center"
                    dangerouslySetInnerHTML={{
                      __html: profile.guild.iconUrl.startsWith('<svg')
                        ? profile.guild.iconUrl
                        : `<img src="${profile.guild.iconUrl}" alt="${profile.guild.name}" style="width:100%;height:100%;object-fit:cover;" />`,
                    }}
                  />
                ) : (
                  <div className="h-14 w-14 rounded-[var(--radius-standard)] bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <Shield className="h-7 w-7 text-accent" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-heading text-white group-hover:text-accent transition-colors">{profile.guild.name}</h2>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-accent/20 text-accent bg-accent/10">
                    Guild
                  </span>
                </div>
                {profile.guild.description && (
                  <p className="text-sm text-fg-muted mt-0.5 truncate">{profile.guild.description}</p>
                )}
                {profile.guild.badges && profile.guild.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {profile.guild.badges.slice(0, 3).map((badge: any) => (
                      <span
                        key={badge.id}
                        className="text-[10px] border border-accent/20 text-accent bg-accent/10 px-2 py-0.5 rounded-full"
                      >
                        {badge.name}
                      </span>
                    ))}
                    {profile.guild.badges.length > 3 && (
                      <span className="text-[10px] text-fg-muted px-1">+{profile.guild.badges.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
              <BarChart3 className="h-5 w-5 text-fg-muted group-hover:text-accent transition-colors" />
            </div>
          </Link>
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
