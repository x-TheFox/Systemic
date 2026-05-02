# API Documentation

All API routes in Systemics.

---

## Authentication

### Public Routes
- `/`
- `/leaderboard`
- `/api/leaderboard`
- `/api/skilltree`
- `/api/radar`
- `/api/ghost`
- `/api/webhooks/clerk`

### Protected Routes (Clerk)
- `/profile`
- `/api/profile`

### Cron Routes (Bearer Token)
- `/api/sync`
- `/api/weekly`

Requires header: `Authorization: Bearer <CRON_SECRET>`

---

## Sync Engine

### `POST /api/sync`

Triggers the 6-hour data sync. Fetches all platforms, awards XP, grows skill trees.

**Auth**: `Bearer <CRON_SECRET>`

**Response**:
```json
{
  "success": true,
  "processedUsers": 12,
  "results": [
    {
      "userId": "cl_xxx",
      "email": "user@example.com",
      "xpGained": 450,
      "activities": 8
    }
  ]
}
```

**What it does**:
1. Iterates all users
2. Fetches GitHub commits/PRs (with AI complexity analysis)
3. Fetches LeetCode solved counts
4. Fetches Codeforces rating/solved
5. Fetches HackerRank badges
6. Deduplicates by `externalId`
7. Calculates and increments XP
8. Generates new AI skill tree nodes
9. Checks node unlocks
10. Creates ghost snapshot (if weekly threshold met)
11. Triggers Pusher milestones

---

## Weekly Report

### `POST /api/weekly`

Generates the Sunday post-mortem report.

**Auth**: `Bearer <CRON_SECRET>`

**Response**:
```json
{
  "success": true,
  "postMortem": "## State of the Gang\n\nMVP: Alice...",
  "rankings": [
    { "id": "cl_xxx", "name": "Alice", "xpGained": 1200 }
  ]
}
```

**What it does**:
1. Aggregates last 7 days of activity logs
2. Calculates per-user XP and activity counts
3. Identifies MVP and Lurker
4. Calls Groq for AI-generated report
5. Stores report in database
6. Triggers Pusher event
7. Optionally posts to Discord webhook

---

## Skill Tree

### `GET /api/skilltree`

Returns the authenticated user's dynamic skill tree.

**Auth**: Clerk session (auto)

**Query Params** (optional):
- `userId`: specific user ID (falls back to authenticated user)

**Response**:
```json
{
  "nodes": [
    {
      "id": "core-junior-dev",
      "name": "Junior Dev",
      "description": "Welcome to the grind...",
      "path": "Core",
      "tier": 0,
      "position": { "x": 500, "y": 0 },
      "requirements": { "total_xp": 0 },
      "xpReward": 0,
      "status": "unlocked",
      "generatedBy": "system"
    }
  ],
  "edges": [
    { "id": "e-core-junior-dev-fw-dom-surgeon", "source": "core-junior-dev", "target": "fw-dom-surgeon" }
  ],
  "currentGrind": null
}
```

**Status values**:
- `unlocked`: Requirements met, XP awarded
- `available`: Parent nodes unlocked, can work toward it
- `locked`: Parent nodes not yet unlocked

---

## Skill Radar

### `GET /api/radar`

Returns 5-axis skill breakdown for the authenticated user.

**Auth**: Clerk session

**Query Params**:
- `userId`: specific user ID

**Response**:
```json
{
  "radar": [
    { "subject": "Frontend", "A": 120, "fullMark": 150 },
    { "subject": "Backend", "A": 98, "fullMark": 150 },
    { "subject": "DevOps", "A": 45, "fullMark": 150 },
    { "subject": "Architecture", "A": 70, "fullMark": 150 },
    { "subject": "Algo", "A": 135, "fullMark": 150 }
  ]
}
```

**Calculation**:
- Aggregates last 200 activity logs
- Categorizes by platform + keyword heuristics
- Normalizes highest value to 150

---

## Leaderboard

### `GET /api/leaderboard`

Returns global XP rankings.

**Auth**: Public

**Query Params**:
- `limit`: Max users (default 50)

**Response**:
```json
{
  "users": [
    {
      "id": "cl_xxx",
      "name": "Alice",
      "email": "alice@example.com",
      "imageUrl": null,
      "xp": 12400,
      "totalCommits": 340,
      "totalPRs": 45,
      "leetcodeEasy": 120,
      "leetcodeMedium": 80,
      "leetcodeHard": 25,
      "codeforcesRating": 1600,
      "codeforcesSolved": 150,
      "hackerrankBadges": 8,
      "skillTreeState": { "currentGrind": "Systems Engineer" }
    }
  ]
}
```

---

## Ghost Snapshots

### `GET /api/ghost`

Returns weekly ghost snapshots for historical comparison.

**Auth**: Public

**Query Params**:
- `userId`: required

**Response**:
```json
{
  "snapshots": [
    {
      "weekNumber": 18,
      "year": 2026,
      "totalXP": 10000,
      "skillBreakdown": { "Frontend": 100, "Backend": 80, "DevOps": 40, "Architecture": 60, "Algo": 120 },
      "createdAt": "2026-05-01T00:00:00Z"
    }
  ]
}
```

---

## User Profile

### `GET /api/profile`

Returns full profile for authenticated user.

**Auth**: Clerk session

**Response**:
```json
{
  "user": {
    "id": "cl_xxx",
    "name": "Alice",
    "email": "alice@example.com",
    "githubHandle": "alicecodes",
    "leetcodeHandle": "alice_lc",
    "codeforcesHandle": "alice_cf",
    "hackerrankHandle": "alice_hr",
    "xp": 12400,
    "totalCommits": 340,
    "totalPRs": 45,
    "leetcodeEasy": 120,
    "leetcodeMedium": 80,
    "leetcodeHard": 25,
    "codeforcesRating": 1600,
    "codeforcesSolved": 150,
    "hackerrankBadges": 8,
    "activityLogs": [...],
    "skillTreeState": { ... },
    "achievements": [...],
    "ghostSnapshots": [...]
  }
}
```

### `PUT /api/profile`

Updates profile fields.

**Auth**: Clerk session

**Body**:
```json
{
  "name": "Alice Smith",
  "githubHandle": "alicesmith",
  "leetcodeHandle": "alice_lc",
  "codeforcesHandle": "alice_cf",
  "hackerrankHandle": "alice_hr"
}
```

**Response**:
```json
{
  "success": true,
  "user": { ... }
}
```

---

## Clerk Webhooks

### `POST /api/webhooks/clerk`

Handles Clerk user lifecycle events.

**Auth**: Svix webhook signature verification

**Events**:
- `user.created`: Creates User + SkillTreeState in database
- `user.updated`: Updates name/email/imageUrl
- `user.deleted`: Removes user and cascades all data

**Note**: Do not call this manually. It's triggered by Clerk.

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Human-readable message"
}
```

**Status Codes**:
- `400`: Bad request (missing params)
- `401`: Unauthorized (invalid/missing auth)
- `403`: Forbidden (requirements not met)
- `404`: Not found
- `500`: Server error

---

## Rate Limits

- **Groq API**: Subject to Groq's free tier limits (~20 requests/minute)
- **GitHub GraphQL**: 5,000 points/hour
- **Codeforces API**: 1 request per 2 seconds (enforced in fetcher)
- **LeetCode GraphQL**: Unofficial, no documented limits
