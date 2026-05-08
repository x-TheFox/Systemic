"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
import { pageEntrance, staggerItem, statReveal } from "@/lib/motion";
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
      {/* Background radial gradients for subtle ambient depth (not glowing, just lifting the black) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#18181b]/60 via-[#09090b]/0 to-transparent pointer-events-none z-0" />
      
      {/* Subtle single ambient glow — just enough to break flat black */}
      <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] bg-violet-600/[0.04] rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] left-[-5%] w-[500px] h-[500px] bg-cyan-600/[0.03] rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12 py-6 lg:py-12">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">

          {/* ============================================================== */}
          {/* LEFT COLUMN: IDENTITY & CONTEXT */}
          {/* ============================================================== */}
          <aside className="w-full lg:w-[340px] shrink-0 flex flex-col gap-10 lg:sticky lg:top-12">

            {/* 1. Core Profile Details */}
            <div className="flex flex-col gap-6">
              <Link href="/" className="group inline-flex items-center gap-2 text-[13px] font-semibold text-white/30 hover:text-white transition-colors self-start mb-2">
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1.5 transition-transform duration-300" />
                Return to Surface
              </Link>

              <div className="flex flex-row lg:flex-col items-center lg:items-start gap-6 relative">
                {/* Intense Aurora & Avatar */}
                <div className="relative group shrink-0">
                  {/* Soft violet halo on hover only */}
                  <div className="absolute -inset-3 rounded-[3rem] bg-violet-500/15 blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                  {/* Clean single-pixel gradient ring */}
                  <div className="relative rounded-[2rem] p-[2px] bg-gradient-to-br from-white/[0.12] via-white/[0.04] to-white/[0.08] overflow-hidden shadow-2xl transition-all duration-500 group-hover:from-violet-500/30 group-hover:to-cyan-500/20">
                    <Avatar className="h-24 w-24 sm:h-32 sm:w-32 lg:h-40 lg:w-40 rounded-[1.85rem] bg-[#09090b] relative z-10 shadow-inner">
                      <AvatarImage src={profile.imageUrl || undefined} className="object-cover" />
                      <AvatarFallback className="bg-[#111113] text-white/50 text-4xl font-light">
                        {(profile.name || profile.githubHandle || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-0">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-none pb-1 drop-shadow-sm">
                    {profile.name || profile.githubHandle || "Anonymous"}
                  </h1>

                  {profile.title ? (
                    <div className="flex items-center gap-2 mt-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 shadow-[inset_0_0_10px_rgba(139,92,246,0.1)] w-max max-w-full">
                      <Sparkles className="h-3.5 w-3.5 text-violet-400 shrink-0 drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                      <span className="text-[13px] font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-300 to-cyan-300 tracking-wide truncate">{profile.title}</span>
                    </div>
                  ) : profile.skillTreeState?.currentGrind ? (
                    <p className="text-sm text-cyan-400/80 font-medium mt-1 truncate">{profile.skillTreeState.currentGrind}</p>
                  ) : null}
                </div>
              </div>

              {/* Action Ribbon: Compare & Duel */}
              <div className="flex items-center gap-3 pt-6 border-t border-white/[0.04] mt-2">
                <div className="flex-1 relative">
                  {showCompare ? (
                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-1 shadow-inner backdrop-blur-md ring-1 ring-white/5">
                      <input
                        value={compareInput}
                        onChange={(e) => setCompareInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && goCompare()}
                        placeholder="Compare"
                        className="w-full bg-transparent text-sm text-white px-2 focus:outline-none placeholder:text-white/20"
                        autoFocus
                      />
                      <button onClick={goCompare} className="p-1.5 bg-violet-500/20 hover:bg-violet-500/40 rounded-[10px] text-violet-300 transition-colors">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setShowCompare(false)} className="p-1.5 hover:bg-white/10 rounded-[10px] text-white/40 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setShowCompare(true)} className="w-full h-[44px] bg-[#18181b] hover:bg-[#1f1f23] border border-white/[0.08] hover:border-white/15 rounded-xl text-[13px] font-semibold text-white/80 hover:text-white transition-all flex justify-center items-center gap-2 shadow-sm">
                      <BarChart3 className="h-4 w-4" /> Compare
                    </button>
                  )}
                </div>
                {!isOwnProfile && profile.githubHandle && (
                  <button onClick={challengeToDuel} className="flex-1 h-[44px] bg-violet-600 hover:bg-violet-500 rounded-xl text-[13px] font-semibold text-white shadow-md transition-all flex justify-center items-center gap-2 group overflow-hidden relative">
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Swords className="h-4 w-4 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] relative z-10" /> <span className="relative z-10">Challenge</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. Platform Links & Edit */}
            <div className="flex flex-col gap-2 relative">
              <div className="absolute -left-4 top-1 w-1 h-6 bg-white/10 rounded-full" />
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">Identities</h3>
                {isOwnProfile && (
                  <button onClick={() => (editing ? handleSave() : setEditing(true))} className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-500/10 px-2 py-1 rounded-md">
                    {editing ? "Save" : "Edit"}
                  </button>
                )}
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div key="name-edit">
                    <label className="text-xs text-white/40 mb-1.5 block">Display Name</label>
                    <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 shadow-inner" />
                  </div>
                  {Object.entries(platformLabels).filter(([k]) => k !== 'githubHandle').map(([key, label]) => (
                    <div key={key}>
                      <label className="text-xs text-white/40 mb-1.5 block">{label}</label>
                      <input value={(formData as any)[key]} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 shadow-inner" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {profile.githubHandle && (
                    <a href={`https://github.com/${profile.githubHandle}`} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-b from-[#18181b] to-[#111113] hover:from-[#1f1f23] hover:to-[#18181b] border border-white/[0.08] hover:border-white/15 transition-all duration-300 shadow-sm">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="h-8 w-8 rounded-lg bg-[#09090b] border border-white/[0.08] flex items-center justify-center shadow-inner">
                          <Code2 className="h-4 w-4 text-white/50 group-hover:text-white/80 transition-colors" />
                        </div>
                        <span className="text-white/60 font-medium group-hover:text-white/90 transition-colors text-[13px]">GitHub</span>
                      </div>
                      <span className="text-[13px] font-semibold text-white/90">{profile.githubHandle}</span>
                    </a>
                  )}
                  {Object.entries(platformLabels).filter(([k]) => k !== 'githubHandle').map(([key, label]) => {
                    const val = (profile as any)?.[key];
                    if (!val) return null;
                    return (
                      <button key={key} onClick={() => copyToClipboard(val, key)} className="group flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-b from-[#18181b] to-[#111113] hover:from-[#1f1f23] hover:to-[#18181b] border border-white/[0.08] hover:border-white/15 transition-all duration-300 w-full text-left shadow-sm">
                        <div className="flex items-center gap-3 text-sm">
                          <div className="h-8 w-8 rounded-lg bg-[#09090b] border border-white/[0.08] flex items-center justify-center shadow-inner">
                            <span className="text-white/50 group-hover:text-white/80 transition-colors">{platformIcons[key]}</span>
                          </div>
                          <span className="text-white/60 text-[13px] font-medium group-hover:text-white/90 transition-colors">{label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-white/90">{val}</span>
                          {copied === key ? <Check className="h-3.5 w-3.5 text-cyan-400" /> : <Copy className="h-3.5 w-3.5 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Associated Guild */}
            {profile?.guild && (
              <div className="flex flex-col gap-3 relative">
                <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1 mb-1">Guild</h3>
                <Link href={`/guilds/${profile.guild.slug}`} className="group block relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#18181b] to-[#111113] hover:border-amber-500/30 transition-all p-5 shadow-sm">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative flex items-center gap-4 z-10">
                    {profile.guild.iconUrl ? (
                      <img src={profile.guild.iconUrl} className="h-14 w-14 rounded-2xl object-cover border border-white/10 shadow-inner group-hover:scale-105 transition-transform duration-500 bg-black/50" alt={profile.guild.name} />
                    ) : (
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-900/40 border border-amber-500/30 flex justify-center items-center text-amber-300 font-bold text-xl shadow-[0_0_15px_rgba(245,158,11,0.2)] group-hover:scale-105 transition-transform duration-500">{profile.guild.name.charAt(0)}</div>
                    )}
                    <div>
                      <h4 className="text-base font-bold text-white leading-none mb-2 drop-shadow-md">{profile.guild.name}</h4>
                      <div className="flex items-center gap-3 text-xs font-semibold text-white/40">
                        <span className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-md"><Users className="h-3 w-3 text-white/30" /> {profile.guild.members?.length || 0}</span>
                        <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500/80 px-2 py-0.5 rounded-md border border-amber-500/10"><Trophy className="h-3 w-3" /> {profile.guild.members?.reduce((total: number, member: { xp?: number }) =>total + (member.xp || 0),0)?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Action buttons (Sync/DeepDive) */}
            {isOwnProfile && (
              <div className="flex flex-col gap-3 pt-4">
                <button onClick={triggerSync} className="group w-full h-[44px] rounded-xl border border-white/[0.08] bg-[#18181b] hover:bg-[#1f1f23] hover:border-white/15 text-[13px] font-semibold text-white/70 hover:text-white/90 transition-all flex items-center justify-center gap-2 shadow-sm">
                  <RefreshCw className="h-3.5 w-3.5 group-hover:rotate-180 transition-transform duration-700 text-white/40 group-hover:text-white/80" /> Sync Tracker
                </button>
                <button onClick={triggerDeepDive} className="group w-full h-[44px] rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-[13px] font-semibold text-violet-300 hover:text-violet-200 transition-all flex items-center justify-center gap-2 shadow-sm">
                  <Brain className="h-3.5 w-3.5" /> Neural Deep Dive
                </button>
              </div>
            )}
          </aside>


          {/* ============================================================== */}
          {/* RIGHT COLUMN: PERFORMANCE & METRICS */}
          {/* ============================================================== */}
          <section className="flex-1 flex flex-col gap-16 min-w-0 pb-16">

            {/* STATS: Glow Underlines & Pulse */}
            <div className="flex flex-col gap-6 relative">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="h-5 w-5 text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 tracking-tight">Telemetry & Metrics</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
                {stats.map((stat) => {
                  const isMax = stat.key === maxStat.key;
                  return (
                    <div
                      key={stat.key}
                      onClick={stat.key === "xp" ? () => setShowBreakdown(true) : undefined}
                      className={`group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 shadow-sm hover:shadow-md ${stat.key === "xp" ? "cursor-pointer" : ""}`}
                    >
                      {/* Clean card surface with slight gradient for depth */}
                      <div className="absolute inset-0 bg-gradient-to-b from-[#18181b] to-[#111113] border border-white/[0.08] group-hover:border-white/15 rounded-2xl pointer-events-none transition-colors duration-300" />

                      {/* Top colored bar — only on hover (always on for max) */}
                      <div className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl transition-opacity duration-300 ${isMax ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} style={{ backgroundColor: stat.hex, boxShadow: isMax ? `0 0 10px ${stat.hex}80` : 'none' }} />

                      <div className="relative z-10 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${stat.dot} ${isMax ? "opacity-100 shadow-[0_0_8px_currentColor]" : "opacity-40 group-hover:opacity-80"}`} />
                          <span className={`text-[10px] uppercase tracking-widest font-bold ${isMax ? stat.color : "text-white/50 group-hover:text-white/80 transition-colors"}`}>{stat.label}</span>
                        </div>
                        <span className={`text-4xl sm:text-5xl font-light tabular-nums tracking-tight ${isMax ? stat.color : "text-white/80 group-hover:text-white transition-colors"} drop-shadow-sm`}>
                          {stat.value.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STREAK HEATMAP */}
            {profile.githubHandle && (
              <div className="flex flex-col gap-4 relative">
                <h2 className="text-sm font-bold text-white/70 tracking-widest uppercase flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-cyan-400" /> Consistency</h2>
                <div className="w-full p-4 sm:p-5 pb-3 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#18181b] to-[#111113] overflow-x-auto shadow-sm">
                  <StreakHeatmap handle={profile.githubHandle} />
                </div>
              </div>
            )}

            {/* CURATED PROJECTS */}
            {profile.githubHandle && (
              <div className="flex flex-col gap-6 relative">
                <div className="absolute -left-8 top-1 w-1.5 h-8 bg-violet-500 rounded-full opacity-30 shadow-[0_0_15px_rgba(139,92,246,0.5)] hidden lg:block" />
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white/90 tracking-tight flex items-center gap-2"><FolderGit2 className="w-5 h-5 text-violet-400" /> Deployed Architecture</h2>
                  <a href={`https://github.com/${profile.githubHandle}?tab=repositories`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-white/40 hover:text-white transition-colors flex items-center gap-1 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/5">
                    View Network <ChevronRight className="h-3 w-3" />
                  </a>
                </div>

                {projectsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-44 rounded-3xl bg-black/40 animate-pulse border border-white/5 ring-1 ring-white/5" />)}
                  </div>
                ) : projects.length === 0 ? (
                  <p className="text-sm text-white/40 bg-black/40 border border-white/5 rounded-3xl p-10 text-center italic ring-1 ring-white/5">Awaiting origin signals. Initialize Sync Tracker to populate.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {projects.sort((a, b) => (b.xpValue || 0) - (a.xpValue || 0)).slice(0, 6).map(project => (
                      <a key={project.id} href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="group relative flex flex-col p-5 rounded-2xl border border-white/[0.06] bg-[#111113] min-h-[160px] outline-none hover:bg-[#18181b] hover:border-violet-500/20 transition-all duration-200 overflow-hidden">
                        {/* Top accent line on hover */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-violet-500/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

                        <div className="relative z-10 flex items-start justify-between gap-4 mb-3">
                          <h3 className="text-base font-extrabold text-white tracking-tight truncate drop-shadow-sm group-hover:text-violet-100 transition-colors">{project.name}</h3>
                          <div className="flex items-center gap-3 text-[11px] text-white/30 font-mono shrink-0">
                            {project.stars > 0 && <span className="flex items-center gap-1 group-hover:text-amber-400 transition-colors"><Star className="h-3 w-3" />{project.stars}</span>}
                            {project.forks > 0 && <span className="flex items-center gap-1 group-hover:text-cyan-400 transition-colors"><GitPullRequest className="h-3 w-3" />{project.forks}</span>}
                          </div>
                        </div>
                        <p className="relative z-10 text-[13px] text-white/50 leading-relaxed line-clamp-2 flex-1 mb-6 font-medium">
                          {project.description || project.aiSummary || "No atmospheric data logged."}
                        </p>
                        <div className="relative z-10 flex items-center gap-2 mt-auto">
                          {project.language && (
                            <div className="flex items-center gap-1.5 bg-[#18181b] px-2.5 py-1 rounded-md border border-white/[0.06]">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: langColors[project.language] || '#888' }} />
                              <span className="text-[11px] font-medium text-white/40">{project.language}</span>
                            </div>
                          )}
                          {project.xpValue > 0 && (
                            <span className="text-[10px] font-medium text-amber-400/80 bg-amber-500/[0.08] border border-amber-500/15 px-2.5 py-1 rounded-md ml-auto">+{project.xpValue} XP</span>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ACHIEVEMENT MODULES */}
            {profile.badges && profile.badges.length > 0 && (
              <div className="flex flex-col gap-6 relative">
                <div className="flex items-center justify-between mt-4">

                </div>
                {/* Embedded the new BadgeGrid component styles directly via BadgeGrid prop */}
                <BadgeGrid badges={profile.badges} />
              </div>
            )}

            {/* AI ANALYSIS EMBEDDED INLINE */}
            <div className="flex flex-col gap-6 relative">
              <div className="absolute -left-8 top-1 w-1.5 h-8 bg-pink-500 rounded-full opacity-30 shadow-[0_0_15px_rgba(236,72,153,0.5)] hidden lg:block" />
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white/90 tracking-tight flex items-center gap-2">
                  <Brain className="h-5 w-5 text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]" /> Neural Interface
                </h2>
              </div>

              {analysis ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gradient-to-b from-[#18181b] to-[#111113] border border-white/[0.08] rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

                  <div className="space-y-10 relative z-10 p-2">
                    <div className="group/item">
                      <h3 className="text-[10px] font-extrabold text-pink-400/80 uppercase tracking-widest mb-4 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-pink-400" /> Projected Trajectory</h3>
                      <p className="text-[13px] text-white/70 leading-relaxed font-medium group-hover/item:text-white transition-colors">{analysis.careerPath}</p>
                    </div>
                    <div>
                      <h3 className="text-[10px] font-extrabold text-cyan-400/80 uppercase tracking-widest mb-4 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Optimal Habitats</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.companies?.map((c: string, i: number) => (
                          <span key={i} className="text-xs font-bold border border-cyan-500/20 bg-cyan-500/5 text-cyan-300 px-3.5 py-1.5 rounded-xl shadow-[0_0_15px_-5px_rgba(34,211,238,0.2)]">{c}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 relative z-10">
                    <div className="bg-gradient-to-b from-green-500/10 to-transparent border border-green-500/10 p-6 rounded-3xl relative overflow-hidden group/card hover:border-green-500/30 transition-colors shadow-inner">
                      <h3 className="text-[10px] font-extrabold text-green-400 uppercase tracking-widest mb-5 flex items-center gap-2"><Check className="h-3 w-3" /> Technical Dominance</h3>
                      <ul className="space-y-4">
                        {analysis.strengths?.map((s: string, i: number) => (
                          <li key={i} className="text-[13px] text-white/70 leading-relaxed flex items-start gap-3 font-medium">
                            <span className="text-green-500/50 mt-1 uppercase text-[8px] font-bold">POS</span> <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-gradient-to-b from-amber-500/5 to-transparent border border-amber-500/10 p-6 rounded-3xl relative overflow-hidden group/card hover:border-amber-500/30 transition-colors shadow-inner">
                      <h3 className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest mb-5 flex items-center gap-2"><Activity className="h-3 w-3" /> Core Deficiencies</h3>
                      <ul className="space-y-4">
                        {analysis.weaknesses?.map((w: string, i: number) => (
                          <li key={i} className="text-[13px] text-white/70 leading-relaxed flex items-start gap-3 font-medium">
                            <span className="text-amber-500/50 mt-1 uppercase text-[8px] font-bold">NEG</span> <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-b from-[#18181b] to-[#111113] border border-white/[0.08] rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-4 shadow-sm">
                  <div className="h-14 w-14 rounded-xl bg-[#09090b] border border-white/[0.08] flex items-center justify-center shadow-inner">
                    <Terminal className="h-6 w-6 text-white/40" />
                  </div>
                  <div className="max-w-xs space-y-1.5">
                    <p className="text-sm font-bold text-white/80">Neural Analysis Pending</p>
                    <p className="text-[13px] text-white/50 leading-relaxed font-medium">Run a Neural Deep Dive to generate AI-powered profile insights.</p>
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
    </motion.main>
  );
}
