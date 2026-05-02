# Systemics

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js 14">
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/Groq-AI-orange?logo=openai" alt="Groq AI">
  <img src="https://img.shields.io/badge/shadcn%2Fui-components-black?logo=react" alt="shadcn/ui">
</p>

<p align="center">
  <strong>An AI-augmented competitive leaderboard for developers.</strong><br>
  Track your grind across GitHub, LeetCode, Codeforces, and HackerRank — with a skill tree that grows with you.
</p>

---

## Features

### The Unified Data Engine
Automatically fetches your coding activity every 6 hours via GitHub Actions:

| Platform | Metrics Tracked | XP Source |
|---|---|---|
| **GitHub** | Commits, PRs, Language Distribution | Commits × 5 + AI-Scored PRs |
| **LeetCode** | Solved by Difficulty, Contest Rating | Easy 10 / Medium 25 / Hard 50 XP |
| **Codeforces** | Rating, Rank, Solved Problems | Problems × 15 + Rating Milestones |
| **HackerRank** | Badges, Certificates | Badges × 30 XP |

**Shadow Commits**: Groq LLM analyzes your PR diffs to score complexity (10-100 XP) instead of raw line counts. No more padding commits for leaderboard points.

### AI-Generated Skill Trees
Your tech tree isn't static — it's alive. The Ghost (our AI Architect) generates personalized skill nodes based on your actual activity:

- Grind LeetCode hards? → It spawns **"Kernel Whisperer"** and **"Concurrency Master"** nodes
- Ship frontend PRs? → It reveals **"React Artisan"** and **"DOM Surgeon"** paths
- Well-rounded? → It unlocks **"The Architect"** and leadership nodes

Each node has achievable-but-real requirements (1.5-3x your current stats) so there's always a next mountain to climb.

### AI Skill Radar
A 5-axis spider chart visualizing your true skills:
- **Frontend** · **Backend** · **DevOps** · **Architecture** · **Algo**

**Ghost Mode**: Toggle an overlay of your stats from last week to compete against your past self.

### The Pulse
Real-time milestone feed powered by Pusher:
- Rank-ups, node unlocks, achievements, XP milestones
- Watch your whole squad grind in real time

### Weekly Post-Mortem
Every Sunday night, The Ghost synthesizes the week's data into a brutal-but-funny "State of the Gang" report:
- MVP shoutout (highest XP earner)
- Lurker callout (lowest activity)
- Auto-posts to Discord webhook (optional)

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
    end

    subgraph "AI"
        L[Groq openai/gpt-oss-120b]
        M[PR Complexity Analysis]
        N[Dynamic Tree Generation]
        O[Weekly Post-Mortem]
    end

    subgraph "Data"
        P[Neon Postgres]
        Q[Prisma ORM v5]
    end

    A --> E
    A --> H
    A --> I
    A --> J
    A --> K
    F --> L
    F --> P
    G --> L
    G --> P
    H --> P
    I --> P
    J --> P
    K --> P
    L --> M
    L --> N
    L --> O
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
# Clone the repo
git clone https://github.com/your-org/systemics.git
cd systemics

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your real credentials

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

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
CLERK_WEBHOOK_SECRET=whsec_...

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

# Optional: Discord webhook for weekly reports
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## Deployment

### Vercel

1. Push to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com/dashboard)
3. Add all environment variables from `.env.example`
4. Deploy — the `output: 'standalone'` config is ready for production

### GitHub Actions Cron Jobs

After deployment, add these secrets to your GitHub repository:

- `VERCEL_URL`: Your production domain (e.g., `https://systemics.vercel.app`)
- `CRON_SECRET`: Same value as in your `.env`

The workflows run automatically:
- **Sync**: Every 6 hours (fetches platform data, awards XP, grows skill trees)
- **Weekly**: Every Sunday at 8pm UTC (generates post-mortem, Discord post)

---

## Project Structure

```
systemics/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── sync/          # 6-hour data sync engine
│   │   │   ├── weekly/        # Sunday post-mortem
│   │   │   ├── skilltree/     # Dynamic tree API
│   │   │   ├── radar/         # AI skill radar API
│   │   │   ├── leaderboard/   # Global rankings
│   │   │   ├── profile/       # User profile & handles
│   │   │   └── webhooks/clerk/# User provisioning
│   │   ├── page.tsx           # Dashboard
│   │   ├── leaderboard/
│   │   │   └── page.tsx       # Leaderboard page
│   │   ├── profile/
│   │   │   └── page.tsx       # Profile page
│   │   └── layout.tsx         # Root layout (Clerk, Theme)
│   ├── components/
│   │   ├── SkillTree.tsx      # React Flow canvas
│   │   ├── SkillRadar.tsx     # Ghost mode radar chart
│   │   ├── PulseFeed.tsx      # Real-time activity feed
│   │   └── LeaderboardTable.tsx
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── groq.ts        # PR analysis, categorization
│   │   │   ├── skillRadar.ts  # 5-axis aggregation
│   │   │   ├── ghost.ts       # Weekly snapshots
│   │   │   └── skillTreeGenerator.ts  # AI tree growth
│   │   ├── fetchers/
│   │   │   ├── github.ts      # GitHub GraphQL
│   │   │   ├── leetcode.ts    # LeetCode GraphQL
│   │   │   ├── codeforces.ts  # Codeforces REST
│   │   │   └── hackerrank.ts  # HackerRank scraper
│   │   ├── skilltree/
│   │   │   ├── definitions.ts # Static fallback nodes
│   │   │   └── unlock.ts      # Unlock verification
│   │   ├── xp/
│   │   │   └── normalize.ts   # XP scoring tables
│   │   ├── pusher/
│   │   │   └── server.ts      # Server-side triggers
│   │   └── prisma.ts          # Database client
│   └── middleware.ts          # Clerk auth middleware
├── .github/workflows/
│   ├── sync.yml               # 6-hour cron
│   └── weekly.yml             # Sunday cron
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
        API->>GitHub: Fetch commits, PRs, diffs
        API->>AI: Analyze PR complexity
        AI-->>API: {xp, category, justification}
        API->>LeetCode: Fetch solved counts
        API->>Codeforces: Fetch rating & solved
        API->>HackerRank: Fetch badges
        API->>API: Calculate total XP
        API->>DB: Create activity logs (deduplicated)
        API->>DB: Update user stats
        API->>AI: Generate new skill tree nodes?
        AI-->>API: New personalized nodes
        API->>DB: Save dynamic nodes
        API->>DB: Check unlocks
        alt New unlock
            API->>DB: Create achievement
            API->>PS: Trigger milestone
        end
    end
    API-->>GH: {processedUsers, xpGained}
```

---

## Customization

### Adding New XP Rules

Edit `src/lib/xp/normalize.ts`:

```typescript
const XP_TABLE = {
  LEETCODE: { EASY: 10, MEDIUM: 25, HARD: 50 },
  GITHUB: { COMMIT: 5, PR_SIMPLE: 20, PR_COMPLEX_BASE: 30 },
  // Add your custom rules here
};
```

### Adding New Platforms

1. Create a fetcher in `src/lib/fetchers/{platform}.ts`
2. Add to the sync engine in `src/app/api/sync/route.ts`
3. Add XP normalization in `src/lib/xp/normalize.ts`

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
  Built with rage, caffeine, and Groq inference.<br>
  <strong>Don't let your friends out-grind you.</strong>
</p>
