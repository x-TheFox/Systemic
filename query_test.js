const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst({ where: { githubHandle: { equals: 'sharan112212', mode: 'insensitive' } }, select: { id: true, name: true, githubHandle: true, leetcodeHandle: true, xp: true, totalCommits: true, totalPRs: true, leetcodeEasy: true, leetcodeMedium: true, leetcodeHard: true, codeforcesRating: true, codeforcesSolved: true, hackerrankBadges: true, lastSyncedGitHub: true, lastSyncedLeetCode: true, lastSyncedCodeforces: true, lastSyncedHackerRank: true, updatedAt: true } });
  console.log("=== USER DB ===");
  console.log(JSON.stringify(user, null, 2));
  
  if (user) {
    const logs = await prisma.activityLog.findMany({ where: { userId: user.id }, take: 10, orderBy: { timestamp: 'desc' }, select: { platform: true, activityType: true, description: true, xpAwarded: true, timestamp: true }});
    console.log("=== ACTIVITY LOGS ===");
    console.log(JSON.stringify(logs, null, 2));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
