# Systemics

<p align="center">
  <img src="/icon.svg" alt="Systemics" width="64" height="64"><br>
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js 14">
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/Groq-AI-orange?logo=openai" alt="Groq AI">
  <img src="https://img.shields.io/badge/shadcn%2Fui-components-black?logo=react" alt="shadcn/ui">
</p>

<p align="center">
  <strong>An AI-augmented competitive leaderboard for developers.</strong><br>
  Track your grind across GitHub, LeetCode, Codeforces, HackerRank, and TryHackMe - with skill trees that grow with you, badges that accumulate forever, and an AI that never sleeps.
</p>

---

## Features

### The Unified Data Engine
Automatically fetches your coding activity every 6 hours via GitHub Actions:

| Platform | Metrics Tracked | XP Source |
|---|---|---|
| **GitHub** | Commits, PRs (up to 50), Language Distribution | Commits × 5 + AI-Scored PRs (30-100 XP) |
| **LeetCode** | Solved by Difficulty, Contest Rating | Easy 10 / Medium 25 / Hard 50 XP |
| **Codeforces** | Rating, Rank, Solved Problems | Problems × 15 + Rating Milestones |
| **HackerRank** | Badges, Certificates, Stars | Badges × 30 / Certificates × 100 XP |
| **TryHackMe** | Points, Rank, Badges, Rooms Completed | Points × 2 + Badges × 20 / Rooms × 10 / Rank Milestones |

**Shadow Commits**: Groq LLM analyzes your PR diffs to score complexity (30-100 XP) instead of raw line counts. No more padding commits for leaderboard points.

**Stat Regression Guards**: XP and stats NEVER regress. If any platform API returns a lower value than stored, the higher value is preserved.

### AI-Forged Badges (Permanent Collection)
Every sync cycle, the Badge Smith generates 4 unique badges for each player based on their actual skill profile. Badges are **permanent** - they accumulate forever and are never deleted. Weekly leaderboard badges (MVP, Silver Runner, Bronze Challenger, The Lurker, The Penultimate) rotate each week.

- Badge names are unique - the AI is told your existing badge names and generates new ones each time
- Rarity tiers: Common, Rare, Epic, Legendary
- Sorted by rarity in the UI
- Badge categories: skill, grind, social, special

### AI-Generated Titles
The Title Master grants each player a hype one-line title (2-5 words) based on their dominant skills and archetype. Previous titles are archived to **PastTitle** history and displayed as pills on the profile.

### AI-Generated Skill Trees
Your tech tree isn't static - it's alive. The Ghost (our AI Architect) generates personalized skill nodes based on your actual activity:

- Grind LeetCode hards? → It spawns **"Kernel Whisperer"** and **"Concurrency Master"** nodes
- Ship frontend PRs? → It reveals **"React Artisan"** and **"DOM Surgeon"** paths
- Well-rounded? → It unlocks **"The Architect"** and leadership nodes

Each node has achievable-but-real requirements so there's always a next mountain to climb. TryHackMe stats are tracked in unlock requirements too.

### Deep Dive Engine
On first sync, a full GitHub deep-dive is triggered that:
- Analyzes all repositories for language breakdown, commit patterns, and dominant path
- Generates an archetype (e.g., "Systems Synthesist", "Fullstack Legend")
- Creates initial skill tree nodes grounded in real data

### AI Skill Radar
A 5-axis spider chart visualizing your true skills:
- **Frontend** · **Backend** · **DevOps** · **Architecture** · **Algo**

**Ghost Mode**: Toggle an overlay of your stats from last week to compete against your past self.

### The Pulse (Unlimited Real-time Feed)
Real-time milestone feed powered by Pusher - no artificial limits:
- PR merges, commits, LeetCode solves, Codeforces contests, HackerRank badges, TryHackMe hacks
- Node unlocks, achievements, rank-ups, XP milestones
- All activity types merged and sorted by timestamp (newest first)
- PRs use their actual creation/merge date, not the sync timestamp

