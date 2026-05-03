"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect Clerk auth routes
    const clerkRoutes = ['/sso-callback', '/sign-in', '/sign-up', '/sign-out', '/waitlist', '/accept-invitation'];
    if (clerkRoutes.some((r) => pathname.startsWith(r))) {
      return;
    }
    router.replace('/');
  }, [router, pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center text-white/40">
      <p>Page not found. Redirecting...</p>
    </div>
  );
}