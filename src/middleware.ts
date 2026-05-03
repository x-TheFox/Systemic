import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/leaderboard',
  '/profile',
  '/pulse',
  '/guilds(.*)',
  '/compare(.*)',
  '/sign-up(.*)',
  '/sign-in(.*)',
  '/sso-callback',
  '/api/webhooks/clerk',
  '/api/leaderboard',
  '/api/skilltree',
  '/api/radar',
  '/api/ghost',
  '/api/sync',
  '/api/weekly',
  '/api/weekly/latest',
  '/api/deepdive',
  '/api/pulse',
  '/api/badges',
  '/api/badges/process-queue',
  '/api/title',
  '/api/og(.*)',
  '/api/streaks',
  '/api/challenges',
  '/api/duels(.*)',
  '/api/compare',
  '/api/guilds(.*)',
  '/api/projects',
  '/api/v1(.*)',
  '/(?!_next|api|static|.*\\..*).+', // Allow all dynamic routes like /[handle]
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) auth().protect();
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
