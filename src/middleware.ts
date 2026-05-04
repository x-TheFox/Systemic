import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/leaderboard',
  '/profile',
  '/pulse',
  '/duels',
  '/guilds',
  '/guilds/:slug',
  '/compare/:h1/:h2',
  '/sign-up(.*)',
  '/sign-in(.*)',
  '/sso-callback',
  '/api/webhooks/clerk',
  '/api/profile',
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
  '/api/og',
  '/api/streaks',
  '/api/challenges',
  '/api/duels(.*)',
  '/api/compare',
  '/api/guilds(.*)',
  '/api/projects',
  '/api/projects(.*)',
  '/api/v1(.*)',
  '/:handle',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