### Weekly Post-Mortem
Every Sunday night, The Ghost synthesizes the week's data into a report:
- MVP shoutout (highest XP earner)
- Lurker callout (lowest activity)
- Auto-posts to Discord webhook (optional)
- Weekly leaderboard badges rotate: MVP (#1), Silver Runner (#2), Bronze Challenger (#3), The Penultimate, The Lurker

### Public Profiles
Every player gets a public profile at `/profile?github={handle}` showing:
- Prominent AI-generated title
- Past titles history as pills
- All badges (weekly honors + AI-forged) in a scrollable modal
- Full stat breakdown (commits, PRs, LC, CF, HR, THM)
- Unlocked skill nodes
- Platform handle management (self-editable)

---

## Architecture

```mermaid
graph TB
    subgraph "Frontend"
        A[Next.js 14 App Router]
        B[React Flow Skill Tree]
        C[Recharts Radar]
        D[Pusher Real-time Feed]
    end

    subgraph "API Layer"
        E[Clerk Auth + Middleware]
        F[/api/sync/]
        G[/api/weekly/]
        H[/api/skilltree/]
        I[/api/radar/]
        J[/api/leaderboard/]
        K[/api/profile/]
        L[/api/badges/]
        M[/api/title/]
        N[/api/pulse/]
        O[/api/deepdive/]
    end

    subgraph "AI"
        P[Groq openai/gpt-oss-120b]
        Q[PR Complexity Analysis]
        R[Dynamic Tree Generation]
        S[Weekly Post-Mortem]
        T[Badge Smith]
        U[Title Master]
    end

    subgraph "Data"
        V[Neon Postgres]
        W[Prisma ORM v5]
    end

    A --> E
    A --> H
    A --> I
    A --> J
    A --> K
    A --> N
    F --> P
    F --> V
    G --> P
    G --> V
    H --> V
    I --> V
    J --> V
    K --> V
    L --> P
    L --> V
    M --> P
    M --> V
    O --> P
    P --> Q
    P --> R
    P --> S
    P --> T
    P --> U
```

---

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, TypeScript)
- **Auth**: [Clerk](https://clerk.dev/) (GitHub/Discord OAuth)
- **Database**: [Neon Postgres](https://neon.tech/) via Prisma v5
- **AI**: [Groq](https://groq.com/) via Vercel AI SDK (`openai/gpt-oss-120b`)
- **Real-time**: [Pusher Channels](https://pusher.com/channels)
- **UI**: [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS
- **Visualization**: [React Flow](https://reactflow.dev/) (skill tree) + [Recharts](https://recharts.org/) (radar)
- **Automation**: [GitHub Actions](https://github.com/features/actions) cron workflows

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon Postgres](https://neon.tech/) database
- [Clerk](https://dashboard.clerk.com/) account
- [Groq](https://console.groq.com/) API key
- [Pusher](https://dashboard.pusher.com/) app
- GitHub Personal Access Token (for GraphQL API)

### Installation

```bash
git clone https://github.com/x-TheFox/Systemic.git
cd Systemic

npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your real credentials

# Generate Prisma client + push schema
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file (never commit this):

```bash
# Database (Neon)
DATABASE_URL="postgresql://user:pass@host-pooler.neon.tech/db?sslmode=require"
DIRECT_URL="postgresql://user:pass@host.neon.tech/db?sslmode=require"

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# AI (Groq)
GROQ_API_KEY=gsk_...

# Real-time (Pusher)
NEXT_PUBLIC_PUSHER_KEY=...
PUSHER_SECRET=...
PUSHER_APP_ID=...
NEXT_PUBLIC_PUSHER_CLUSTER=us2

# GitHub API
GITHUB_TOKEN=ghp_...

# Security
CRON_SECRET=super_secret_random_string
NEXT_PUBLIC_CRON_SECRET=super_secret_random_string

# Optional: Discord webhook for weekly reports
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## Deployment

### Vercel

1. Push to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com/dashboard)
3. Add all environment variables from `.env.example`
4. Deploy - Vercel runs `prisma generate` in `postinstall` and `build` scripts

### GitHub Actions Cron Jobs

After deployment, add these secrets to your GitHub repository:

- `VERCEL_URL`: Your production domain (e.g., `https://systemic-neon.vercel.app`)
- `CRON_SECRET`: Same value as in your `.env`

The workflows run automatically:
- **Sync**: Every 6 hours (fetches platform data, awards XP, grows skill trees, generates badges + titles)
- **Badges**: Triggered after sync (AI-forged badges, accumulated permanently)
- **Titles**: Triggered after badges (AI-generated hype title)
- **Weekly**: Every Sunday at 8pm UTC (generates post-mortem, Discord post, rotates weekly badges)

---

## Project Structure

```
systemic/
├── prisma/
│   └── schema.prisma            # 9 models: User, ActivityLog, SkillTreeState,
│                                 #   DynamicSkillNode, Achievement, GhostSnapshot,
│                                 #   WeeklyReport, Badge, PastTitle
├── public/
│   ├── icon.svg                  # App icon / favicon
│   └── badges/                   # SVG badge assets (mvp, 2nd, 3rd, last1, last2)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── sync/             # 6-hour delta sync engine (all platforms)
│   │   │   ├── weekly/           # Sunday post-mortem + badge rotation
│   │   │   ├── badges/           # AI badge generation (accumulates permanently)
│   │   │   ├── title/           # AI title generation (archives past titles)
│   │   │   ├── deepdive/        # Full GitHub deep dive + AI tree generation
│   │   │   ├── pulse/            # Historical activity feed (no limits)
│   │   │   ├── skilltree/       # Dynamic tree API
│   │   │   ├── radar/           # AI skill radar API
│   │   │   ├── leaderboard/     # Global rankings
│   │   │   └── profile/         # User profile & handle management
│   │   ├── page.tsx              # Dashboard
│   │   ├── leaderboard/page.tsx  # Leaderboard page
│   │   ├── profile/page.tsx      # Profile page (title, badges, stats)
│   │   ├── not-found.tsx         # 404 → redirect to /
│   │   └── layout.tsx            # Root layout (Clerk, Navbar, Footer)
│   ├── components/
│   │   ├── Navbar.tsx            # Top nav with icon logo
│   │   ├── Footer.tsx            # Site footer with links
│   │   ├── SkillTree.tsx         # React Flow canvas
│   │   ├── SkillRadar.tsx        # Ghost mode radar chart
│   │   ├── PulseFeed.tsx         # Real-time activity feed (no caps)
│   │   ├── BadgeGrid.tsx         # Badge display (weekly + AI, rarity-sorted)
│   │   ├── LeaderboardTable.tsx  # Podium + rankings
│   │   ├── WeeklyAnnouncement.tsx # Weekly post-mortem renderer
│   │   └── ui/                   # shadcn/ui components
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── groq.ts           # PR analysis, categorization
│   │   │   ├── skillRadar.ts     # 5-axis aggregation
│   │   │   ├── ghost.ts          # Weekly snapshots
│   │   │   └── skillTreeGenerator.ts  # AI tree growth
│   │   ├── fetchers/
│   │   │   ├── github.ts         # GitHub REST + GraphQL hybrid (50 PRs)
│   │   │   ├── github-deepdive.ts # Full repository analysis
│   │   │   ├── leetcode.ts       # LeetCode GraphQL
│   │   │   ├── codeforces.ts     # Codeforces REST
│   │   │   ├── hackerrank.ts     # HackerRank scraper
│   │   │   └── tryhackme.ts      # TryHackMe API
│   │   ├── skilltree/
│   │   │   ├── definitions.ts    # Static fallback nodes
│   │   │   └── unlock.ts         # Unlock verification (incl. THM stats)
│   │   ├── xp/
│   │   │   └── normalize.ts      # XP scoring tables (all 5 platforms)
│   │   ├── pusher/
│   │   │   └── server.ts         # Server-side triggers
│   │   ├── discord.ts             # Discord webhook sender
│   │   └── prisma.ts              # Database client
│   └── middleware.ts              # Clerk auth middleware
├── .github/workflows/
│   ├── sync.yml                   # 6-hour cron
│   ├── badges.yml                 # Badge generation cron
│   ├── titles.yml                 # Title generation cron
│   └── weekly.yml                 # Sunday cron
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

---

## How The Sync Engine Works

```mermaid
sequenceDiagram
    participant GH as GitHub Actions
    participant API as /api/sync
    participant DB as Neon Postgres
    participant AI as Groq LLM
    participant PS as Pusher

    GH->>API: POST (CRON_SECRET)
    API->>DB: Get all users
    loop Each User
        API->>GitHub: Fetch commits, PRs (up to 50), diffs
        API->>AI: Analyze PR complexity
        AI-->>API: {xp, category, justification}
        API->>LeetCode: Fetch solved counts
        API->>Codeforces: Fetch rating & solved
        API->>HackerRank: Fetch badges
        API->>TryHackMe: Fetch points, rank, badges, rooms
        API->>API: Calculate total XP (never regress)
        API->>DB: Create activity logs (deduplicated)
        API->>DB: Update user stats
        API->>AI: Generate new skill tree nodes?
        AI-->>API: New personalized nodes
        API->>DB: Save dynamic nodes + check unlocks
        API->>API: Fire-and-forget: badge + title generation
        alt New unlock
            API->>DB: Create achievement
            API->>PS: Trigger milestone
        end
    end
    API-->>GH: {processedUsers, xpGained}
```

---

## Key Design Decisions

- **XP never regresses**: `Math.max(user.xp, user.xp + totalDeltaXP)` and per-platform stat guards
- **PRs use real timestamps**: Activity logs for PRs use `mergedAt`/`createdAt`, not sync time
- **AI badges accumulate forever**: No `deleteMany` - new badges are generated around existing ones
- **Weekly badges rotate**: Only `weekly_leaderboard` category badges are deleted each week
- **Past titles are archived**: Before regenerating, current title is saved to PastTitle with week/year
- **PR deduplication**: Uses `externalId` (PR URL) as unique constraint
- **Clerk ID → Prisma ID**: Client components pass `clerkId`, API routes resolve to database IDs
- **TryHackMe API**: Uses the public user profile endpoint for stats; gracefully returns zeros if unavailable
- **Pulse feed has no limits**: Returns all activity, achievements, and unlocked nodes sorted by time

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m "feat: add amazing feature"`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## License

[MIT](LICENSE)

---

<p align="center">
  <img src="/icon.svg" alt="Systemics" width="32" height="32"><br>
  Built with rage, caffeine, and Groq inference.<br>
  <strong>Don't let your friends out-grind you.</strong>
</p>