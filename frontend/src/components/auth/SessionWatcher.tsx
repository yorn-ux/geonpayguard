'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export const SessionWatcher = () => {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkSession = () => {
      const isProtectedRoute = 
        pathname?.startsWith('/client') || 
        pathname?.startsWith('/business') || 
        pathname?.startsWith('/admin');

      const sessionData = sessionStorage.getItem('geon_session');
      const hasToken = document.cookie.includes('geon_token=');

      // 1. If in a protected route but session is missing, go to login
      if (isProtectedRoute && !sessionData) {
        window.location.href = '/auth/login';
        return;
      }

      // 2. If token is deleted manually, kill session and go to login
      if (isProtectedRoute && !hasToken) {
        sessionStorage.removeItem('geon_session');
        window.location.href = '/auth/login';
        return;
      }

      // 3. REMOVED STICKINESS: Auto-Redirect to Dashboard if session exists
      // We no longer check for setup_complete here.
      if ((pathname === '/auth/login' || pathname === '/auth/register') && sessionData) {
        try {
          const { user } = JSON.parse(sessionData);
          if (user && user.role) {
            const role = user.role.toLowerCase();
            // Map influencer role to client folder if necessary
            const targetFolder = role === 'influencer' ? 'client' : role;
            router.push(`/${targetFolder}/dashboard`);
          }
        } catch (e) {
          console.error("Session parse error", e);
          sessionStorage.removeItem('geon_session');
        }
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 3000);
    return () => clearInterval(interval);
  }, [pathname, router]);

  return null;
};