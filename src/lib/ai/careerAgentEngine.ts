import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { groqGenerateStructured } from './groq-models';
import { duckduckgoSearch } from '../search/duckduckgo';
import { ingestProfile, ProfileDigest, CareerAnalysisOutput } from './careerAgent';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentAction =
  | { type: 'thinking'; content: string }
  | { type: 'tool_call'; tool: string; input: string; reasoning: string }
  | { type: 'tool_result'; tool: string; input: string; result: string }
  | { type: 'question'; questions: string[]; reasoning: string };

export type CompleteAnalysis = CareerAnalysisOutput & { archetype: string };

export type AgentTurnResult = {
  type: 'step_complete' | 'question' | 'complete' | 'error' | 'cancelled';
  actions: AgentAction[];
  nextAction: 'step' | 'answer' | null;
  sessionId: string;
  step: number;
  maxSteps: number;
  status: 'running' | 'questions' | 'complete' | 'cancelled' | 'error';
  analysis?: CompleteAnalysis;
  error?: string;
};

type Message = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
};

type AgentState = {
  phase: 'ingest' | 'research' | 'questions' | 'synthesize' | 'complete';
  messages: Message[];
  researchedPaths: string[];
  pendingPaths: string[];
  userAnswers: Record<string, string>;
  toolCalls: Array<{ step: number; tool: string; input: string; output: string }>;
  profileDigest?: ProfileDigest;
  consecutiveFallbacks: number;
  questionsAsked: boolean;
};

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const ThinkingSchema = z.object({
  type: z.literal('thinking'),
  content: z.string(),
});

const ToolCallSchema = z.object({
  type: z.literal('tool_call'),
  tool: z.enum(['web_search', 'get_profile_detail']),
  input: z.string(),
  reasoning: z.string(),
});

const QuestionSchema = z.object({
  type: z.literal('question'),
  questions: z.array(z.string()).max(3),
  reasoning: z.string(),
});

const CompleteSchema = z.object({
  type: z.literal('complete'),
  analysis: z.object({
    archetype: z.string(),
    summary: z.string(),
    paths: z.array(
      z.object({
        title: z.string(),
        matchScore: z.number().min(0).max(100),
        salaryRange: z.string(),
        demand: z.enum(['High', 'Medium', 'Low']),
        pros: z.array(z.string()),
        cons: z.array(z.string()),
        skillCoverage: z.string(),
      })
    ),
    skillGaps: z.array(
      z.object({
        skill: z.string(),
        priority: z.enum(['Critical', 'High', 'Medium', 'Low']),
        reason: z.string(),
      })
    ),
    actionPlan: z.array(
      z.object({
        step: z.number().min(1).max(12),
        description: z.string(),
        platform: z.string().optional(),
        estimatedHours: z.number().optional(),
      })
    ),
    thinking: z.string(),
  }),
});

const AgentTurnOutputSchema = z.union([
  ThinkingSchema,
  ToolCallSchema,
  QuestionSchema,
  CompleteSchema,
]);

// ---------------------------------------------------------------------------
// Profile Summarization
// ---------------------------------------------------------------------------

