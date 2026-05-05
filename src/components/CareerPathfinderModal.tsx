"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Terminal,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Compass,
  Target,
  TrendingUp,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { staggerItem, scaleInItem, springBouncy } from "@/lib/motion";
import ReactMarkdown from "react-markdown";
import type { AgentAction, AgentAnalysis } from "@/hooks/useCareerAgent";

/* ── Props ── */

interface CareerPathfinderModalProps {
  status: "idle" | "running" | "questions" | "complete" | "error" | "cancelled";
  actions: AgentAction[];
  step: number;
  maxSteps: number;
  pendingQuestions: string[] | null;
  analysis: AgentAnalysis | null;
  error: string | null;
  isLoading: boolean;
  onClose: () => void;
  onSubmitAnswers: (answers: Record<string, string>) => void;
  name?: string;
}

/* ── Helpers ── */

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

function getPriorityStyle(priority: string) {
  switch (priority) {
    case "Critical":
      return {
        badge:
          "bg-red-500/10 text-red-400 border-red-500/20",
        dot: "bg-red-400",
      };
    case "High":
      return {
        badge:
          "bg-orange-500/10 text-orange-400 border-orange-500/20",
        dot: "bg-orange-400",
      };
    case "Medium":
      return {
        badge:
          "bg-amber-500/10 text-amber-400 border-amber-500/20",
        dot: "bg-amber-400",
      };
    case "Low":
      return {
        badge:
          "bg-blue-500/10 text-blue-400 border-blue-500/20",
        dot: "bg-blue-400",
      };
    default:
      return {
        badge:
          "bg-blue-500/10 text-blue-400 border-blue-500/20",
        dot: "bg-blue-400",
      };
  }
}

/* ── Modal ── */

