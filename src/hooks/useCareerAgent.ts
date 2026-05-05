"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export type AgentAction =
  | { type: "thinking"; content: string }
  | { type: "tool_call"; tool: string; input: string; reasoning: string }
  | { type: "tool_result"; tool: string; input: string; result: string }
  | { type: "question"; questions: string[]; reasoning: string };

export type AgentAnalysis = {
  archetype: string;
  summary: string;
  paths: Array<{
    title: string;
    matchScore: number;
    salaryRange: string;
    demand: "High" | "Medium" | "Low";
    pros: string[];
    cons: string[];
    skillCoverage: string;
  }>;
  skillGaps: Array<{
    skill: string;
    priority: "Critical" | "High" | "Medium" | "Low";
    reason: string;
  }>;
  actionPlan: Array<{
    step: number;
    description: string;
    platform?: string;
    estimatedHours?: number;
  }>;
  thinking: string;
};

export type AgentTurnResult = {
  type: "step_complete" | "question" | "complete" | "error" | "cancelled";
  actions: AgentAction[];
  nextAction: "step" | "answer" | null;
  sessionId: string;
  step: number;
  maxSteps: number;
  status: "running" | "questions" | "complete" | "cancelled" | "error";
  analysis?: AgentAnalysis;
  error?: string;
};

export function useCareerAgent(userId: string) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "running" | "questions" | "complete" | "error" | "cancelled"
  >("idle");
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [step, setStep] = useState(0);
  const [maxSteps, setMaxSteps] = useState(20);
  const [pendingQuestions, setPendingQuestions] = useState<string[] | null>(
    null
  );
  const [analysis, setAnalysis] = useState<AgentAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stepTrigger, setStepTrigger] = useState(0);

  const inFlightRef = useRef(false);
  const scheduledRef = useRef(false);

  const processResult = useCallback((result: AgentTurnResult) => {
    setActions((prev) => [...prev, ...result.actions]);
    setStep(result.step);
    setMaxSteps(result.maxSteps);
    setSessionId(result.sessionId);

    if (result.type === "complete") {
      setStatus("complete");
      setAnalysis(result.analysis ?? null);
      setPendingQuestions(null);
      return;
    }

    if (result.type === "error") {
      setStatus("error");
      setError(result.error ?? "An unknown error occurred");
      setPendingQuestions(null);
      return;
    }

    if (result.type === "cancelled") {
      setStatus("cancelled");
      setPendingQuestions(null);
      return;
    }

    if (result.type === "question") {
      setStatus("questions");
      const questionAction = result.actions.find(
        (a): a is Extract<AgentAction, { type: "question" }> =>
          a.type === "question"
      );
      setPendingQuestions(questionAction?.questions ?? null);
      return;
    }

    // step_complete
    setStatus("running");
    setPendingQuestions(null);

    if (result.nextAction === "step") {
      setStepTrigger((n) => n + 1);
    }
  }, []);

  const stepForward = useCallback(async () => {
    if (inFlightRef.current || !sessionId) return;
    if (
      status === "cancelled" ||
      status === "error" ||
      status === "complete"
    )
      return;

    inFlightRef.current = true;
    setIsLoading(true);

    try {
      const res = await fetch("/api/career-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "step", sessionId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to step forward");
      }
      const result: AgentTurnResult = await res.json();
      processResult(result);
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Failed to continue analysis");
    } finally {
      setIsLoading(false);
      inFlightRef.current = false;
    }
  }, [sessionId, status, processResult]);

  useEffect(() => {
    if (
      status === "running" &&
      !isLoading &&
      !inFlightRef.current &&
      !scheduledRef.current
    ) {
      scheduledRef.current = true;
      const id = setTimeout(() => {
        scheduledRef.current = false;
        stepForward();
      }, 500);
      return () => {
        clearTimeout(id);
        scheduledRef.current = false;
      };
    }
  }, [stepTrigger, status, isLoading, stepForward]);

  const start = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setActions([]);
    setStep(0);
    setPendingQuestions(null);
    setStatus("running");
    setStepTrigger(0);

    try {
      const res = await fetch("/api/career-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start analysis");
      }
      const result: AgentTurnResult = await res.json();
      processResult(result);
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Failed to start analysis");
    } finally {
      setIsLoading(false);
      inFlightRef.current = false;
    }
  }, [processResult]);

  const submitAnswers = useCallback(
    async (answers: Record<string, string>) => {
      if (inFlightRef.current || !sessionId) return;

      inFlightRef.current = true;
      setIsLoading(true);
      setPendingQuestions(null);

      const userAction: AgentAction = {
        type: "thinking",
        content: `User submitted answers: ${Object.entries(answers)
          .map(([q, a]) => `${q} \u2192 ${a}`)
          .join("; ")}`,
      };
      setActions((prev) => [...prev, userAction]);

      try {
        const res = await fetch("/api/career-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "answer", sessionId, answers }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to submit answers");
        }
        const result: AgentTurnResult = await res.json();
        processResult(result);
      } catch (err: any) {
        setStatus("error");
        setError(err?.message || "Failed to submit answers");
      } finally {
        setIsLoading(false);
        inFlightRef.current = false;
      }
    },
    [sessionId, processResult]
  );

  const cancel = useCallback(async () => {
    if (!sessionId) return;
    scheduledRef.current = false;

    try {
      await fetch("/api/career-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", sessionId }),
      });
    } catch {
      // ignore
    } finally {
      setStatus("cancelled");
      setPendingQuestions(null);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!userId) return;

    async function checkExisting() {
      try {
        const res = await fetch(
          `/api/career-analysis?userId=${encodeURIComponent(userId)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const existing = data.analysis;
        if (!existing) return;

        if (existing.status === "complete") {
          setStatus("complete");
          setAnalysis({
            archetype: existing.archetype || "",
            summary: existing.summary || "",
            paths: existing.paths || [],
            skillGaps: (existing.skillGaps || []).map((g: any) => ({
              skill: g.skill || g.name || "",
              priority: g.priority || "Medium",
              reason: g.reason || "",
            })),
            actionPlan: existing.actionPlan || [],
            thinking: existing.thinking || "",
          });
        } else if (
          (existing.status === "running" || existing.status === "questions") &&
          existing.sessionId
        ) {
          setSessionId(existing.sessionId);
          setStep(existing.stepCount || 0);
          setMaxSteps(existing.maxSteps || 20);
          setStatus("running");
          setStepTrigger((n) => n + 1);
        }
      } catch {
        // ignore
      }
    }

    checkExisting();
  }, [userId]);

  return {
    start,
    stepForward,
    submitAnswers,
    cancel,
    status,
    actions,
    step,
    maxSteps,
    pendingQuestions,
    analysis,
    error,
    isLoading,
  };
}
