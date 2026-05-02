import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/leaderboard',
  '/api/webhooks/clerk',
  '/api/leaderboard',
  '/api/skilltree',
  '/api/radar',
  '/api/ghost',
  '/api/sync',
  '/api/weekly',
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) auth().protect();
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};