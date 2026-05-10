"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, Code2, Trophy, Zap, RefreshCw,
  Brain, X, Crown, Sparkles, Clock, Copy, Check,
  GitPullRequest, FolderGit2, Shield, Swords, BarChart3, Users,
  Star, ChevronRight, Activity, Terminal, LayoutGrid
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { BadgeGrid, BadgeCard } from "@/components/BadgeGrid";
import { StreakHeatmap } from "@/components/StreakHeatmap";
import { pageEntrance, staggerItem, statReveal, springBouncy } from "@/lib/motion";
import { XPBreakdownModal } from "@/components/XPBreakdownModal";

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
  xpValue: number;
  rarity: string;
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
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showBadgesModal, setShowBadgesModal] = useState(false);

  const [analysis, setAnalysis] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [errorAI, setErrorAI] = useState("");

  useEffect(() => {
    async function loadProjects() {
      if (!profile?.githubHandle) {
        setProjectsLoading(false);
        return;
      }
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
      window.location.reload();
    } catch {
      toast.error("Failed to save profile");
    }
  }

  async function triggerSync() {
    toast.info("Sync triggered in the background. Check back in a minute!");
    try {
      const res = await fetch("/api/sync-self", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      toast.success("Sync complete! Refresh to see changes.");
    } catch {
      toast.error("Sync failed. Try again later.");
    }
  }

  async function triggerDeepDive() {
    toast.info("Deep dive started. Analyzing your entire GitHub history...");
    try {
      const res = await fetch("/api/deepdive-self", { method: "POST" });
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

  const stats = [
    { key: "xp", label: "Total XP", value: profile?.xp || 0, color: "text-amber-400", hex: "#fbbf24", dot: "bg-amber-400 font-bold", glow: "shadow-[0_0_15px_rgba(251,191,36,0.6)]" },
    { key: "totalCommits", label: "Commits", value: profile?.totalCommits || 0, color: "text-cyan-400", hex: "#22d3ee", dot: "bg-cyan-400", glow: "shadow-[0_0_15px_rgba(34,211,238,0.4)]" },
    { key: "totalPRs", label: "PRs", value: profile?.totalPRs || 0, color: "text-green-400", hex: "#4ade80", dot: "bg-green-400", glow: "shadow-[0_0_15px_rgba(74,222,128,0.4)]" },
    { key: "totalReviews", label: "Reviews", value: profile?.totalReviews || 0, color: "text-violet-400", hex: "#a78bfa", dot: "bg-violet-400", glow: "shadow-[0_0_15px_rgba(167,139,250,0.4)]" },
    { key: "leetcodeHard", label: "LC Hard", value: profile?.leetcodeHard || 0, color: "text-pink-400", hex: "#f472b6", dot: "bg-pink-400", glow: "shadow-[0_0_15px_rgba(244,114,182,0.4)]" },
    { key: "codeforcesRating", label: "CF Rating", value: profile?.codeforcesRating || 0, color: "text-blue-400", hex: "#60a5fa", dot: "bg-blue-400", glow: "shadow-[0_0_15px_rgba(96,165,250,0.4)]" },
  ];
  const maxStat = stats.reduce((a, b) => (a.value > b.value ? a : b), stats[0]);

  const langColors: Record<string, string> = {
    TypeScript: "#3178c6", JavaScript: "#f7df1e", Python: "#3776ab",
    Rust: "#dea584", Go: "#00add8", Java: "#b07219", "C++": "#f34b7d",
    C: "#555555", Shell: "#89e051", Ruby: "#701516", PHP: "#4F5D95",
    Swift: "#ffac45", Kotlin: "#A97BFF", Dart: "#00B4AB", HTML: "#e34c26", CSS: "#563d7c",
  };

  return (
    <motion.main
      variants={pageEntrance}
      initial="hidden"
      animate="visible"
      className="relative min-h-screen bg-[#09090b] pb-24 lg:pb-12 font-sans selection:bg-violet-500/20 selection:text-white"
    >
      {/* Subtle top radial — lifts the flat black without color */}
      <div className="fixed inset-x-0 top-0 h-[600px] bg-[radial-gradient(ellipse_at_top,_#18181b_0%,_transparent_70%)] opacity-40 pointer-events-none z-0" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 lg:py-12">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-start">

          {/* ============================================================== */}
          {/* LEFT COLUMN: IDENTITY & CONTEXT */}
          {/* ============================================================== */}
          <aside className="w-full lg:w-[320px] shrink-0 flex flex-col gap-8 lg:sticky lg:top-12">

            {/* 1. Core Profile */}
            <div className="flex flex-col gap-5">
              <Link href="/" className="group inline-flex items-center gap-2 text-[13px] font-medium text-white/45 hover:text-white transition-colors self-start">
                <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform duration-200" />
                Back
              </Link>

              <div className="flex flex-row lg:flex-col items-center lg:items-start gap-5">
                {/* Avatar */}
                <div className="relative group shrink-0">
                  <div className="absolute -inset-2 rounded-3xl bg-violet-500/10 blur-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative rounded-2xl p-[1.5px] bg-gradient-to-br from-white/10 to-white/[0.04] transition-all duration-300 group-hover:from-violet-500/25 group-hover:to-cyan-500/15">
                    <Avatar className="h-24 w-24 sm:h-28 sm:w-28 lg:h-36 lg:w-36 rounded-[14px] bg-[#111113]">
                      <AvatarImage src={profile.imageUrl || undefined} className="object-cover" />
                      <AvatarFallback className="bg-[#111113] text-white/45 text-3xl font-light">
                        {(profile.name || profile.githubHandle || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-none">
                    {profile.name || profile.githubHandle || "Anonymous"}
                  </h1>

                  {profile.title ? (
                    <div className="flex items-center gap-2 mt-1 px-2.5 py-1 rounded-lg bg-[#18181b] border border-white/[0.06] w-max max-w-full">
                      <Sparkles className="h-3 w-3 text-violet-400 shrink-0" />
                      <span className="text-[12px] font-semibold text-violet-400 truncate">{profile.title}</span>
                    </div>
                  ) : profile.skillTreeState?.currentGrind ? (
                    <p className="text-sm text-white/45 font-medium mt-1 truncate">{profile.skillTreeState.currentGrind}</p>
                  ) : null}
                </div>
              </div>

              {/* Compare & Duel */}
              <div className="flex items-center gap-2.5 pt-5 border-t border-white/[0.06]">
                <div className="flex-1 relative">
                  {showCompare ? (
                    <div className="flex items-center gap-1.5 bg-[#111113] border border-white/[0.08] rounded-xl p-1">
                      <input value={compareInput} onChange={(e) => setCompareInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && goCompare()} placeholder="GitHub handle…" className="w-full bg-transparent text-sm text-white px-2 focus:outline-none placeholder:text-white/25" autoFocus />
                      <button onClick={goCompare} className="p-1.5 bg-violet-500/15 hover:bg-violet-500/25 rounded-lg text-violet-400 transition-colors"><Check className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setShowCompare(false)} className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 transition-colors"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => setShowCompare(true)} className="w-full h-[44px] bg-[#111113] hover:bg-[#18181b] border border-white/[0.06] hover:border-white/[0.12] rounded-xl text-[13px] font-medium text-white/70 hover:text-white transition-all duration-200 flex justify-center items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-white/45" /> Compare
                    </button>
                  )}
                </div>
                {!isOwnProfile && profile.githubHandle && (
                  <button onClick={challengeToDuel} className="flex-1 h-[44px] bg-violet-600 hover:bg-violet-500 rounded-xl text-[13px] font-semibold text-white transition-colors duration-200 flex justify-center items-center gap-2">
                    <Swords className="h-4 w-4" /> Challenge
                  </button>
                )}
              </div>
            </div>

            {/* 2. Platform Links */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Identities</h3>
                {isOwnProfile && (
                  <button onClick={() => (editing ? handleSave() : setEditing(true))} className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
                    {editing ? "Save" : "Edit"}
                  </button>
                )}
              </div>

              {editing ? (
                <div className="space-y-3">
                  <div key="name-edit">
                    <label className="text-xs text-white/40 mb-1 block">Display Name</label>
                    <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-[#111113] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white/20 transition-colors" />
                  </div>
                  {Object.entries(platformLabels).filter(([k]) => k !== 'githubHandle').map(([key, label]) => (
                    <div key={key}>
                      <label className="text-xs text-white/40 mb-1 block">{label}</label>
                      <input value={(formData as any)[key]} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} className="w-full bg-[#111113] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white/20 transition-colors" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5">
                  {profile.githubHandle && (
                    <a href={`https://github.com/${profile.githubHandle}`} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between p-3 rounded-xl bg-[#111113] hover:bg-[#18181b] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200">
                      <div className="flex items-center gap-2.5 text-sm">
                        <Code2 className="h-4 w-4 text-white/30 group-hover:text-white/60 transition-colors" />
                        <span className="text-white/45 font-medium group-hover:text-white/70 transition-colors text-[13px]">GitHub</span>
                      </div>
                      <span className="text-[13px] font-medium text-white/70">{profile.githubHandle}</span>
                    </a>
                  )}
                  {Object.entries(platformLabels).filter(([k]) => k !== 'githubHandle').map(([key, label]) => {
                    const val = (profile as any)?.[key];
                    if (!val) return null;
                    return (
                      <button key={key} onClick={() => copyToClipboard(val, key)} className="group flex items-center justify-between p-3 rounded-xl bg-[#111113] hover:bg-[#18181b] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 w-full text-left">
                        <div className="flex items-center gap-2.5 text-sm">
                          <span className="text-white/30 group-hover:text-white/60 transition-colors">{platformIcons[key]}</span>
                          <span className="text-white/45 text-[13px] font-medium group-hover:text-white/70 transition-colors">{label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-white/70">{val}</span>
                          {copied === key ? <Check className="h-3 w-3 text-cyan-400" /> : <Copy className="h-3 w-3 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Guild */}
            {profile?.guild && (
              <div className="flex flex-col gap-2">
                <h3 className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Guild</h3>
                <Link href={`/guilds/${profile.guild.slug}`} className="group block rounded-2xl border border-white/[0.06] bg-[#111113] hover:bg-[#18181b] hover:border-white/[0.12] transition-all duration-200 p-4">
                  <div className="flex items-center gap-3.5">
                    {profile.guild.iconUrl ? (
                      <img src={profile.guild.iconUrl} className="h-11 w-11 rounded-xl object-cover border border-white/[0.06] bg-black/30" alt={profile.guild.name} />
                    ) : (
                      <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex justify-center items-center text-amber-400 font-bold text-base">{profile.guild.name.charAt(0)}</div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white leading-none mb-1.5 truncate">{profile.guild.name}</h4>
                      <div className="flex items-center gap-2 text-[11px] font-medium text-white/30">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {profile.guild.members?.length || 0}</span>
                        <span className="flex items-center gap-1 text-amber-500/70"><Trophy className="h-3 w-3" /> {profile.guild.members?.reduce((total: number, member: { xp?: number }) => total + (member.xp || 0), 0)?.toLocaleString() || 0} XP</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Sync / Deep Dive */}
            {isOwnProfile && (
              <div className="flex flex-col gap-2.5">
                <button onClick={triggerSync} className="group w-full h-[44px] rounded-xl border border-white/[0.06] bg-[#111113] hover:bg-[#18181b] hover:border-white/[0.12] text-[13px] font-medium text-white/45 hover:text-white/70 transition-all duration-200 flex items-center justify-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 group-hover:rotate-180 transition-transform duration-500" /> Sync
                </button>
                <button onClick={triggerDeepDive} className="group w-full h-[44px] rounded-xl border border-violet-500/20 bg-violet-500/[0.06] hover:bg-violet-500/10 text-[13px] font-medium text-violet-400 hover:text-violet-300 transition-all duration-200 flex items-center justify-center gap-2">
                  <Brain className="h-3.5 w-3.5" /> Deep Dive
                </button>
              </div>
            )}
          </aside>


          {/* ============================================================== */}
          {/* RIGHT COLUMN: PERFORMANCE & METRICS */}
          {/* ============================================================== */}
          <section className="flex-1 flex flex-col gap-12 min-w-0 pb-16">

            {/* STATS */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2.5">
                <Activity className="h-4 w-4 text-violet-400" />
                <h2 className="text-sm font-semibold text-white tracking-wide">Metrics</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.map((stat) => {
                  const isMax = stat.key === maxStat.key;
                  return (
                    <div
                      key={stat.key}
                      onClick={stat.key === "xp" ? () => setShowBreakdown(true) : undefined}
                      className={`group relative overflow-hidden rounded-xl p-4 sm:p-5 bg-[#111113] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 ${stat.key === "xp" ? "cursor-pointer" : ""}`}
                    >
                      {/* Top accent bar */}
                      <div className={`absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-200 ${isMax ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} style={{ backgroundColor: stat.hex }} />

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${stat.dot} ${isMax ? "opacity-100" : "opacity-40"}`} />
                          <span className={`text-[10px] uppercase tracking-widest font-semibold ${isMax ? stat.color : "text-white/40"}`}>{stat.label}</span>
                        </div>
                        <span className={`text-3xl sm:text-4xl font-semibold tabular-nums tracking-tight ${isMax ? stat.color : "text-white/80 group-hover:text-white transition-colors"}`}>
                          {stat.value.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* HEATMAP */}
            {profile.githubHandle && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                  <h2 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Activity</h2>
                </div>
                <div className="w-full p-4 rounded-xl border border-white/[0.06] bg-[#111113] overflow-x-auto">
                  <StreakHeatmap handle={profile.githubHandle} />
                </div>
              </div>
            )}

            {/* PROJECTS */}
            {profile.githubHandle && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FolderGit2 className="w-4 h-4 text-violet-400" />
                    <h2 className="text-sm font-semibold text-white tracking-wide">Projects</h2>
                  </div>
                  <a href={`https://github.com/${profile.githubHandle}?tab=repositories`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-white/30 hover:text-white/70 transition-colors flex items-center gap-1">
                    All repos <ChevronRight className="h-3 w-3" />
                  </a>
                </div>

                {projectsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-40 rounded-xl bg-[#111113] animate-pulse border border-white/[0.06]" />)}
                  </div>
                ) : projects.length === 0 ? (
                  <p className="text-sm text-white/30 bg-[#111113] border border-white/[0.06] rounded-xl p-8 text-center">No projects yet. Run Sync to populate.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {projects.sort((a, b) => (b.xpValue || 0) - (a.xpValue || 0)).slice(0, 6).map(project => (
                      <a key={project.id} href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="group flex flex-col p-4 rounded-xl border border-white/[0.06] bg-[#111113] hover:bg-[#18181b] hover:border-white/[0.12] transition-all duration-200 min-h-[140px] relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-violet-500/40 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="text-sm font-semibold text-white truncate">{project.name}</h3>
                          <div className="flex items-center gap-2 text-[11px] text-white/25 font-mono shrink-0">
                            {project.stars > 0 && <span className="flex items-center gap-0.5"><Star className="h-3 w-3" />{project.stars}</span>}
                            {project.forks > 0 && <span className="flex items-center gap-0.5"><GitPullRequest className="h-3 w-3" />{project.forks}</span>}
                          </div>
                        </div>
                        <p className="text-[12px] text-white/45 leading-relaxed line-clamp-2 flex-1 mb-4">
                          {project.description || project.aiSummary || "No description."}
                        </p>
                        <div className="flex items-center gap-2 mt-auto">
                          {project.language && (
                            <div className="flex items-center gap-1.5 bg-[#18181b] px-2 py-0.5 rounded-lg border border-white/[0.06]">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: langColors[project.language] || '#888' }} />
                              <span className="text-[10px] font-medium text-white/40">{project.language}</span>
                            </div>
                          )}
                          {project.xpValue > 0 && (
                            <span className="text-[10px] font-medium text-amber-400/70 bg-amber-500/[0.06] border border-amber-500/15 px-2 py-0.5 rounded-lg ml-auto">+{project.xpValue} XP</span>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* BADGES */}
            {profile.badges && profile.badges.length > 0 && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-semibold text-white tracking-wide">Achievements</h2>
                  </div>
                  <button
                    onClick={() => setShowBadgesModal(true)}
                    className="text-[11px] font-medium text-white/40 hover:text-white/80 transition-colors flex items-center gap-1"
                  >
                    View All ({profile.badges.length}) <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                {/* Preview: first 3 badges */}
                <div className="space-y-2">
                  {profile.badges.slice(0, 3).map((badge: any) => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
                  {profile.badges.length > 3 && (
                    <button
                      onClick={() => setShowBadgesModal(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.06] bg-[#111113] hover:bg-[#18181b] hover:border-white/[0.12] text-[11px] font-semibold text-white/50 hover:text-white/80 transition-all duration-200"
                    >
                      <Trophy className="h-3.5 w-3.5" />
                      +{profile.badges.length - 3} more badges
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* AI ANALYSIS */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2.5">
                <Brain className="h-4 w-4 text-pink-400" />
                <h2 className="text-sm font-semibold text-white tracking-wide">Neural Analysis</h2>
              </div>

              {analysis ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#111113] border border-white/[0.06] rounded-2xl p-5 md:p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

                  <div className="space-y-8">
                    <div>
                      <h3 className="text-[10px] font-semibold text-pink-400/70 uppercase tracking-widest mb-3 flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-pink-400" /> Trajectory</h3>
                      <p className="text-[13px] text-white/70 leading-relaxed">{analysis.careerPath}</p>
                    </div>
                    <div>
                      <h3 className="text-[10px] font-semibold text-cyan-400/70 uppercase tracking-widest mb-3 flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-cyan-400" /> Target Companies</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.companies?.map((c: string, i: number) => (
                          <span key={i} className="text-[11px] font-medium border border-cyan-500/15 bg-cyan-500/[0.04] text-cyan-300/80 px-2.5 py-1 rounded-lg">{c}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-green-500/[0.04] border border-green-500/10 p-4 rounded-xl">
                      <h3 className="text-[10px] font-semibold text-green-400/80 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Check className="h-3 w-3" /> Strengths</h3>
                      <ul className="space-y-2.5">
                        {analysis.strengths?.map((s: string, i: number) => (
                          <li key={i} className="text-[12px] text-white/70 leading-relaxed">{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-amber-500/[0.04] border border-amber-500/10 p-4 rounded-xl">
                      <h3 className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Activity className="h-3 w-3" /> Growth Areas</h3>
                      <ul className="space-y-2.5">
                        {analysis.weaknesses?.map((w: string, i: number) => (
                          <li key={i} className="text-[12px] text-white/70 leading-relaxed">{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#111113] border border-white/[0.06] rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#18181b] border border-white/[0.06] flex items-center justify-center">
                    <Terminal className="h-5 w-5 text-white/25" />
                  </div>
                  <div className="max-w-xs space-y-1">
                    <p className="text-sm font-medium text-white/70">No analysis yet</p>
                    <p className="text-[12px] text-white/30">Run a Deep Dive to generate AI insights.</p>
                  </div>
                </div>
              )}
            </div>

          </section>
        </div>
      </div>

      <XPBreakdownModal
        isOpen={showBreakdown}
        onClose={() => setShowBreakdown(false)}
        userId={profile.id}
        userName={profile.name || profile.githubHandle || "Anonymous"}
      />

      {/* Badges Modal */}
      <AnimatePresence>
        {showBadgesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowBadgesModal(false)}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={springBouncy}
              className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-white/[0.08] bg-[#0d0d10] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center gap-2.5">
                  <Shield className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-white tracking-wide">
                    Achievements
                    <span className="ml-2 text-[11px] font-normal text-white/40">({profile.badges.length})</span>
                  </h2>
                </div>
                <button
                  onClick={() => setShowBadgesModal(false)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <BadgeGrid badges={profile.badges} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