export function summarizeProfile(profile: ProfileDigest): string {
  const lines: string[] = [];

  // Name / Title / XP on one line
  lines.push(
    `Engineer: ${profile.name ?? 'Unknown'} | Title: ${profile.title ?? 'N/A'} | XP: ${profile.xp}`
  );

  // Handles on one line (only non-null ones)
  const handles = Object.entries(profile.handles)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${k}:${v}`);
  lines.push(`Handles: ${handles.length ? handles.join(' ') : 'None'}`);

  // Stats as a compact sentence
  const s = profile.stats;
  const statsParts: string[] = [];
  if (s.totalCommits || s.totalPRs || s.totalReviews) {
    statsParts.push(`${s.totalCommits} commits, ${s.totalPRs} PRs, ${s.totalReviews} reviews`);
  }
  if (s.leetcodeEasy || s.leetcodeMedium || s.leetcodeHard) {
    statsParts.push(`LeetCode: ${s.leetcodeEasy}E/${s.leetcodeMedium}M/${s.leetcodeHard}H`);
  }
  if (s.codeforcesRating || s.codeforcesSolved) {
    statsParts.push(`Codeforces: ${s.codeforcesRating} rating, ${s.codeforcesSolved} solved`);
  }
  if (s.hackerrankBadges) {
    statsParts.push(`HackerRank: ${s.hackerrankBadges} badges`);
  }
  lines.push(`Stats: ${statsParts.join('. ')}`);

  // Projects: Top 3 by XP
  const topProjects = [...profile.projects]
    .sort((a, b) => b.xpValue - a.xpValue)
    .slice(0, 3);
  const projectStrs = topProjects.map(
    (p) => `${p.name}(${p.language ?? '?'}) ★${p.stars} ${p.rarity}`
  );
  const projectLine =
    projectStrs.join(', ') +
    (profile.projects.length > 3 ? ` + ${profile.projects.length - 3} others` : '');
  lines.push(`Projects: ${projectLine || 'None'}`);

  // Badges: Top 3 by rarity (Legendary > Epic > Rare > Common)
  const rarityOrder: Record<string, number> = {
    Legendary: 4,
    Epic: 3,
    Rare: 2,
    Common: 1,
  };
  const topBadges = [...profile.badges]
    .sort((a, b) => (rarityOrder[b.rarity] ?? 0) - (rarityOrder[a.rarity] ?? 0))
    .slice(0, 3);
  const badgeStrs = topBadges.map((b) => `[${b.rarity}] ${b.name}`);
  const badgeLine =
    badgeStrs.join(', ') +
    (profile.badges.length > 3 ? ` + ${profile.badges.length - 3} others` : '');
  lines.push(`Badges: ${badgeLine || 'None'}`);

  // Skill Tree
  const unlockedCount = profile.skillTree?.unlockedNodes.length ?? 0;
  lines.push(
    `Skill Tree: Grind=${profile.skillTree?.currentGrind ?? 'None'} | Unlocked=${unlockedCount}`
  );

  // Activity summary: group last 30 days by platform
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentActivity = profile.activityLog.filter((a) => a.timestamp >= thirtyDaysAgo);

  const activityByPlatform = new Map<string, Map<string, number>>();
  for (const a of recentActivity) {
    if (!activityByPlatform.has(a.platform)) {
      activityByPlatform.set(a.platform, new Map());
    }
    const typeMap = activityByPlatform.get(a.platform)!;
    typeMap.set(a.activityType, (typeMap.get(a.activityType) ?? 0) + 1);
  }

  const activityParts: string[] = [];
  for (const [platform, types] of activityByPlatform) {
    const typeStrs = Array.from(types.entries())
      .map(([t, c]) => `${c} ${t}`)
      .join(', ');
    activityParts.push(`${platform}: ${typeStrs}`);
  }
  lines.push(`Activity(30d): ${activityParts.join(' | ') || 'None'}`);

  // Duels: win/loss count
  const wins = profile.duels.filter((d) => d.winnerId === profile.userId).length;
  const losses = profile.duels.filter(
    (d) => d.winnerId !== null && d.winnerId !== profile.userId
  ).length;
  lines.push(`Duels: ${wins}W/${losses}L`);

  // Guild
  lines.push(`Guild: ${profile.guild?.name ?? 'None'}`);

  // Ghost snapshot
  if (profile.ghostSnapshot) {
    lines.push(
      `Ghost: W${profile.ghostSnapshot.weekNumber} ${profile.ghostSnapshot.year} | ${profile.ghostSnapshot.totalXP} XP`
    );
  } else {
    lines.push('Ghost: None');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Prompt Builders
// ---------------------------------------------------------------------------

function buildSystemPrompt(maxSteps: number): string {
  return `You are an expert career strategist AI analyzing a software engineer's profile. You provide actionable career guidance with honest assessments.

You have access to these tools:
- web_search(query): Search the web for current market data, salary ranges, job requirements, and demand levels.
- get_profile_detail(detail): Fetch specific profile details (currently limited — use the profile digest already in context).

PHASE RULES (MUST FOLLOW):
1. RESEARCH PHASE: First, analyze the profile and conduct AT LEAST 2 web searches to understand current market conditions for relevant career paths.
2. QUESTIONS PHASE: ONLY after conducting at least 2 web searches, you MAY ask 1-3 clarifying questions. The questions MUST be specific and relevant to what you discovered in your research.
3. SYNTHESIS PHASE: After receiving answers (if any), synthesize the final analysis. NEVER ask questions again after answers are received.
4. You may ask questions AT MOST ONCE during the entire analysis.

Your workflow:
1. Analyze the user's profile
2. Research paths using web_search (at least 2 searches minimum)
3. Ask clarifying questions ONLY if needed and ONLY after research
4. Synthesize final analysis with: archetype, ranked paths (0-100), skill gaps with priorities, 90-day action plan

Rules:
- You have a maximum of ${maxSteps} turns total. Use them wisely.
- Research each path thoroughly before finalizing — you may search multiple times per path.
- Be specific, honest, and evidence-based. Don't sugarcoat weaknesses.
- When you need market data, ALWAYS call web_search. Don't make up salary numbers.
- When ready to finalize, return type: "complete" with the full structured analysis.
- Each response should include a brief reasoning sentence before any action.

You MUST respond with ONLY a single JSON object. No markdown code blocks. No extra text.

Choose ONE of these formats:

1. THINKING: {"type":"thinking","content":"brief reasoning"}
2. TOOL CALL: {"type":"tool_call","tool":"web_search","input":"search query","reasoning":"why"}
3. QUESTIONS: {"type":"question","questions":["q1","q2"],"reasoning":"why"}
4. COMPLETE: {"type":"complete","analysis":{"archetype":"...","summary":"...","paths":[...],"skillGaps":[...],"actionPlan":[...],"thinking":"..."}}

For COMPLETE, paths need: title, matchScore (0-100), salaryRange, demand ("High"|"Medium"|"Low"), pros[], cons[], skillCoverage.
skillGaps need: skill, priority ("Critical"|"High"|"Medium"|"Low"), reason.
actionPlan need: step (1-12), description, platform (optional), estimatedHours (optional).`;
}

function buildPrompt(state: AgentState): string {
  const parts: string[] = [];
  for (const msg of state.messages) {
    if (msg.role === 'system') {
      parts.push(`=== SYSTEM ===\n${msg.content}`);
    } else if (msg.role === 'user') {
      parts.push(`=== USER ===\n${msg.content}`);
    } else if (msg.role === 'assistant') {
      parts.push(`=== ASSISTANT ===\n${msg.content}`);
    } else if (msg.role === 'tool') {
      parts.push(`=== TOOL: ${msg.name ?? 'unknown'} ===\n${msg.content}`);
    }
  }
  return parts.join('\n\n');
}

function buildSimplifiedPrompt(state: AgentState): string {
  const systemMsg = state.messages[0];
  const profileMsg = state.messages[1];
  const parts: string[] = [];
  if (systemMsg) parts.push(`=== SYSTEM ===\n${systemMsg.content}`);
  if (profileMsg) parts.push(`=== USER ===\n${profileMsg.content}`);
  return parts.join('\n\n');
}

function truncateMessages(state: AgentState): void {
  const maxMessages = 8;
  if (state.messages.length <= maxMessages) return;
  if (state.messages.length < 2) return;

  // Always keep system (index 0) and profile summary (index 1)
  const systemMsg = state.messages[0];
  const profileMsg = state.messages[1];

  const remaining = state.messages.slice(2);
  const allowedRemaining = maxMessages - 2;
  const truncated = remaining.slice(-allowedRemaining);

  state.messages = [systemMsg, profileMsg, ...truncated];
}

// ---------------------------------------------------------------------------
// State Management
// ---------------------------------------------------------------------------

function createInitialState(profile: ProfileDigest, maxSteps: number): AgentState {
  const systemPrompt = buildSystemPrompt(maxSteps);
  const profileSummary = summarizeProfile(profile);
  return {
    phase: 'ingest',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: profileSummary },
    ],
    researchedPaths: [],
    pendingPaths: [],
    userAnswers: {},
    toolCalls: [],
    profileDigest: profile,
    consecutiveFallbacks: 0,
    questionsAsked: false,
  };
}

function getFallbackForState(
  state: AgentState,
  forceComplete = false
): z.infer<typeof AgentTurnOutputSchema> {
  if (forceComplete) {
    return {
      type: 'complete' as const,
      analysis: {
        archetype: 'Generalist Software Engineer',
        summary: 'Analysis completed due to step limit. This is a preliminary assessment.',
        paths: [
          {
            title: 'Fullstack Engineer',
            matchScore: 50,
            salaryRange: '$100k - $150k',
            demand: 'High' as const,
            pros: ['Broad skill set applicable to many teams'],
            cons: ['May lack deep specialization'],
            skillCoverage: 'User has general development experience.',
          },
        ],
        skillGaps: [],
        actionPlan: [
          {
            step: 1,
            description: 'Review career paths and identify a primary focus area.',
            estimatedHours: 2,
          },
        ],
        thinking: 'Forced completion due to reaching the maximum number of agent turns.',
      },
    };
  }

  // If we have no researched paths yet, FORCE a web search to make progress
  if (state.researchedPaths.length === 0) {
    return {
      type: 'tool_call' as const,
      tool: 'web_search',
      input: 'software engineer career paths 2025 salary demand',
      reasoning:
        'No research has been conducted yet. I must search for current market data to identify viable career paths.',
    };
  }

  // If research done but no questions asked yet, force more research or thinking
  if (state.researchedPaths.length < 2) {
    return {
      type: 'tool_call' as const,
      tool: 'web_search',
      input: `${state.profileDigest?.skillTree?.currentGrind ?? 'software engineer'} job market 2025 requirements`,
      reasoning:
        'Need more research before asking questions or synthesizing. Conducting additional search.',
    };
  }

  return {
    type: 'thinking' as const,
    content: 'Continuing synthesis based on available data.',
  };
}

function appendThinking(existing: string, actions: AgentAction[]): string {
  let log = existing ? existing + '\n' : '';
  for (const action of actions) {
    if (action.type === 'thinking') {
      log += `[thinking] ${action.content}\n`;
    } else if (action.type === 'tool_call') {
      log += `[tool_call] ${action.tool}: ${action.input}\nReasoning: ${action.reasoning}\n`;
    } else if (action.type === 'tool_result') {
      log += `[tool_result] ${action.tool}: ${action.result}\n`;
    } else if (action.type === 'question') {
      log += `[question] ${action.questions.join(' | ')}\nReasoning: ${action.reasoning}\n`;
    }
  }
  return log.trim();
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

async function executeTool(tool: string, input: string): Promise<string> {
  if (tool === 'web_search') {
    try {
      const results = await duckduckgoSearch(input, 5);
      return JSON.stringify({ query: input, results });
    } catch (err: any) {
      return JSON.stringify({
        query: input,
        error: err?.message ?? 'Search failed',
        results: [],
      });
    }
  }

  if (tool === 'get_profile_detail') {
    return 'Profile detail access not yet implemented. Use the profile digest already provided in the conversation.';
  }

  return `Unknown tool: ${tool}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function runAgentTurn(
  sessionId: string,
  userId: string,
  userAnswers?: Record<string, string>
): Promise<AgentTurnResult> {
  // 1. Load record
  const record = await prisma.careerAnalysis.findUnique({
    where: { sessionId },
  });

  if (!record) {
    return {
      type: 'error',
      actions: [],
      nextAction: null,
      sessionId,
      step: 0,
      maxSteps: 20,
      status: 'error',
      error: `Session not found: ${sessionId}`,
    };
  }

  // 2. Check cancelled
  if (record.cancelledAt) {
    return {
      type: 'cancelled',
      actions: [],
      nextAction: null,
      sessionId,
      step: record.stepCount,
      maxSteps: record.maxSteps,
      status: 'cancelled',
    };
  }

  // 3. Parse or create agent state
  let state: AgentState;
  if (record.agentState) {
    try {
      state = record.agentState as unknown as AgentState;
      if (!state.messages) state.messages = [];
      if (!state.researchedPaths) state.researchedPaths = [];
      if (!state.pendingPaths) state.pendingPaths = [];
      if (!state.userAnswers) state.userAnswers = {};
      if (!state.toolCalls) state.toolCalls = [];
      if (typeof state.consecutiveFallbacks !== 'number') state.consecutiveFallbacks = 0;
      if (typeof state.questionsAsked !== 'boolean') state.questionsAsked = false;
    } catch {
      state = await bootstrapState(userId, record.maxSteps);
    }
  } else {
    state = await bootstrapState(userId, record.maxSteps);
  }

  // 4. Handle user answers
  if (userAnswers && Object.keys(userAnswers).length > 0) {
    state.userAnswers = { ...state.userAnswers, ...userAnswers };
    const answerLines = Object.entries(userAnswers).map(([q, a]) => `Q: ${q}\nA: ${a}`);
    state.messages.push({
      role: 'user',
      content: `Here are my answers to your questions:\n${answerLines.join('\n\n')}`,
    });
    state.messages.push({
      role: 'system',
      content: 'Questions have been answered. You MUST NOT ask more questions. Proceed directly to synthesizing the final analysis. Return type: "complete" with the full structured analysis.',
    });
    state.questionsAsked = true;
  }

  // 5. Check max steps
  const forceComplete = record.stepCount >= record.maxSteps;
  if (forceComplete) {
    state.messages.push({
      role: 'system',
      content:
        'You have reached the maximum number of turns. You MUST return type: "complete" with the full structured analysis now. Do not call any tools.',
    });
  }

  // 6. Manage message history
  truncateMessages(state);

  // 7. LLM call with fallback detection
  let llmOutput: z.infer<typeof AgentTurnOutputSchema>;

  const fallback = getFallbackForState(state, forceComplete);

  let result = await groqGenerateStructured(
    AgentTurnOutputSchema,
    buildPrompt(state),
    fallback
  );

  // Retry with simplified prompt if first attempt used fallback
  if (result.usedFallback) {
    const secondAttempt = await groqGenerateStructured(
      AgentTurnOutputSchema,
      buildSimplifiedPrompt(state),
      fallback
    );
    result = secondAttempt;
  }

  llmOutput = result.result;

  if (result.usedFallback) {
    state.consecutiveFallbacks++;
  } else {
    state.consecutiveFallbacks = 0;
  }

  if (state.consecutiveFallbacks >= 5) {
    const errorMsg = 'The AI service is experiencing sustained issues. Please try again later.';
    await prisma.careerAnalysis.update({
      where: { sessionId },
      data: { status: 'error', agentState: state as any },
    });
    return {
      type: 'error',
      actions: [],
      nextAction: null,
      sessionId,
      step: record.stepCount,
      maxSteps: record.maxSteps,
      status: 'error',
      error: errorMsg,
    };
  }

  // 8. Tool execution loop (supports up to 3 tool calls per turn)
  const actions: AgentAction[] = [];
  let toolCallCount = 0;
  const maxToolCallsPerTurn = 3;

  while (llmOutput.type === 'tool_call' && toolCallCount < maxToolCallsPerTurn) {
    toolCallCount++;

    // Guard against calling tools when forced to complete
    if (forceComplete) break;

    const toolAction: AgentAction = {
      type: 'tool_call',
      tool: llmOutput.tool,
      input: llmOutput.input,
      reasoning: llmOutput.reasoning,
    };
    actions.push(toolAction);

    // Execute tool
    const result = await executeTool(llmOutput.tool, llmOutput.input);
    const resultAction: AgentAction = {
      type: 'tool_result',
      tool: llmOutput.tool,
      input: llmOutput.input,
      result,
    };
    actions.push(resultAction);

    // Update state
    state.messages.push({
      role: 'assistant',
      content: `I will call ${llmOutput.tool}("${llmOutput.input}"). Reasoning: ${llmOutput.reasoning}`,
    });
    state.messages.push({
      role: 'tool',
      content: result,
      name: llmOutput.tool,
    });
    state.toolCalls.push({
      step: record.stepCount + 1,
      tool: llmOutput.tool,
      input: llmOutput.input,
      output: result,
    });

    if (llmOutput.tool === 'web_search') {
      const topic = llmOutput.input;
      if (!state.researchedPaths.includes(topic)) {
        state.researchedPaths.push(topic);
      }
    }

    // Truncate before next LLM call
    truncateMessages(state);

    // Call LLM again with tool result
    const loopFallback = getFallbackForState(state, forceComplete);

    let loopResult = await groqGenerateStructured(
      AgentTurnOutputSchema,
      buildPrompt(state),
      loopFallback
    );

    // Retry with simplified prompt if first attempt used fallback
    if (loopResult.usedFallback) {
      const secondAttempt = await groqGenerateStructured(
        AgentTurnOutputSchema,
        buildSimplifiedPrompt(state),
        loopFallback
      );
      loopResult = secondAttempt;
    }

    llmOutput = loopResult.result;

    if (loopResult.usedFallback) {
      state.consecutiveFallbacks++;
    } else {
      state.consecutiveFallbacks = 0;
    }

    if (state.consecutiveFallbacks >= 5) {
      const errorMsg = 'The AI service is experiencing sustained issues. Please try again later.';
      const thinkingLog = appendThinking(record.thinking ?? '', actions);
      await prisma.careerAnalysis.update({
        where: { sessionId },
        data: { status: 'error', agentState: state as any, thinking: thinkingLog },
      });
      return {
        type: 'error',
        actions,
        nextAction: null,
        sessionId,
        step: record.stepCount + 1,
        maxSteps: record.maxSteps,
        status: 'error',
        error: errorMsg,
      };
    }
  }

  // 9. Process final output
  if (llmOutput.type === 'thinking') {
    const action: AgentAction = { type: 'thinking', content: llmOutput.content };
    actions.push(action);
    state.messages.push({ role: 'assistant', content: llmOutput.content });

    const newStepCount = record.stepCount + 1;
    const thinkingLog = appendThinking(record.thinking ?? '', actions);

    await prisma.careerAnalysis.update({
      where: { sessionId },
      data: {
        stepCount: newStepCount,
        agentState: state as any,
        status: 'running',
        thinking: thinkingLog,
      },
    });

    return {
      type: 'step_complete',
      actions,
      nextAction: 'step',
      sessionId,
      step: newStepCount,
      maxSteps: record.maxSteps,
      status: 'running',
    };
  }

  if (llmOutput.type === 'question') {
    // ENFORCE: questions only after at least 2 searches
    if (state.researchedPaths.length < 2) {
      // Override to a forced web search
      const forcedAction: AgentAction = {
        type: 'tool_call',
        tool: 'web_search',
        input: `${state.profileDigest?.skillTree?.currentGrind ?? 'software engineer'} career paths 2025 salary requirements`,
        reasoning: 'Need to conduct more research before asking relevant questions.',
      };
      actions.push(forcedAction);
      state.messages.push({
        role: 'assistant',
        content: 'I need to conduct more research before asking relevant questions.',
      });

      const newStepCount = record.stepCount + 1;
      const thinkingLog = appendThinking(record.thinking ?? '', actions);
      await prisma.careerAnalysis.update({
        where: { sessionId },
        data: {
          stepCount: newStepCount,
          agentState: state as any,
          status: 'running',
          thinking: thinkingLog,
        },
      });

      return {
        type: 'step_complete',
        actions,
        nextAction: 'step',
        sessionId,
        step: newStepCount,
        maxSteps: record.maxSteps,
        status: 'running',
      };
    }

    // ENFORCE: questions at most once
    if (state.questionsAsked) {
      // Override to force completion
      const forcedAction: AgentAction = {
        type: 'thinking',
        content: 'Questions were already asked and answered. Proceeding to final synthesis.',
      };
      actions.push(forcedAction);
      state.messages.push({
        role: 'assistant',
        content: 'Questions were already asked and answered. Proceeding to final synthesis.',
      });

      const newStepCount = record.stepCount + 1;
      const thinkingLog = appendThinking(record.thinking ?? '', actions);
      await prisma.careerAnalysis.update({
        where: { sessionId },
        data: {
          stepCount: newStepCount,
          agentState: state as any,
          status: 'running',
          thinking: thinkingLog,
        },
      });

      return {
        type: 'step_complete',
        actions,
        nextAction: 'step',
        sessionId,
        step: newStepCount,
        maxSteps: record.maxSteps,
        status: 'running',
      };
    }

    // Actually ask questions
    const action: AgentAction = {
      type: 'question',
      questions: llmOutput.questions,
      reasoning: llmOutput.reasoning,
    };
    actions.push(action);
    state.messages.push({
      role: 'assistant',
      content: `I have some clarifying questions:\n${llmOutput.questions
        .map((q, i) => `${i + 1}. ${q}`)
        .join('\n')}\n\nReasoning: ${llmOutput.reasoning}`,
    });
    state.questionsAsked = true;

    const newStepCount = record.stepCount + 1;
    const thinkingLog = appendThinking(record.thinking ?? '', actions);

    await prisma.careerAnalysis.update({
      where: { sessionId },
      data: {
        stepCount: newStepCount,
        agentState: state as any,
        status: 'questions',
        thinking: thinkingLog,
      },
    });

    return {
      type: 'question',
      actions,
      nextAction: 'answer',
      sessionId,
      step: newStepCount,
      maxSteps: record.maxSteps,
      status: 'questions',
    };
  }

  if (llmOutput.type === 'complete') {
    const analysis = llmOutput.analysis;
    const action: AgentAction = {
      type: 'thinking',
      content: `Analysis complete. Archetype: ${analysis.archetype}. Paths: ${analysis.paths
        .map((p) => p.title)
        .join(', ')}.`,
    };
    actions.push(action);

    const thinkingLog = appendThinking(record.thinking ?? '', actions);

    await prisma.careerAnalysis.update({
      where: { sessionId },
      data: {
        stepCount: record.stepCount + 1,
        agentState: state as any,
        status: 'complete',
        archetype: analysis.archetype,
        summary: analysis.summary,
        paths: analysis.paths as any,
        skillGaps: analysis.skillGaps as any,
        actionPlan: analysis.actionPlan as any,
        thinking: thinkingLog + '\n\n--- FINAL ANALYSIS ---\n' + analysis.thinking,
      },
    });

    return {
      type: 'complete',
      actions,
      nextAction: null,
      sessionId,
      step: record.stepCount + 1,
      maxSteps: record.maxSteps,
      status: 'complete',
      analysis,
    };
  }

  // Fallback for unexpected output
  const fallbackAction: AgentAction = {
    type: 'thinking',
    content: 'Received unexpected response format from the model. Ending turn.',
  };
  actions.push(fallbackAction);
  const newStepCount = record.stepCount + 1;
  const thinkingLog = appendThinking(record.thinking ?? '', actions);

  await prisma.careerAnalysis.update({
    where: { sessionId },
    data: {
      stepCount: newStepCount,
      agentState: state as any,
      status: 'running',
      thinking: thinkingLog,
    },
  });

  return {
    type: 'step_complete',
    actions,
    nextAction: 'step',
    sessionId,
    step: newStepCount,
    maxSteps: record.maxSteps,
    status: 'running',
  };
}

async function bootstrapState(userId: string, maxSteps: number): Promise<AgentState> {
  const profile = await ingestProfile(userId);
  return createInitialState(profile, maxSteps);
}
