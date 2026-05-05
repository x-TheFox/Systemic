import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { groqGenerateObject } from './groq-models';
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
// Helpers
// ---------------------------------------------------------------------------

function buildSystemPrompt(maxSteps: number): string {
  return `You are an expert career strategist AI analyzing a software engineer's profile. You provide actionable career guidance with honest assessments.

You have access to these tools:
- web_search(query): Search the web for current market data, salary ranges, job requirements, and demand levels.
- get_profile_detail(detail): Fetch specific profile details (currently limited — use the profile digest already in context).

Your workflow:
1. Analyze the user's profile and identify 3-6 promising career paths
2. Research each path using web_search — check salary, requirements, demand, how the user's skills map
3. If the profile is ambiguous or sparse, ask 1-3 clarifying questions
4. Synthesize a final analysis with: archetype, ranked paths (0-100), skill gaps with priorities, 90-day action plan

Rules:
- You have a maximum of ${maxSteps} turns total. Use them wisely.
- Research each path thoroughly before finalizing — you may search multiple times per path.
- Be specific, honest, and evidence-based. Don't sugarcoat weaknesses.
- When you need market data, ALWAYS call web_search. Don't make up salary numbers.
- When ready to finalize, return type: "complete" with the full structured analysis.
- Each response should include a brief reasoning sentence before any action.`;
}

function buildPrompt(state: AgentState): string {
  const parts: string[] = [];
  for (const msg of state.messages) {
    if (msg.role === 'system') {
      parts.push(`<system>\n${msg.content}\n</system>`);
    } else if (msg.role === 'user') {
      parts.push(`<user>\n${msg.content}\n</user>`);
    } else if (msg.role === 'assistant') {
      parts.push(`<assistant>\n${msg.content}\n</assistant>`);
    } else if (msg.role === 'tool') {
      parts.push(`<tool name="${msg.name ?? 'unknown'}">\n${msg.content}\n</tool>`);
    }
  }
  return parts.join('\n\n');
}

function createInitialState(profile: ProfileDigest, maxSteps: number): AgentState {
  const systemPrompt = buildSystemPrompt(maxSteps);
  const profileJson = JSON.stringify(profile, null, 2);
  return {
    phase: 'ingest',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `--- USER PROFILE ---\n${profileJson}` },
    ],
    researchedPaths: [],
    pendingPaths: [],
    userAnswers: {},
    toolCalls: [],
    profileDigest: profile,
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

  // If we have no researched paths yet, ask a question or think
  if (state.researchedPaths.length === 0) {
    return {
      type: 'thinking' as const,
      content: 'I need to analyze the profile and identify promising career paths before taking further action.',
    };
  }

  return {
    type: 'thinking' as const,
    content: 'Continuing research and synthesis based on available data.',
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
      return JSON.stringify({ query: input, error: err?.message ?? 'Search failed', results: [] });
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
    } catch {
      state = await bootstrapState(userId, record.maxSteps);
    }
  } else {
    state = await bootstrapState(userId, record.maxSteps);
  }

  // 4. Handle user answers
  if (userAnswers && Object.keys(userAnswers).length > 0) {
    state.userAnswers = { ...state.userAnswers, ...userAnswers };
    const answerLines = Object.entries(userAnswers).map(
      ([q, a]) => `Q: ${q}\nA: ${a}`
    );
    state.messages.push({
      role: 'user',
      content: `Here are my answers to your questions:\n${answerLines.join('\n\n')}`,
    });
  }

  // 5. Check max steps
  const forceComplete = record.stepCount >= record.maxSteps;
  if (forceComplete) {
    state.messages.push({
      role: 'system',
      content: 'You have reached the maximum number of turns. You MUST return type: "complete" with the full structured analysis now. Do not call any tools.',
    });
  }

  // 6. LLM loop (supports up to 3 tool calls per turn)
  const actions: AgentAction[] = [];
  let toolCallCount = 0;
  const maxToolCallsPerTurn = 3;

  let llmOutput = await groqGenerateObject(
    AgentTurnOutputSchema,
    buildPrompt(state),
    getFallbackForState(state, forceComplete)
  );

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

    // Call LLM again with tool result
    llmOutput = await groqGenerateObject(
      AgentTurnOutputSchema,
      buildPrompt(state),
      getFallbackForState(state, forceComplete)
    );
  }

  // 7. Process final output
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
    const action: AgentAction = {
      type: 'question',
      questions: llmOutput.questions,
      reasoning: llmOutput.reasoning,
    };
    actions.push(action);
    state.messages.push({
      role: 'assistant',
      content: `I have some clarifying questions:\n${llmOutput.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nReasoning: ${llmOutput.reasoning}`,
    });

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
      content: `Analysis complete. Archetype: ${analysis.archetype}. Paths: ${analysis.paths.map((p) => p.title).join(', ')}.`,
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