export function CareerPathfinderModal({
  status,
  actions,
  step,
  maxSteps,
  pendingQuestions,
  analysis,
  error,
  isLoading,
  onClose,
  onSubmitAnswers,
  name,
}: CareerPathfinderModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [actions.length, status, isLoading]);

  const toggleTool = (index: number) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const progress = maxSteps > 0 ? (step / maxSteps) * 100 : 0;

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
            {status === "running" || status === "questions" ? (
              <Terminal className="h-5 w-5 text-accent" />
            ) : (
              <Compass className="h-5 w-5 text-accent" />
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-subheading text-white">
                Career Analysis{name ? ` for ${name}` : ""}
              </h2>
              {analysis?.archetype && (
                <Badge variant="default" className="text-[10px]">
                  {analysis.archetype}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-fg-muted hidden sm:inline">
              Step {step}/{maxSteps}
            </span>
            <button
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-compact)] text-fg-muted hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-0.5 bg-white/[0.06] shrink-0">
          <motion.div
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {(status === "running" || status === "questions") && (
              <TerminalLog
                actions={actions}
                isLoading={isLoading}
                expandedTools={expandedTools}
                toggleTool={toggleTool}
              />
            )}

            {status === "complete" && analysis && (
              <CompleteResults analysis={analysis} />
            )}

            {status === "error" && (
              <ErrorState error={error} onClose={onClose} />
            )}

            {status === "cancelled" && (
              <CancelledState onClose={onClose} />
            )}

            {status === "idle" && !analysis && (
              <div className="flex items-center justify-center py-12 text-fg-muted text-sm">
                Waiting to start...
              </div>
            )}
          </div>

          {/* Questions Form — sticky at bottom */}
          <AnimatePresence>
            {status === "questions" && pendingQuestions && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="shrink-0 border-t border-white/[0.06] p-4 bg-overlay/80 backdrop-blur-md"
              >
                <QuestionsForm
                  questions={pendingQuestions}
                  onSubmit={onSubmitAnswers}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Terminal Log ── */

function TerminalLog({
  actions,
  isLoading,
  expandedTools,
  toggleTool,
}: {
  actions: AgentAction[];
  isLoading: boolean;
  expandedTools: Set<number>;
  toggleTool: (i: number) => void;
}) {
  const items = useMemo(() => {
    const out: Array<
      | { kind: "thinking"; action: Extract<AgentAction, { type: "thinking" }> }
      | {
          kind: "tool";
          call: Extract<AgentAction, { type: "tool_call" }>;
          result: Extract<AgentAction, { type: "tool_result" }> | null;
        }
      | {
          kind: "result";
          action: Extract<AgentAction, { type: "tool_result" }>;
        }
      | {
          kind: "question";
          action: Extract<AgentAction, { type: "question" }>;
        }
    > = [];

    for (let i = 0; i < actions.length; i++) {
      const a = actions[i];
      if (a.type === "thinking") {
        out.push({ kind: "thinking", action: a });
      } else if (a.type === "tool_call") {
        const next = actions[i + 1];
        if (
          next &&
          next.type === "tool_result" &&
          next.tool === a.tool &&
          next.input === a.input
        ) {
          out.push({ kind: "tool", call: a, result: next });
          i++;
        } else {
          out.push({ kind: "tool", call: a, result: null });
        }
      } else if (a.type === "tool_result") {
        out.push({ kind: "result", action: a });
      } else if (a.type === "question") {
        out.push({ kind: "question", action: a });
      }
    }
    return out;
  }, [actions]);

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        if (item.kind === "thinking") {
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm text-fg-muted flex items-start gap-2"
            >
              <span className="shrink-0">🤔</span>
              <span className="leading-relaxed">{item.action.content}</span>
            </motion.div>
          );
        }

        if (item.kind === "tool") {
          const isExpanded = expandedTools.has(i);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-3 border border-white/[0.06]"
            >
              <button
                onClick={() => toggleTool(i)}
                className="flex items-start gap-2 w-full text-left"
              >
                <span className="shrink-0 mt-0.5 text-base">
                  {item.call.tool === "web_search" ? "🔍" : "🛠️"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-fg-dim font-medium">
                    {item.call.tool === "web_search"
                      ? "Searching web for..."
                      : `Calling ${item.call.tool}...`}
                  </div>
                  <div className="text-xs text-fg-muted mt-0.5 truncate">
                    {item.call.input}
                  </div>
                  <div className="text-xs text-fg-muted mt-1 leading-relaxed">
                    {item.call.reasoning}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-fg-muted shrink-0 mt-0.5" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-fg-muted shrink-0 mt-0.5" />
                )}
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 pt-2 border-t border-white/[0.06] text-xs text-fg-muted font-mono leading-relaxed">
                      {item.result ? (
                        <>
                          {item.result.result.slice(0, 200)}
                          {item.result.result.length > 200 ? "..." : ""}
                        </>
                      ) : (
                        "Waiting for result..."
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        }

        if (item.kind === "result") {
          const isExpanded = expandedTools.has(i);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-3 border border-white/[0.06]"
            >
              <button
                onClick={() => toggleTool(i)}
                className="flex items-start gap-2 w-full text-left"
              >
                <span className="shrink-0 mt-0.5 text-base">📄</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-fg-dim font-medium">
                    Result from {item.action.tool}
                  </div>
                  <div className="text-xs text-fg-muted mt-0.5 truncate">
                    {item.action.input}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-fg-muted shrink-0 mt-0.5" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-fg-muted shrink-0 mt-0.5" />
                )}
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 pt-2 border-t border-white/[0.06] text-xs text-fg-muted font-mono leading-relaxed">
                      {item.action.result.slice(0, 200)}
                      {item.action.result.length > 200 ? "..." : ""}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        }

        if (item.kind === "question") {
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm text-accent flex items-start gap-2"
            >
              <span className="shrink-0">❓</span>
              <div className="leading-relaxed">
                <div className="font-medium">Clarifying questions:</div>
                <ul className="mt-1 space-y-0.5 list-disc list-inside text-fg-dim">
                  {item.action.questions.map((q, qi) => (
                    <li key={qi}>{q}</li>
                  ))}
                </ul>
                <div className="text-xs text-fg-muted mt-1">
                  {item.action.reasoning}
                </div>
              </div>
            </motion.div>
          );
        }

        return null;
      })}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-fg-muted animate-pulse py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>🤔 The Ghost is thinking...</span>
        </div>
      )}
    </div>
  );
}

/* ── Questions Form ── */

