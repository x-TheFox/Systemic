"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  X,
  Zap,
  GitCommit,
  GitPullRequest,
  MessageSquare,
  Trophy,
  Flame,
  Star,
  Box,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { springBouncy, expandHeight } from "@/lib/motion";

/* ── Types ── */

type CategoryName =
  | "COMMITS"
  | "PULL_REQUESTS"
  | "REVIEWS"
  | "LEETCODE"
  | "CODEFORCES"
  | "HACKERRANK"
  | "STREAK_BONUSES"
  | "MILESTONES"
  | "PROJECTS"
  | "OTHER";

interface CategoryItem {
  description: string | null;
  xpAwarded: number;
  timestamp: string;
  metadata: unknown;
}

interface Category {
  name: CategoryName;
  totalXP: number;
  items: CategoryItem[];
  count: number;
}

interface Project {
  name: string;
  xpValue: number;
  rarity: string;
  description: string | null;
  repoUrl: string;
}

interface XPBreakdownData {
  totalXP: number;
  categories: Category[];
  projects: Project[];
  userXP: number;
  projectsTotalXP: number;
}

interface XPBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

/* ── Category config ── */

const categoryConfig: Record<
  CategoryName,
  { label: string; icon: React.ReactNode; color: string }
> = {
  COMMITS: {
    label: "Commits",
    icon: <GitCommit className="h-4 w-4" />,
    color: "cyan",
  },
  PULL_REQUESTS: {
    label: "Pull Requests",
    icon: <GitPullRequest className="h-4 w-4" />,
    color: "blue",
  },
  REVIEWS: {
    label: "Reviews",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "purple",
  },
  LEETCODE: {
    label: "LeetCode",
    icon: <Zap className="h-4 w-4" />,
    color: "green",
  },
  CODEFORCES: {
    label: "Codeforces",
    icon: <Trophy className="h-4 w-4" />,
    color: "amber",
  },
  HACKERRANK: {
    label: "HackerRank",
    icon: <Star className="h-4 w-4" />,
    color: "emerald",
  },
  STREAK_BONUSES: {
    label: "Streak Bonuses",
    icon: <Flame className="h-4 w-4" />,
    color: "orange",
  },
  MILESTONES: {
    label: "Milestones",
    icon: <Trophy className="h-4 w-4" />,
    color: "yellow",
  },
  PROJECTS: {
    label: "Projects",
    icon: <Box className="h-4 w-4" />,
    color: "pink",
  },
  OTHER: {
    label: "Other",
    icon: <HelpCircle className="h-4 w-4" />,
    color: "gray",
  },
};

