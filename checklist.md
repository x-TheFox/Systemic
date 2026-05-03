# Systemics v2 — Testing Checklist

Test each item and mark ✅ or ❌. Report any ❌ items with what you see.

---

## Foundation Fixes

- [ ] **Skill Tree Lines**: Go to Dashboard → scroll to "Tech-Tree Progression". Are there **white/glowing lines** connecting nodes? Is the root node "Code Initiate" spaced further from children?
- [ ] **Auto-Link GitHub**: Sign out and sign in with GitHub OAuth. Go to `/profile` — does it redirect to `/${yourGithubUsername}`? Is your GitHub handle auto-populated (no manual linking needed)?
- [ ] **No TryHackMe**: On any profile, confirm THM stats are gone. Leaderboard shows no THM columns.

---

## Profile URLs

- [ ] **Clean URL works**: Visit `https://systemic.app/x-thefox` (replace with your handle). Does it load your profile **without requiring sign-in**?
- [ ] **Case-insensitive**: Try `https://systemic.app/X-THEFOX` (all caps). Does it still find you?
- [ ] **Reserved handles blocked**: Try `https://systemic.app/leaderboard`. Does it show "not found" instead of treating it as a user?
- [ ] **Own profile shows edit button**: When signed in, visit your own `/${handle}`. Do you see **Edit**, **Sync Now**, **Deep Dive** buttons?
- [ ] **Others' profiles hide edit**: Visit another user's profile while signed in. Confirm **no edit/sync buttons** appear.

---

## OG Images (Social Sharing)

- [ ] **Default OG**: Visit `https://systemic.app/api/og`. Does it show a dark Systemics card with logo + tagline?
- [ ] **Profile OG**: Visit `https://systemic.app/api/og?handle=x-thefox` (your handle). Does it show your avatar, name, title, XP, and top 3 badges?
- [ ] **Meta tags**: View page source on your profile (`Ctrl+U`). Search for `og:image`. Does it contain `/api/og?handle=`?

---

## Inbox

- [ ] **Inbox icon**: Sign in. Is there a **mail icon** in the navbar with a red unread dot?
- [ ] **Duel request in inbox**: Have another user challenge you to a duel. Does a message appear in the inbox dropdown?
- [ ] **Mark read**: Click a message. Does the red dot disappear?

---

## Duels

- [ ] **Challenge button**: Visit another user's profile while signed in. Is there a **"Challenge to Duel"** button?
- [ ] **Send challenge**: Click it. Does the other user get an inbox notification?
- [ ] **Accept/decline**: The challenged user visits `/duels` → Pending tab. Can they **Accept** or **Decline**?
- [ ] **Active duels**: After accepting, does the duel show in the **Active** tab?
- [ ] **Duel badges**: After weekly report runs (Sunday 8pm), do winner/loser get duel badges (Duel Victor, Duelist, etc.)?

---

## Streaks & Heatmap

- [ ] **Heatmap visible**: On your profile, is there a **52-week grid** below Stats?
- [ ] **Heatmap colors**: After running a sync (Sync Now button), do some squares in the grid turn purple?
- [ ] **Streak counter**: Does it show "X-day streak" above the grid?
- [ ] **Streak badges**: After 3+ consecutive days of syncing, do you get streak badges (3-Day Spark, 7-Day Flame, etc.)?

> **Note**: Heatmap data is created during sync. If you haven't synced since v2 deployed, run **Sync Now** first.

---

## Compare Tool

- [ ] **Compare page**: Visit `/compare/x-thefox/sharan` (replace with real handles). Does it show side-by-side stats with green/red bars?
- [ ] **Shared badges**: If both users have common badges, does a "Shared Badges" section appear?
- [ ] **Challenge from compare**: Is there a **"Challenge to Duel"** button on the opponent's card?

---

## Global Pulse

- [ ] **Pulse page**: Visit `/pulse`. Does it show a full-page feed with filters (All, badge-earned, node-unlocked, etc.)?
- [ ] **Badge-earned events**: After earning a new badge, does a "badge-earned" event appear in Pulse?
- [ ] **Search/filter**: Can you filter by type and search by username?

---

## Guilds

- [ ] **Guild list**: Visit `/guilds`. Can you see a list of public guilds?
- [ ] **Create guild**: Click "Create Guild". Fill name/slug. Does it create successfully?
- [ ] **Guild page**: Visit `/guilds/your-guild-slug`. Does it show a leaderboard of members?
- [ ] **Join guild**: From `/guilds`, click Join on a public guild. Are you added?
- [ ] **Leave guild**: Can you leave? (If you're admin, does it delete the guild?)

---

## Code Review

- [ ] **Review stat on profile**: On your profile, does the Stats section show **"Reviews"** with a count?
- [ ] **Leaderboard reviews column**: Does the leaderboard show a Reviews column? *(not yet added to UI)*

---

## Projects

- [ ] **Projects section**: On your profile, is there a **"Projects"** section below the heatmap?
- [ ] **Auto-import message**: If no projects, does it say "No projects indexed yet. Run a sync to auto-import from GitHub."?
- [ ] **Project cards**: After sync + project queue processing, do project cards appear with language tags, stars, forks, and AI summary?

---

## Public Stats API

- [ ] **API works**: Visit `https://systemic.app/api/v1/users/x-thefox` (your handle). Does it return JSON with handle, name, title, xp, stats, badges?
- [ ] **CORS**: Can you fetch this from `curl` or a browser console without auth errors?

---

## Footer

- [ ] **Eden Corp link**: Scroll to bottom. Is "EdenCORP" in the footer a clickable link to `https://www.edencorp.org/`?

---

## Notes for Tester

1. **Heatmap needs sync first**: Run "Sync Now" on your profile to generate DailyActivity rows. The heatmap will be empty until then.
2. **Project showcase needs sync + queue processing**: Projects are auto-imported during sync via a queue. First sync queues repos, then a second sync (or manual queue processing) generates AI summaries.
3. **OG images may take time to cache**: First load of `/api/og?handle=...` might be slow (generates image). Subsequent loads are cached.
4. **Duel badges awarded on weekly report**: Duels resolve every Sunday at 8pm UTC when the weekly report runs.
