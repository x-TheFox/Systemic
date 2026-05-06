const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst({ where: { githubHandle: { equals: 'sharan112212', mode: 'insensitive' } }});
  console.log("=== USER DB ===");
  console.log(user);
  
  if (user) {
    const logs = await prisma.activityLog.findMany({ where: { userId: user.id }, take: 10, orderBy: { timestamp: 'desc' } });
    console.log("=== ACTIVITY LOGS ===");
    console.log(logs);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
