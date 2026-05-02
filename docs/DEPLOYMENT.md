# Deployment Guide

Deploying Systemics to production.

---

## Platform: Vercel

### Step 1: Prepare Repository

Ensure your repo is on GitHub and the `feature/full-implementation` branch is ready.

```bash
git push origin feature/full-implementation
```

### Step 2: Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Select the project

### Step 3: Configure Project

**Framework Preset**: Next.js

**Build Command**: `npm run build`

**Output Directory**: `.next` (auto-detected)

**Root Directory**: `./` (default)

### Step 4: Environment Variables

Add all variables from `.env.example`:

| Variable | Value | Secret? |
|---|---|---|
| `DATABASE_URL` | Neon pooled connection | Yes |
| `DIRECT_URL` | Neon direct connection | Yes |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | No |
| `CLERK_SECRET_KEY` | Clerk secret key | Yes |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret | Yes |
| `GROQ_API_KEY` | Groq API key | Yes |
| `NEXT_PUBLIC_PUSHER_KEY` | Pusher app key | No |
| `PUSHER_SECRET` | Pusher app secret | Yes |
| `PUSHER_APP_ID` | Pusher app ID | Yes |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Pusher cluster | No |
| `GITHUB_TOKEN` | GitHub PAT | Yes |
| `CRON_SECRET` | Random cron auth string | Yes |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL | Yes |

> **Secret?** = Yes means the value won't be exposed to the client bundle.

### Step 5: Database Migration

After first deploy, run migrations on production database:

```bash
# Set production DATABASE_URL locally
export DATABASE_URL="your-production-pooled-url"
export DIRECT_URL="your-production-direct-url"

npx prisma migrate deploy
```

Or use Vercel CLI:

```bash
vercel --prod
# Then run migration via Vercel's shell or local with prod URL
```

### Step 6: Configure Clerk Webhook

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Navigate to Webhooks
3. Add endpoint: `https://your-app.vercel.app/api/webhooks/clerk`
4. Select events: `user.created`, `user.updated`, `user.deleted`
5. Copy the Signing Secret to Vercel env vars as `CLERK_WEBHOOK_SECRET`

### Step 7: Configure GitHub Actions

Add these secrets to your GitHub repository:

1. Go to Settings → Secrets and variables → Actions
2. Click **New repository secret**
3. Add:
   - `VERCEL_URL`: `https://your-app.vercel.app`
   - `CRON_SECRET`: Same value as in Vercel env vars

### Step 8: Verify Deployment

1. Visit `https://your-app.vercel.app`
2. Sign in with Clerk
3. Go to Profile, link platform handles
4. Click **Sync Now**
5. Check dashboard for populated data

---

## Alternative: Self-Hosted

You can also deploy on any platform supporting Node.js 18+.

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t systemics .
docker run -p 3000:3000 --env-file .env systemics
```

### Railway / Render / Fly.io

1. Connect your GitHub repo
2. Add environment variables from `.env`
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Run `npx prisma migrate deploy` as a pre-deploy hook

---

## Post-Deployment Checklist

- [ ] App loads at production URL
- [ ] Sign up creates user in database
- [ ] Profile page shows editable handles
- [ ] Sync Now button works and returns success
- [ ] Leaderboard shows ranked users
- [ ] Skill tree renders with nodes
- [ ] Pulse Feed shows activity (after sync)
- [ ] GitHub Actions workflows run without errors
- [ ] Weekly report generates on schedule
- [ ] Discord webhook receives reports (if configured)

---

## Monitoring

### Vercel Analytics

Enable in Vercel Dashboard for:
- Web Vitals
- Traffic insights
- Error tracking

### Database Monitoring

Neon Dashboard shows:
- Connection count
- Query performance
- Storage usage

### Groq Usage

Monitor at [console.groq.com](https://console.groq.com/):
- Request volume
- Token usage
- Rate limit status

### Pusher Debug

Enable debug mode in Pusher dashboard to see:
- Connection count
- Message volume
- Errors

---

## Rollback

If deployment breaks:

1. **Vercel**: Revert to previous deployment in dashboard
2. **Database**: Rollback migration: `npx prisma migrate resolve --rolled-back <name>`
3. **Code**: `git revert HEAD` and redeploy

---

## Custom Domain

1. Buy domain or use existing
2. In Vercel Dashboard → Domains
3. Add domain and follow DNS instructions
4. Update `VERCEL_URL` in GitHub Actions secrets
5. Update Clerk webhook URL to custom domain
