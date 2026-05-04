-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "imageUrl" TEXT,
    "githubHandle" TEXT,
    "leetcodeHandle" TEXT,
    "hackerrankHandle" TEXT,
    "codeforcesHandle" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "totalCommits" INTEGER NOT NULL DEFAULT 0,
    "totalPRs" INTEGER NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "reviewComments" INTEGER NOT NULL DEFAULT 0,
    "leetcodeEasy" INTEGER NOT NULL DEFAULT 0,
    "leetcodeMedium" INTEGER NOT NULL DEFAULT 0,
    "leetcodeHard" INTEGER NOT NULL DEFAULT 0,
    "codeforcesRating" INTEGER NOT NULL DEFAULT 0,
    "codeforcesSolved" INTEGER NOT NULL DEFAULT 0,
    "hackerrankBadges" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "lastSyncedGitHub" TIMESTAMP(3),
    "lastSyncedLeetCode" TIMESTAMP(3),
    "lastSyncedCodeforces" TIMESTAMP(3),
    "lastSyncedHackerRank" TIMESTAMP(3),
    "lastBadgeCommitSync" TIMESTAMP(3),
    "lastGhostSnapshotAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "guildId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "description" TEXT,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "externalId" TEXT,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillTreeState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unlockedNodes" TEXT[],
    "currentGrind" TEXT,
    "progress" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillTreeState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicSkillNode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "positionX" INTEGER NOT NULL,
    "positionY" INTEGER NOT NULL,
    "requirements" JSONB NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "parentIds" TEXT[],
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DynamicSkillNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GhostSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalXP" INTEGER NOT NULL,
    "skillBreakdown" JSONB NOT NULL,
    "activityCounts" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GhostSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "mvpName" TEXT,
    "mvpUserId" TEXT,
    "mvpXp" INTEGER NOT NULL DEFAULT 0,
    "lurkerName" TEXT,
    "lurkerUserId" TEXT,
    "lurkerXp" INTEGER NOT NULL DEFAULT 0,
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "participants" INTEGER NOT NULL DEFAULT 0,
    "rankings" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastTitle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PastTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commits" TEXT[],
    "isFirst" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BadgeQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Duel" (
    "id" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "winnerId" TEXT,
    "challengerStartXP" INTEGER NOT NULL DEFAULT 0,
    "opponentStartXP" INTEGER NOT NULL DEFAULT 0,
    "challengerEndXP" INTEGER NOT NULL DEFAULT 0,
    "opponentEndXP" INTEGER NOT NULL DEFAULT 0,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Duel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "xpGained" INTEGER NOT NULL DEFAULT 0,
    "platforms" TEXT[],

    CONSTRAINT "DailyActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "xpReward" INTEGER NOT NULL DEFAULT 50,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "repoUrl" TEXT NOT NULL,
    "demoUrl" TEXT,
    "language" TEXT,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "forks" INTEGER NOT NULL DEFAULT 0,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "aiSummary" TEXT,
    "xpValue" INTEGER NOT NULL DEFAULT 0,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repoName" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildDuel" (
    "id" TEXT NOT NULL,
    "challengerGuildId" TEXT NOT NULL,
    "opponentGuildId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "winnerGuildId" TEXT,
    "challengerStartXP" INTEGER NOT NULL DEFAULT 0,
    "opponentStartXP" INTEGER NOT NULL DEFAULT 0,
    "challengerEndXP" INTEGER NOT NULL DEFAULT 0,
    "opponentEndXP" INTEGER NOT NULL DEFAULT 0,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildDuel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonatedKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'groq',
    "keyHash" TEXT NOT NULL,
    "keyCipher" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonatedKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildBadge" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_githubHandle_key" ON "User"("githubHandle");

-- CreateIndex
CREATE INDEX "User_xp_idx" ON "User"("xp");

-- CreateIndex
CREATE INDEX "User_clerkId_idx" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "User_guildId_idx" ON "User"("guildId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_platform_idx" ON "ActivityLog"("platform");

-- CreateIndex
CREATE INDEX "ActivityLog_timestamp_idx" ON "ActivityLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityLog_userId_externalId_key" ON "ActivityLog"("userId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillTreeState_userId_key" ON "SkillTreeState"("userId");

-- CreateIndex
CREATE INDEX "DynamicSkillNode_userId_idx" ON "DynamicSkillNode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DynamicSkillNode_userId_nodeId_key" ON "DynamicSkillNode"("userId", "nodeId");

-- CreateIndex
CREATE INDEX "GhostSnapshot_userId_idx" ON "GhostSnapshot"("userId");

-- CreateIndex
CREATE INDEX "GhostSnapshot_weekNumber_idx" ON "GhostSnapshot"("weekNumber");

-- CreateIndex
CREATE INDEX "GhostSnapshot_year_idx" ON "GhostSnapshot"("year");

-- CreateIndex
CREATE UNIQUE INDEX "GhostSnapshot_userId_weekNumber_year_key" ON "GhostSnapshot"("userId", "weekNumber", "year");

-- CreateIndex
CREATE INDEX "WeeklyReport_year_idx" ON "WeeklyReport"("year");

-- CreateIndex
CREATE INDEX "WeeklyReport_weekNumber_idx" ON "WeeklyReport"("weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_weekNumber_year_key" ON "WeeklyReport"("weekNumber", "year");

-- CreateIndex
CREATE INDEX "Badge_userId_idx" ON "Badge"("userId");

-- CreateIndex
CREATE INDEX "Badge_rarity_idx" ON "Badge"("rarity");

-- CreateIndex
CREATE INDEX "PastTitle_userId_idx" ON "PastTitle"("userId");

-- CreateIndex
CREATE INDEX "BadgeQueue_userId_idx" ON "BadgeQueue"("userId");

-- CreateIndex
CREATE INDEX "BadgeQueue_status_idx" ON "BadgeQueue"("status");

-- CreateIndex
CREATE INDEX "InboxMessage_userId_idx" ON "InboxMessage"("userId");

-- CreateIndex
CREATE INDEX "InboxMessage_read_idx" ON "InboxMessage"("read");

-- CreateIndex
CREATE INDEX "Duel_challengerId_idx" ON "Duel"("challengerId");

-- CreateIndex
CREATE INDEX "Duel_opponentId_idx" ON "Duel"("opponentId");

-- CreateIndex
CREATE INDEX "Duel_status_idx" ON "Duel"("status");

-- CreateIndex
CREATE INDEX "DailyActivity_userId_idx" ON "DailyActivity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyActivity_userId_date_key" ON "DailyActivity"("userId", "date");

-- CreateIndex
CREATE INDEX "DailyChallenge_userId_idx" ON "DailyChallenge"("userId");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "ProjectQueue_userId_idx" ON "ProjectQueue"("userId");

-- CreateIndex
CREATE INDEX "ProjectQueue_status_idx" ON "ProjectQueue"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_name_key" ON "Guild"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_slug_key" ON "Guild"("slug");

-- CreateIndex
CREATE INDEX "Guild_slug_idx" ON "Guild"("slug");

-- CreateIndex
CREATE INDEX "Guild_adminId_idx" ON "Guild"("adminId");

-- CreateIndex
CREATE INDEX "GuildDuel_challengerGuildId_idx" ON "GuildDuel"("challengerGuildId");

-- CreateIndex
CREATE INDEX "GuildDuel_opponentGuildId_idx" ON "GuildDuel"("opponentGuildId");

-- CreateIndex
CREATE INDEX "GuildDuel_status_idx" ON "GuildDuel"("status");

-- CreateIndex
CREATE INDEX "DonatedKey_userId_idx" ON "DonatedKey"("userId");

-- CreateIndex
CREATE INDEX "DonatedKey_provider_isActive_idx" ON "DonatedKey"("provider", "isActive");

-- CreateIndex
CREATE INDEX "GuildBadge_guildId_idx" ON "GuildBadge"("guildId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillTreeState" ADD CONSTRAINT "SkillTreeState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicSkillNode" ADD CONSTRAINT "DynamicSkillNode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GhostSnapshot" ADD CONSTRAINT "GhostSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastTitle" ADD CONSTRAINT "PastTitle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeQueue" ADD CONSTRAINT "BadgeQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyActivity" ADD CONSTRAINT "DailyActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChallenge" ADD CONSTRAINT "DailyChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectQueue" ADD CONSTRAINT "ProjectQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildDuel" ADD CONSTRAINT "GuildDuel_challengerGuildId_fkey" FOREIGN KEY ("challengerGuildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildDuel" ADD CONSTRAINT "GuildDuel_opponentGuildId_fkey" FOREIGN KEY ("opponentGuildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonatedKey" ADD CONSTRAINT "DonatedKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildBadge" ADD CONSTRAINT "GuildBadge_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
