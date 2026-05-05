"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  Target,
  TrendingUp,
  BookOpen,
  Brain,
  ChevronDown,
  X,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { staggerItem, scaleInItem, springBouncy } from "@/lib/motion";

/* ── Duplicated from CareerPathfinder.tsx to avoid circular dep ── */

interface CareerPath {
  title: string;
  matchScore: number;
  salaryRange: string;
  demandLevel: string;
  pros: string[];
  cons: string[];
  skillCoverage: number;
}

interface SkillGap {
  name: string;
  priority: "High" | "Medium" | "Low";
}

interface ActionStep {
  step: number;
  description: string;
}

interface CareerAnalysisData {
  id: string;
  userId: string;
  status: "pending" | "questions" | "analyzing" | "complete";
  summary?: string;
  archetype?: string;
  paths?: CareerPath[];
  skillGaps?: SkillGap[];
  actionPlan?: ActionStep[];
  thinking?: string;
  questions?: { question: string; answer?: string }[];
  updatedAt?: string;
}

function formatRelativeDate(date: string | undefined): string {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-accent";
  if (score >= 60) return "text-blue-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return "from-accent to-purple-400";
  if (score >= 60) return "from-blue-500 to-blue-400";
  if (score >= 40) return "from-amber-500 to-amber-400";
  return "from-red-500 to-red-400";
}

/* ─────────────────────────────────────────────────────────────── */

interface CareerPathfinderModalProps {
  analysis: CareerAnalysisData;
  onClose: () => void;
}