function QuestionsForm({
  questions,
  onSubmit,
}: {
  questions: string[];
  onSubmit: (answers: Record<string, string>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(answers);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="text-sm text-fg-dim font-medium">
        The Ghost has some questions:
      </div>
      {questions.map((q, i) => (
        <div key={i}>
          <label className="text-label text-fg-muted mb-1 block">{q}</label>
          <Input
            value={answers[q] || ""}
            onChange={(e) =>
              setAnswers((prev) => ({ ...prev, [q]: e.target.value }))
            }
            placeholder="Your answer..."
            className="bg-white/[0.02]"
          />
        </div>
      ))}
      <Button type="submit" className="w-full">
        Submit Answers
      </Button>
    </form>
  );
}

/* ── Complete Results ── */

function CompleteResults({ analysis }: { analysis: AgentAnalysis }) {
  const [showThinking, setShowThinking] = useState(false);
  const paths = analysis.paths || [];
  const skillGaps = analysis.skillGaps || [];
  const actionPlan = analysis.actionPlan || [];

  return (
    <div className="space-y-6">
      {/* Summary */}
      {analysis.summary && (
        <motion.div variants={staggerItem} initial="hidden" animate="visible">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h3 className="text-label text-fg-dim">Summary</h3>
          </div>
          <div className="glass-card p-4">
            <div className="text-sm text-fg-dim leading-relaxed prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{analysis.summary}</ReactMarkdown>
            </div>
          </div>
        </motion.div>
      )}

      {/* Ranked Paths */}
      {paths.length > 0 && (
        <motion.div variants={staggerItem} initial="hidden" animate="visible">
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
                      <span className="text-sm font-bold text-white">
                        {path.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          path.demand === "High"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : path.demand === "Medium"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {path.demand} Demand
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-xs text-fg-muted">
                        {path.salaryRange}
                      </span>
                      <span className="text-xs text-fg-muted">
                        {path.skillCoverage}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-stat text-lg ${getScoreColor(
                        path.matchScore
                      )}`}
                    >
                      {path.matchScore}
                    </span>
                  </div>
                </div>
                <div className="mt-2 w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${path.matchScore}%` }}
                    transition={{
                      duration: 0.8,
                      delay: i * 0.1,
                      ease: "easeOut",
                    }}
                    className={`h-full rounded-full bg-gradient-to-r ${getScoreBarColor(
                      path.matchScore
                    )}`}
                  />
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-fg-muted font-semibold">
                      Pros
                    </span>
                    <ul className="mt-1 space-y-0.5">
                      {path.pros.map((p, j) => (
                        <li
                          key={j}
                          className="text-xs text-fg-dim flex items-start gap-1.5"
                        >
                          <span className="text-emerald-400 mt-0.5">+</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-fg-muted font-semibold">
                      Cons
                    </span>
                    <ul className="mt-1 space-y-0.5">
                      {path.cons.map((c, j) => (
                        <li
                          key={j}
                          className="text-xs text-fg-dim flex items-start gap-1.5"
                        >
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
        <motion.div variants={staggerItem} initial="hidden" animate="visible">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-accent" />
            <h3 className="text-label text-fg-dim">Skill Gaps</h3>
          </div>
          <div className="glass-card p-4">
            <div className="flex flex-wrap gap-2">
              {skillGaps.map((gap, i) => {
                const style = getPriorityStyle(gap.priority);
                return (
                  <motion.div
                    key={i}
                    variants={scaleInItem}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: i * 0.05 }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${style.badge}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {gap.skill}
                    <span className="text-[10px] opacity-70">
                      {gap.priority}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Action Plan */}
      {actionPlan.length > 0 && (
        <motion.div variants={staggerItem} initial="hidden" animate="visible">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-accent" />
            <h3 className="text-label text-fg-dim">90-Day Action Plan</h3>
          </div>
          <div className="glass-card p-4 space-y-3">
            {actionPlan.map((s, i) => (
              <motion.div
                key={i}
                variants={scaleInItem}
                initial="hidden"
                animate="visible"
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 border border-accent/20 text-xs font-bold text-accent">
                  {s.step}
                </span>
                <div className="text-sm text-fg-dim leading-relaxed pt-0.5 prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{s.description}</ReactMarkdown>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Agent Thinking */}
      {analysis.thinking && (
        <motion.div variants={staggerItem} initial="hidden" animate="visible">
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
                  <div className="text-xs text-fg-muted leading-relaxed prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{analysis.thinking}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

/* ── Error State ── */

function ErrorState({
  error,
  onClose,
}: {
  error: string | null;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
      <div className="text-red-400 text-lg font-medium">
        Something went wrong
      </div>
      <p className="text-sm text-fg-muted max-w-sm">
        {error || "An unknown error occurred"}
      </p>
      <Button onClick={onClose} variant="outline">
        Try Again
      </Button>
    </div>
  );
}

/* ── Cancelled State ── */

function CancelledState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
      <div className="text-fg-dim text-lg font-medium">Analysis cancelled</div>
      <p className="text-sm text-fg-muted">
        Your career analysis was cancelled.
      </p>
      <Button onClick={onClose} variant="outline">
        Start New Analysis
      </Button>
    </div>
  );
}
