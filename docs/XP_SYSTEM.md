# XP System

How Systemics converts multi-platform activity into a unified scoring system.

---

## Philosophy

The goal is fairness across platforms. A LeetCode Hard and a complex GitHub PR should be roughly comparable in effort and skill demonstration.

**XP is not just volume - it's weighted by complexity.**

---

## Base XP Table

### GitHub

| Activity | Base XP | Notes |
|---|---|---|
| Commit | 5 | Simple commit |
| PR (Simple) | 20 | Fallback if AI fails |
| PR (AI Scored) | 10-100 | Based on diff complexity |

**AI Scoring Rubric**:
- **10-20**: Trivial (typos, config, simple refactors)
- **21-40**: Easy (small feature, bug fix with tests)
- **41-60**: Medium (new endpoint, component with state, algorithm)
- **61-80**: Hard (complex feature, integration, architecture change)
- **81-100**: Epic (major refactor, new system, critical infrastructure)

The Groq model (`openai/gpt-oss-120b`) analyzes the PR diff and description to assign the score.

### LeetCode

| Difficulty | XP | Rationale |
|---|---|---|
| Easy | 10 | Basic algorithmic thinking |
| Medium | 25 | Standard interview-level |
| Hard | 50 | Advanced, often multiple concepts |

**Contest Rating Bonus**:
- +100 XP per 100 rating points
- Example: Rating 1600 = +1600 XP

### Codeforces

| Metric | XP | Notes |
|---|---|---|
| Problem Solved | 15 | Any accepted submission |
| Rating Milestone | +100 per 100 pts | Same as LeetCode |
| Rank Up | Bonus | See table below |

**Rank Bonuses**:

| Rank | Bonus XP |
|---|---|
| Newbie | 0 |
| Pupil | 50 |
| Specialist | 100 |
| Expert | 200 |
| Candidate Master | 300 |
| Master | 500 |
| International Master | 700 |
| Grandmaster | 1000 |
| International Grandmaster | 1000 |
| Legendary Grandmaster | 1000 |

### HackerRank

| Activity | XP | Notes |
|---|---|---|
| Badge | 30 | Skill verification badges |
| Certificate | 100 | Role-based certificates |
| Star | 10 | Practice problem stars |

---

## Total XP Calculation

```
Total XP = GitHub XP + LeetCode XP + Codeforces XP + HackerRank XP
```

Where:

```
GitHub XP = (commits × 5) + sum(AI-scored PR complexities)
LeetCode XP = (easy × 10) + (medium × 25) + (hard × 50) + (rating ÷ 100 × 100)
Codeforces XP = (solved × 15) + (rating ÷ 100 × 100) + rankBonus
HackerRank XP = (badges × 30) + (certificates × 100) + (stars × 10)
```

---

## Deduplication

Critical to prevent double-counting:

### Mechanism

1. **`externalId` field**: Each activity log stores a platform-specific unique identifier:
   - GitHub PR: PR URL (`https://github.com/owner/repo/pull/123`)
   - LeetCode: not currently deduplicated (uses aggregate counts)
   - Codeforces: not currently deduplicated
   - HackerRank: not currently deduplicated

2. **`@@unique([userId, externalId])`**: Database constraint prevents duplicate PRs

3. **`lastSyncedAt` fields**: `User.lastSyncedGitHub`, `lastSyncedLeetCode`, etc. track when each platform was last fetched. Used for incremental syncs in future versions.

### Sync Behavior

When sync runs:
1. Fetch all recent PRs from GitHub
2. For each PR, check if `externalId = PR URL` exists in ActivityLog
3. If yes: skip (already counted)
4. If no: analyze with AI, create log, award XP

---

## XP Scaling Over Time

As users advance, requirements scale:

| User Level | Approx XP | Description |
|---|---|---|
| Novice | 0-500 | Just starting |
| Developer | 500-2,500 | Regular activity |
| Senior | 2,500-7,500 | Consistent grind |
| Lead | 7,500-15,000 | Multi-platform mastery |
| Architect | 15,000+ | Legendary status |

**Note**: XP is unbounded. There's no cap.

---

## Leaderboard Ranking

Users are ranked strictly by `User.xp` (descending).

Tiebreaker (if implemented): `User.updatedAt` (most recent activity wins).

---

## Achievement XP Bonuses

Unlocking skill tree nodes awards bonus XP:

```
Node XP Reward: 50-2000 XP (set at generation time)
```

This is separate from platform XP and is awarded once per node.

---

## Example Calculation

**User: Alice**

| Platform | Activity | Calculation | XP |
|---|---|---|---|
| GitHub | 100 commits | 100 × 5 | 500 |
| GitHub | 5 PRs (AI scores: 30, 45, 20, 60, 35) | 30+45+20+60+35 | 190 |
| LeetCode | 50 Easy, 30 Medium, 10 Hard | (50×10)+(30×25)+(10×50) | 1750 |
| LeetCode | Contest Rating 1600 | 1600 ÷ 100 × 100 | 1600 |
| Codeforces | 100 solved, Rating 1400 | (100×15)+(1400÷100×100) | 2900 |
| Codeforces | Rank: Expert | Bonus | 200 |
| HackerRank | 5 badges | 5 × 30 | 150 |

**Total: 7,290 XP**

---

## Anti-Gaming Measures

1. **AI PR Analysis**: Low-effort PRs (typos, formatting) score 10-20 XP, not 50+
2. **Deduplication**: Same PR cannot be counted twice
3. **Rate Limiting**: Codeforces fetcher respects 1 req/2s limit
4. **Aggregate Stats**: LeetCode/Codeforces use solved counts (not submissions), preventing spam-submit farming

---

## Future Improvements

- **Streak Multipliers**: Consecutive days of activity grant bonus XP
- **Team Multipliers**: Squad members boost each other's XP
- **Difficulty Decay**: Repeating easy problems yields diminishing returns
- **Time Decay**: Older activity contributes less to "current skill" (but not total XP)
