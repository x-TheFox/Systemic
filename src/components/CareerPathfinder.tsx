"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Compass,
  Loader2,
  Target,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { staggerItem, scaleInItem } from "@/lib/motion";
import { CareerPathfinderModal } from "./CareerPathfinderModal";

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

interface CareerPathfinderProps {
  userId: string;
  isOwnProfile: boolean;
  analysis?: CareerAnalysisData;
}

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

export function CareerPathfinder({ userId, isOwnProfile, analysis }: CareerPathfinderProps) {
  const [showModal, setShowModal] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [triggering, setTriggering] = useState(false);

  async function triggerAnalysis() {
    if (!isOwnProfile) return;
    setTriggering(true);
    try {
      const res = await fetch("/api/career-pathfinder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to start analysis");
      const data = await res.json();
      toast.success(data.message || "Analysis started!");
      window.location.reload();
    } catch {
      toast.error("Failed to start analysis. Try again.");
    } finally {
      setTriggering(false);
    }
  }

  async function submitAnswers() {
    if (!analysis?.questions) return;
    setSubmitting(true);
    try {
      const filled = analysis.questions.map((q, i) => ({
        question: q.question,
        answer: answers[i] || "",
      }));
      const res = await fetch("/api/career-pathfinder/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, answers: filled }),
      });
      if (!res.ok) throw new Error("Failed to submit answers");
      toast.success("Answers submitted! The Ghost is analyzing...");
      window.location.reload();
    } catch {
      toast.error("Failed to submit answers.");
    } finally {
      setSubmitting(false);
    }
  }

  // No analysis state
  if (!analysis) {
    return (
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
            <h2 className="text-subheading text-white">
              Career Pathfinder
            </h2>
            <p className="text-sm text-fg-muted mt-1">
              Discover your ideal career path with AI-powered research tailored to your profile.
            </p>
            {isOwnProfile && (
              <Button
                onClick={triggerAnalysis}
                disabled={triggering}
                className="mt-4"
              >
                {triggering ? (
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
    );
  }

  // Analyzing state
  if (analysis.status === "analyzing") {
    return (
      <motion.div
        variants={staggerItem}
        initial="hidden"
        animate="visible"
        className="glass-card p-6"
      >
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="mb-4"
          >
            <Loader2 className="h-10 w-10 text-accent" />
          </motion.div>
          <h3 className="text-subheading text-white">The Ghost is researching...</h3>
          <p className="text-sm text-fg-muted mt-2 max-w-xs">
            Analyzing your skills, experience, and market trends to find your perfect career paths.
          </p>
          <div className="mt-5 w-48 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent to-cyan-500"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: "60%" }}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  // Questions state
  if (analysis.status === "questions" && analysis.questions && analysis.questions.length > 0) {
    return (
      <motion.div
        variants={staggerItem}
        initial="hidden"
        animate="visible"
        className="glass-card p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-accent" />
          <h2 className="text-heading text-white">Quick Questions</h2>
        </div>
        <p className="text-sm text-fg-muted mb-5">
          Help us tailor your career analysis by answering a few quick questions.
        </p>
        <div className="space-y-4">
          {analysis.questions.map((q, i) => (
            <motion.div
              key={i}
              variants={scaleInItem}
              initial="hidden"
              animate="visible"
              transition={{ delay: i * 0.08 }}
            >
              <label className="text-label text-fg-dim mb-1.5 block">
                {q.question}
              </label>
              <Input
                value={answers[i] || ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                placeholder="Your answer..."
                className="bg-white/[0.02]"
              />
            </motion.div>
          ))}
        </div>
        <Button
          onClick={submitAnswers}
          disabled={submitting}
          className="mt-5 w-full"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Submit Answers
        </Button>
      </motion.div>
    );
  }

  // Complete / has analysis state
  const topPath = analysis.paths?.[0];
  const updatedText = formatRelativeDate(analysis.updatedAt);

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
                <h2 className="text-subheading text-white">Career Pathfinder</h2>
                {analysis.archetype && (
                  <Badge variant="default" className="text-[10px]">
                    {analysis.archetype}
                  </Badge>
                )}
              </div>
              {topPath && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-label text-fg-muted">Top Match</span>
                    <span className={`text-stat text-lg ${getScoreColor(topPath.matchScore)}`}>
                      {topPath.matchScore}
                    </span>
                  </div>
                  <div className="mt-1 w-40 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${topPath.matchScore}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full bg-gradient-to-r ${getScoreBarColor(topPath.matchScore)}`}
                    />
                  </div>
                  <p className="text-sm text-fg-dim mt-1">{topPath.title}</p>
                </div>
              )}
              {updatedText && (
                <p className="text-xs text-fg-muted mt-2">Updated {updatedText}</p>
              )}
            </div>
          </div>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          variant="outline"
          className="mt-4 w-full"
        >
          <Target className="h-4 w-4" />
          View Full Analysis
        </Button>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <CareerPathfinderModal
            analysis={analysis}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