const colorMap: Record<string, { text: string; bg: string; border: string }> = {
  cyan: { text: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  blue: { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  purple: { text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  green: { text: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  amber: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  emerald: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  orange: { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  yellow: { text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  pink: { text: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
  gray: { text: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/20" },
};

const rarityStyles: Record<string, { border: string; text: string; label: string }> = {
  common: { border: "border-slate-500/20", text: "text-slate-400", label: "Common" },
  rare: { border: "border-blue-500/30", text: "text-blue-400", label: "Rare" },
  epic: { border: "border-purple-500/30", text: "text-purple-400", label: "Epic" },
  legendary: { border: "border-amber-500/40", text: "text-amber-400", label: "Legendary" },
};

/* ── Helpers ── */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMeta(meta: unknown): string | null {
  if (!meta || typeof meta !== "object") return null;
  const m = meta as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof m.intensityMult === "number") parts.push(`intensity ×${m.intensityMult.toFixed(2)}`);
  if (typeof m.avgScore === "number") parts.push(`avg ${m.avgScore.toFixed(1)}`);
  if (typeof m.score === "number") parts.push(`score ${m.score}`);
  if (typeof m.difficulty === "string") parts.push(m.difficulty);
  if (typeof m.language === "string") parts.push(m.language);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/* ── Component ── */

export function XPBreakdownModal({
  isOpen,
  onClose,
  userId,
  userName,
}: XPBreakdownModalProps) {
  const [data, setData] = useState<XPBreakdownData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<CategoryName>>(new Set());

  const toggleCategory = useCallback((name: CategoryName) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isOpen || !userId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setData(null);
      setExpanded(new Set());

      try {
        const res = await fetch(`/api/xp-breakdown?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Error ${res.status}`);
        }
        const payload = (await res.json()) as XPBreakdownData;
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load XP breakdown");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, userId]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-xl"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={springBouncy}
            className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-[var(--radius-container)] border border-white/[0.08] bg-overlay shadow-z-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-[var(--radius-compact)] text-fg-muted hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="sticky top-0 z-[1] bg-overlay/95 backdrop-blur-xl border-b border-white/[0.06] px-6 py-5">
              <h2 className="text-heading text-white pr-10">
                XP Breakdown for <span className="gradient-text">{userName}</span>
              </h2>
              <div className="flex items-center gap-3 mt-2">
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 text-fg-muted animate-spin" />
                    <div className="h-10 w-40 rounded-[var(--radius-compact)] bg-gradient-to-r from-white/[0.03] via-white/[0.08] to-white/[0.03] bg-[length:200%_100%] animate-shimmer" />
                  </>
                ) : (
                  <>
                    <span className="text-stat-lg text-white">
                      {(data?.userXP ?? 0).toLocaleString()}
                    </span>
                    <span className="text-label text-fg-muted">Total XP</span>
                  </>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {loading && <LoadingSkeleton />}

              {error && (
                <div className="p-4 rounded-[var(--radius-standard)] bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              {!loading && !error && data && (
                <>
                  {data.categories.length === 0 && data.projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <HelpCircle className="h-10 w-10 text-fg-muted mb-3" />
                      <p className="text-subheading text-white">No data yet</p>
                      <p className="text-sm text-fg-muted mt-1">
                        Activity will appear here once platforms are synced.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Categories */}
                      <div className="space-y-2">
                        {data.categories.map((category) => {
                          const cfg = categoryConfig[category.name];
                          const colors = colorMap[cfg.color];
                          const isExpanded = expanded.has(category.name);

                          return (
                            <div
                              key={category.name}
                              className={cn(
                                "rounded-[var(--radius-standard)] border overflow-hidden transition-colors",
                                isExpanded ? colors.bg : "bg-white/[0.02]",
                                isExpanded ? colors.border : "border-white/[0.06]"
                              )}
                            >
                              {/* Category header */}
                              <button
                                onClick={() => toggleCategory(category.name)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
                              >
                                <span className={cn("flex-shrink-0", colors.text)}>
                                  {cfg.icon}
                                </span>
                                <span className={cn("flex-1 font-semibold text-sm", colors.text)}>
                                  {cfg.label}
                                </span>
                                <span className="text-xs text-fg-muted">
                                  {category.count} item{category.count !== 1 ? "s" : ""}
                                </span>
                                <span className={cn("text-sm font-bold tabular-nums", colors.text)}>
                                  +{category.totalXP.toLocaleString()}
                                </span>
                                <span
                                  className={cn(
                                    "flex-shrink-0 transition-transform duration-200",
                                    isExpanded && "rotate-180"
                                  )}
                                >
                                  <ChevronDown className="h-4 w-4 text-fg-muted" />
                                </span>
                              </button>

                              {/* Expanded items */}
                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    variants={expandHeight}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="overflow-hidden"
                                  >
                                    <div className="px-4 pb-3 space-y-1">
                                      {category.items.map((item, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-start gap-3 py-2 px-3 rounded-[var(--radius-compact)] bg-white/[0.02] border border-white/[0.04]"
                                        >
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white truncate">
                                              {item.description || "—"}
                                            </p>
                                            {formatMeta(item.metadata) && (
                                              <p className="text-xs text-fg-muted mt-0.5">
                                                {formatMeta(item.metadata)}
                                              </p>
                                            )}
                                          </div>
                                          <div className="flex flex-col items-end flex-shrink-0">
                                            <span className={cn("text-sm font-bold tabular-nums", colors.text)}>
                                              +{item.xpAwarded}
                                            </span>
                                            <span className="text-[11px] text-fg-muted">
                                              {formatDate(item.timestamp)}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>

                      {/* Projects */}
                      {data.projects.length > 0 && (
                        <div className="pt-2">
                          <div className="flex items-center gap-2 mb-3">
                            <Box className="h-4 w-4 text-pink-400" />
                            <h3 className="text-subheading text-white">Projects</h3>
                            <span className="text-xs text-fg-muted">
                              {data.projects.length} project{data.projects.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {data.projects.map((project) => {
                              const rs = rarityStyles[project.rarity] || rarityStyles.common;
                              return (
                                <a
                                  key={project.name}
                                  href={project.repoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "block p-4 rounded-[var(--radius-standard)] border bg-white/[0.02] hover:bg-white/[0.03] transition-colors",
                                    rs.border
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-sm font-bold text-white truncate">
                                        {project.name}
                                      </span>
                                      <span
                                        className={cn(
                                          "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.04]",
                                          rs.text
                                        )}
                                      >
                                        {rs.label}
                                      </span>
                                    </div>
                                    <span className={cn("text-sm font-bold tabular-nums flex-shrink-0", rs.text)}>
                                      +{project.xpValue.toLocaleString()} XP
                                    </span>
                                  </div>
                                  {project.description && (
                                    <p className="text-xs text-fg-muted mt-1 line-clamp-2">
                                      {project.description}
                                    </p>
                                  )}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ── Loading Skeleton ── */

function ShimmerRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-compact)] bg-gradient-to-r from-white/[0.03] via-white/[0.08] to-white/[0.03] bg-[length:200%_100%] animate-shimmer",
        className
      )}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <ShimmerRow key={i} className="h-14" />
      ))}
      <ShimmerRow className="h-24 mt-4" />
    </div>
  );
}