export function CareerPathfinderModal({ analysis, onClose }: CareerPathfinderModalProps) {
  const [showThinking, setShowThinking] = useState(false);
  const [loading] = useState(!analysis.paths || analysis.paths.length === 0);

  const paths = analysis.paths || [];
  const skillGaps = analysis.skillGaps || [];
  const actionPlan = analysis.actionPlan || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />

      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={springBouncy}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-[var(--radius-container)] border border-white/[0.08] bg-overlay backdrop-blur-xl shadow-z-modal flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <Compass className="h-5 w-5 text-accent" />
            <div>
              <h2 className="text-subheading text-white">Career Analysis</h2>
              {analysis.archetype && (
                <Badge variant="default" className="mt-0.5 text-[10px]">
                  {analysis.archetype}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {analysis.updatedAt && (
              <span className="text-xs text-fg-muted hidden sm:inline">
                Updated {formatRelativeDate(analysis.updatedAt)}
              </span>
            )}
            <button
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-compact)] text-fg-muted hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <>
              {/* Summary */}
              {analysis.summary && (
                <motion.div
                  variants={staggerItem}
                  initial="hidden"
                  animate="visible"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <h3 className="text-label text-fg-dim">Summary</h3>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-sm text-fg-dim leading-relaxed">{analysis.summary}</p>
                  </div>
                </motion.div>
              )}

              {/* Ranked Paths */}
              {paths.length > 0 && (
                <motion.div
                  variants={staggerItem}
                  initial="hidden"
                  animate="visible"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-accent" />
                    <h3 className="text-label text-fg-dim">Ranked Paths</h3>
                  </div>
                  <div className="space-y-3">
                    {paths.map((path, i) => (
                      <motion.div
                        key={i}
                        variants={scaleInItem}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: i * 0.08 }}
                        className="glass-card p-4 hover:border-accent/20 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-white">{path.title}</span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                  path.demandLevel === "High"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : path.demandLevel === "Medium"
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    : "bg-red-500/10 text-red-400 border-red-500/20"
                                }`}
                              >
                                {path.demandLevel} Demand
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-3">
                              <span className="text-xs text-fg-muted">{path.salaryRange}</span>
                              <span className="text-xs text-fg-muted">
                                Skill coverage: {path.skillCoverage}%
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-stat text-lg ${getScoreColor(path.matchScore)}`}>
                              {path.matchScore}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${path.matchScore}%` }}
                            transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                            className={`h-full rounded-full bg-gradient-to-r ${getScoreBarColor(path.matchScore)}`}
                          />
                        </div>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-fg-muted font-semibold">Pros</span>
                            <ul className="mt-1 space-y-0.5">
                              {path.pros.map((p, j) => (
                                <li key={j} className="text-xs text-fg-dim flex items-start gap-1.5">
                                  <span className="text-emerald-400 mt-0.5">+</span>
                                  {p}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-fg-muted font-semibold">Cons</span>
                            <ul className="mt-1 space-y-0.5">
                              {path.cons.map((c, j) => (
                                <li key={j} className="text-xs text-fg-dim flex items-start gap-1.5">
                                  <span className="text-red-400 mt-0.5">-</span>
                                  {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Skill Gaps */}
              {skillGaps.length > 0 && (
                <motion.div
                  variants={staggerItem}
                  initial="hidden"
                  animate="visible"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-4 w-4 text-accent" />
                    <h3 className="text-label text-fg-dim">Skill Gaps</h3>
                  </div>
                  <div className="glass-card p-4">
                    <div className="flex flex-wrap gap-2">
                      {skillGaps.map((gap, i) => (
                        <motion.div
                          key={i}
                          variants={scaleInItem}
                          initial="hidden"
                          animate="visible"
                          transition={{ delay: i * 0.05 }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${
                            gap.priority === "High"
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : gap.priority === "Medium"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              gap.priority === "High"
                                ? "bg-red-400"
                                : gap.priority === "Medium"
                                ? "bg-amber-400"
                                : "bg-blue-400"
                            }`}
                          />
                          {gap.name}
                          <span className="text-[10px] opacity-70">{gap.priority}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Action Plan */}
              {actionPlan.length > 0 && (
                <motion.div
                  variants={staggerItem}
                  initial="hidden"
                  animate="visible"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    <h3 className="text-label text-fg-dim">90-Day Action Plan</h3>
                  </div>
                  <div className="glass-card p-4 space-y-3">
                    {actionPlan.map((step, i) => (
                      <motion.div
                        key={i}
                        variants={scaleInItem}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: i * 0.06 }}
                        className="flex items-start gap-3"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 border border-accent/20 text-xs font-bold text-accent">
                          {step.step}
                        </span>
                        <p className="text-sm text-fg-dim leading-relaxed pt-0.5">{step.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Agent Thinking */}
              {analysis.thinking && (
                <motion.div
                  variants={staggerItem}
                  initial="hidden"
                  animate="visible"
                >
                  <button
                    onClick={() => setShowThinking(!showThinking)}
                    className="flex items-center gap-2 w-full group"
                  >
                    <Brain className="h-4 w-4 text-accent" />
                    <h3 className="text-label text-fg-dim group-hover:text-white transition-colors">
                      Agent Thinking
                    </h3>
                    <motion.span
                      animate={{ rotate: showThinking ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-auto text-fg-muted"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </motion.span>
                  </button>
                  <AnimatePresence>
                    {showThinking && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="glass-card p-4 mt-3">
                          <pre className="text-xs text-fg-muted whitespace-pre-wrap leading-relaxed font-mono">
                            {analysis.thinking}
                          </pre>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────── Skeleton ───────────────────────── */

function LoadingSkeleton() {
  const shimmerStyle: React.CSSProperties = {
    backgroundSize: "200% 100%",
    backgroundImage:
      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div
          className="h-4 w-24 rounded bg-white/[0.06] animate-shimmer"
          style={shimmerStyle}
        />
        <div
          className="h-20 rounded-[var(--radius-standard)] bg-white/[0.04] animate-shimmer"
          style={shimmerStyle}
        />
      </div>
      <div className="space-y-3">
        <div
          className="h-4 w-24 rounded bg-white/[0.06] animate-shimmer"
          style={shimmerStyle}
        />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-[var(--radius-standard)] bg-white/[0.04] animate-shimmer"
            style={shimmerStyle}
          />
        ))}
      </div>
      <div className="space-y-2">
        <div
          className="h-4 w-24 rounded bg-white/[0.06] animate-shimmer"
          style={shimmerStyle}
        />
        <div
          className="h-16 rounded-[var(--radius-standard)] bg-white/[0.04] animate-shimmer"
          style={shimmerStyle}
        />
      </div>
    </div>
  );
}
