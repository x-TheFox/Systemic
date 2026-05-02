# Setup Guide

Complete step-by-step instructions to get Systemics running locally and in production.

---

## Prerequisites

- **Node.js** 18+ (check with `node --version`)
- **npm** or **pnpm**
- A **Neon Postgres** database (free tier is fine)
- Accounts on:
  - [Clerk](https://dashboard.clerk.com/) (authentication)
  - [Groq](https://console.groq.com/) (AI)
  - [Pusher](https://dashboard.pusher.com/) (real-time)
  - [GitHub](https://github.com/settings/tokens) (personal access token)

---

## Step 1: Clone and Install

```bash
git clone https://github.com/your-org/systemics.git
cd systemics

# Install dependencies
npm install

# Verify Prisma CLI is available
npx prisma --version
# Should show v5.x.x
```

---

## Step 2: Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your real values. See below for how to get each one.

### Required Variables

#### Database (Neon Postgres)

1. Go to [Neon](https://neon.tech/) and create a project
2. Copy the connection string:
   - **Pooled connection** (for app): `DATABASE_URL`
   - **Direct connection** (for migrations): `DIRECT_URL`

```bash
DATABASE_URL="postgresql://user:pass@host-pooler.neon.tech/db?sslmode=require"
DIRECT_URL="postgresql://user:pass@host.neon.tech/db?sslmode=require"
```

> **Why two URLs?** Neon uses connection pooling for serverless functions (Vercel). Prisma Migrate needs a direct connection.

#### Clerk Authentication

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create an application
3. Enable **GitHub** and **Discord** OAuth providers in Authentication → Social Connections
4. Copy keys from API Keys:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

5. Add webhook endpoint:
   - Go to Webhooks → Add Endpoint
   - URL: `https://your-app.vercel.app/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
   - Copy the **Signing Secret**:

```bash
CLERK_WEBHOOK_SECRET=whsec_...
```

> **Local testing**: Use [ngrok](https://ngrok.com/) to expose localhost for webhooks.

#### Groq AI

1. Go to [Groq Console](https://console.groq.com/)
2. Create an API key
3. Copy it:

```bash
GROQ_API_KEY=gsk_...
```

> Groq offers free tier with generous rate limits. `llama3-70b-8192` is used for all AI features.

#### Pusher (Real-Time)

1. Go to [Pusher Dashboard](https://dashboard.pusher.com/)
2. Create a Channels app
3. Copy keys from App Keys:

```bash
NEXT_PUBLIC_PUSHER_KEY=your-key
PUSHER_SECRET=your-secret
PUSHER_APP_ID=your-app-id
NEXT_PUBLIC_PUSHER_CLUSTER=us2
```

> The client needs `NEXT_PUBLIC_PUSHER_KEY` and `NEXT_PUBLIC_PUSHER_CLUSTER`. The server uses the rest.

#### GitHub Token

1. Go to GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
2. Generate new token with scopes:
   - `read:user`
   - `read:repo`
   - `repo` (for private repo access, optional)

```bash
GITHUB_TOKEN=ghp_...
```

#### Security Secret

Generate a random string for cron job authentication:

```bash
# On macOS/Linux
openssl rand -base64 32
```

```bash
CRON_SECRET=your-random-secret-here
```

### Optional Variables

```bash
# Discord webhook for weekly reports
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## Step 3: Database Setup

### Generate Prisma Client

```bash
npx prisma generate
```

### Run Migrations

```bash
npx prisma migrate dev --name init
```

This creates all tables: `User`, `ActivityLog`, `SkillTreeState`, `DynamicSkillNode`, `Achievement`, `GhostSnapshot`.

### Verify Connection

```bash
npx prisma studio
```

Opens Prisma Studio at `http://localhost:5555`. You should see empty tables.

---

## Step 4: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### First-Time User Flow

1. Click **Sign In**
2. Use GitHub or Discord OAuth
3. Clerk creates your user via webhook
4. You'll land on the dashboard with empty stats
5. Go to **Profile** → link your platform handles

---

## Step 5: Test the Sync Engine

Without waiting for GitHub Actions, trigger a sync manually:

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

Or use the **"Sync Now"** button on your Profile page.

---

## Step 6: Configure GitHub Actions (Production)

After deploying to Vercel, add these secrets to your GitHub repository:

1. Go to Settings → Secrets and variables → Actions
2. Add:
   - `VERCEL_URL`: `https://your-app.vercel.app`
   - `CRON_SECRET`: Same value as in `.env`

The workflows will now run automatically:
- **Sync**: Every 6 hours
- **Weekly**: Every Sunday at 8pm UTC

You can also trigger them manually:
- Go to Actions tab → select workflow → **Run workflow**

---

## Troubleshooting

### Build Errors

**"PrismaClient needs to be constructed..."**
- Run `npx prisma generate`
- Ensure `DATABASE_URL` is set

**"Cannot find module '@prisma/client'"**
- Run `npm install` then `npx prisma generate`

### Database Errors

**"P1001: Can't reach database server"**
- Check `DATABASE_URL` is correct
- Ensure SSL is enabled (`?sslmode=require`)

**"P3005: The database schema is not empty"**
- Run `npx prisma migrate reset` (WARNING: deletes data)
- Or use `npx prisma db push` for prototyping

### Auth Errors

**"Unauthorized" on profile page**
- Check Clerk keys are correct
- Ensure middleware is running (`src/middleware.ts`)

**Webhook not firing**
- Verify webhook URL is accessible (use ngrok for local)
- Check `CLERK_WEBHOOK_SECRET` matches Clerk dashboard

### Sync Errors

**"Sync failed" button**
- Check `CRON_SECRET` is set in environment
- Verify at least one platform handle is linked

**No XP gained after sync**
- Check browser console for API errors
- Verify GitHub token has correct scopes
- Check LeetCode handle is public

### Pusher Errors

**"Waiting for gang activity..." forever**
- Check `NEXT_PUBLIC_PUSHER_KEY` is set
- Verify Pusher app exists and cluster matches
- Check browser console for connection errors

---

## Development Tips

### Reset Everything

```bash
# Reset database
npx prisma migrate reset

# Clear Next.js cache
rm -rf .next

# Reinstall
rm -rf node_modules
npm install
npx prisma generate
```

### Adding a New Platform

1. Create fetcher: `src/lib/fetchers/newplatform.ts`
2. Add XP rules: `src/lib/xp/normalize.ts`
3. Add to sync: `src/app/api/sync/route.ts`
4. Add field to User model: `prisma/schema.prisma`
5. Run migration: `npx prisma migrate dev --name add_newplatform`

### Testing Groq Locally

```bash
# Test PR analysis
curl -X POST http://localhost:3000/api/sync \
  -H "Authorization: Bearer $CRON_SECRET"
```

Watch server logs for Groq responses.

---

## Production Checklist

- [ ] `.env` is in `.gitignore` (never commit secrets)
- [ ] `DATABASE_URL` uses pooled connection
- [ ] `DIRECT_URL` uses direct connection
- [ ] Clerk webhook is configured and verified
- [ ] GitHub Actions secrets (`VERCEL_URL`, `CRON_SECRET`) are set
- [ ] Pusher app is in production mode (not sandbox)
- [ ] `next.config.mjs` has `output: 'standalone'`
- [ ] Database migrations are run on production
- [ ] GitHub token has sufficient rate limits
