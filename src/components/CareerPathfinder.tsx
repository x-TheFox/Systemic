"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  Loader2,
  Target,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { staggerItem } from "@/lib/motion";
import { useCareerAgent, type AgentAnalysis } from "@/hooks/useCareerAgent";
import { CareerPathfinderModal } from "./CareerPathfinderModal";

/* ── Backward-compatible types (used by ProfileView) ── */

export interface CareerPath {
  title: string;
  matchScore: number;
  salaryRange: string;
  demandLevel: string;
  pros: string[];
  cons: string[];
  skillCoverage: number;
}

export interface SkillGap {
  name: string;
  priority: "High" | "Medium" | "Low";
}

export interface ActionStep {
  step: number;
  description: string;
}

export interface CareerAnalysisData {
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

/* ── Helpers ── */

export function formatRelativeDate(date: string | undefined): string {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-accent";
  if (score >= 60) return "text-blue-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

export function getScoreBarColor(score: number): string {
  if (score >= 80) return "from-accent to-purple-400";
  if (score >= 60) return "from-blue-500 to-blue-400";
  if (score >= 40) return "from-amber-500 to-amber-400";
  return "from-red-500 to-red-400";
}

/* ── Converter ── */

function convertPropAnalysis(data: CareerAnalysisData): AgentAnalysis {
  return {
    archetype: data.archetype || "",
    summary: data.summary || "",
    paths: (data.paths || []).map((p) => ({
      title: p.title,
      matchScore: p.matchScore,
      salaryRange: p.salaryRange,
      demand: (p.demandLevel as "High" | "Medium" | "Low") || "Medium",
      pros: p.pros,
      cons: p.cons,
      skillCoverage: String(p.skillCoverage),
    })),
    skillGaps: (data.skillGaps || []).map((g) => ({
      skill: g.name,
      priority: (g.priority === "High"
        ? "High"
        : g.priority === "Medium"
        ? "Medium"
        : "Low") as "Critical" | "High" | "Medium" | "Low",
      reason: "",
    })),
    actionPlan: (data.actionPlan || []).map((a) => ({
      step: a.step,
      description: a.description,
    })),
    thinking: data.thinking || "",
  };
}

/* ── Props ── */

interface CareerPathfinderProps {
  userId: string;
  isOwnProfile: boolean;
  analysis?: CareerAnalysisData;
  name?: string;
}

/* ── Component ── */

export function CareerPathfinder({
  userId,
  isOwnProfile,
  analysis,
  name,
}: CareerPathfinderProps) {
  const agent = useCareerAgent(userId);
  const [showModal, setShowModal] = useState(false);

  const hasCompleteAnalysis = agent.status === "complete" || !!analysis;
  const displayArchetype = agent.analysis?.archetype ?? analysis?.archetype;
  const displayTopPath = agent.analysis?.paths?.[0] ?? analysis?.paths?.[0];

  const handleStart = () => {
    agent.start();
    setShowModal(true);
  };

  const handleRegenerate = () => {
    agent.start();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    agent.cancel();
  };

  const modalStatus =
    agent.status !== "idle" ? agent.status : analysis ? "complete" : "idle";
  const modalAnalysis =
    agent.analysis ?? (analysis ? convertPropAnalysis(analysis) : null);

  // No analysis state
  if (!hasCompleteAnalysis) {
    return (
      <>
        <motion.div
          variants={staggerItem}
          initial="hidden"
          animate="visible"
          className="glass-card p-6"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-standard)] bg-accent/10 border border-accent/20">
              <Compass className="h-6 w-6 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-subheading text-white">Career Pathfinder</h2>
              <p className="text-sm text-fg-muted mt-1">
                Discover your ideal career path with AI-powered research tailored
                to your profile.
              </p>
              {isOwnProfile && (
                <Button
                  onClick={handleStart}
                  disabled={agent.isLoading}
                  className="mt-4"
                >
                  {agent.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Analyze My Profile
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showModal && (
            <CareerPathfinderModal
              status={agent.status}
              actions={agent.actions}
              step={agent.step}
              maxSteps={agent.maxSteps}
              pendingQuestions={agent.pendingQuestions}
              analysis={agent.analysis}
              error={agent.error}
              isLoading={agent.isLoading}
              onClose={handleCloseModal}
              onSubmitAnswers={agent.submitAnswers}
              name={name}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  // Analysis complete state
  return (
    <>
      <motion.div
        variants={staggerItem}
        initial="hidden"
        animate="visible"
        className="glass-card p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-standard)] bg-accent/10 border border-accent/20">
              <Compass className="h-6 w-6 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-subheading text-white">
                  Career Pathfinder
                </h2>
                {displayArchetype && (
                  <Badge variant="default" className="text-[10px]">
                    {displayArchetype}
                  </Badge>
                )}
              </div>
              {displayTopPath && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-label text-fg-muted">Top Match</span>
                    <span
                      className={`text-stat text-lg ${getScoreColor(
                        displayTopPath.matchScore
                      )}`}
                    >
                      {displayTopPath.matchScore}
                    </span>
                  </div>
                  <div className="mt-1 w-40 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${displayTopPath.matchScore}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full bg-gradient-to-r ${getScoreBarColor(
                        displayTopPath.matchScore
                      )}`}
                    />
                  </div>
                  <p className="text-sm text-fg-dim mt-1">
                    {displayTopPath.title}
                  </p>
                </div>
              )}
              {analysis?.updatedAt && (
                <p className="text-xs text-fg-muted mt-2">
                  Updated {formatRelativeDate(analysis.updatedAt)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={() => setShowModal(true)}
            variant="outline"
            className="flex-1"
          >
            <Target className="h-4 w-4" />
            View Full Analysis
          </Button>
          {isOwnProfile && (
            <Button
              onClick={handleRegenerate}
              disabled={agent.isLoading}
              variant="outline"
              className="flex-1"
            >
              {agent.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Regenerate
            </Button>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <CareerPathfinderModal
            status={modalStatus}
            actions={agent.actions}
            step={agent.step}
            maxSteps={agent.maxSteps}
            pendingQuestions={agent.pendingQuestions}
            analysis={modalAnalysis}
            error={agent.error}
            isLoading={agent.isLoading}
            onClose={handleCloseModal}
            onSubmitAnswers={agent.submitAnswers}
            name={name}
          />
        )}
      </AnimatePresence>
    </>
  );
}
