'use client';

import {
  LogOut,
  Menu,
  Shield,
  X,
  ChevronRight,
  User,
  Settings as SettingsIcon,
 } from 'lucide-react';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeProvider } from 'next-themes';

import GlobalToast from '@/components/GlobalToast';
import NotificationBell from '@/components/NotificationBell';
import { useNotificationStore } from '@/store/useNotificationStore';
import './globals.css';

/* =========================
   TYPES
========================= */

type UserRole = 'influencer' | 'business' | 'admin';

interface CurrentUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  rawRole: string;
}

/* =========================
   PUBLIC PAGES - No authentication needed
========================= */

const PUBLIC_PAGES = [
  '/',
  '/privacy',
  '/terms',
  '/about',
  '/pricing',
  '/features'
];

/* =========================
   NAVIGATION MAP
========================= */

const NAV_MAP: Record<UserRole, { label: string; href: string }[]> = {
  influencer: [
    { label: 'Dashboard', href: '/client/dashboard' },
    { label: 'Vaults', href: '/vaults' },
    { label: 'Explore', href: '/client/explore' },
    { label: 'Wallet', href: '/wallet' },
    { label: 'Support', href: '/support' },
  ],
  business: [
    { label: 'Overview', href: '/business/dashboard' },
    { label: 'Campaigns', href: '/vaults' },
    { label: 'Finances', href: '/wallet' },
    { label: 'Analytics', href: '/business/analytics' },
    { label: 'Support', href: '/support' },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin/dashboard' },
    { label: 'Revenue', href: '/wallet' },
    { label: 'Users', href: '/admin/users' },
    { label: 'System', href: '/admin/health' },
    { label: 'Audit', href: '/admin/audit' },
    { label: 'Disputes', href: '/support' },
  ]
};

// Custom Logo Component
const GeonLogo = () => (
  <div className="relative w-8 h-8 flex items-center justify-center">
    <div className="absolute inset-0 border-2 border-rose-500 rounded-lg opacity-20"></div>
    <div className="absolute inset-1 border border-rose-500 rounded-md opacity-40"></div>
    <span className="relative text-base font-bold text-rose-500">G</span>
    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
    <div className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
  </div>
);

/* =========================
   ROOT LAYOUT
========================= */

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans bg-gray-50 text-gray-900">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LayoutContent>{children}</LayoutContent>
          <GlobalToast />
        </ThemeProvider>
      </body>
    </html>
  );
}

/* =========================
   MAIN LAYOUT CONTENT
========================= */

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [isInitializing, setIsInitializing] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const { showToast, fetchUserNotifications, unreadCount } = useNotificationStore();

  // Check if current page is public (no auth needed)
  // Note: Auth routes are handled by middleware, but we also allow them here for client-side
  const isPublicPage = PUBLIC_PAGES.includes(pathname || '') || 
                       pathname?.startsWith('/auth/') || 
                       pathname?.startsWith('/_next') ||
                       pathname?.startsWith('/settings') ||
                       pathname?.startsWith('/terms') ||
                       pathname?.startsWith('/privacy');

  const handleLogout = useCallback(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    let domain = '';
    
    if (apiUrl) {
      try {
        const url = new URL(apiUrl);
        domain = url.hostname;
      } catch (e) {
        console.error('Invalid API URL:', e);
      }
    }
    
    if (!domain && typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      domain = hostname.includes('onrender.com') 
        ? '.onrender.com' 
        : hostname.includes('vercel.app')
        ? '.vercel.app'
        : hostname === 'localhost' 
        ? 'localhost'
        : hostname;
    }
    
    if (domain) {
      document.cookie = `geon_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${domain};`;
      document.cookie = `user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${domain};`;
      document.cookie = `setup_complete=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${domain};`;
    }
    
    document.cookie = "geon_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie = "setup_complete=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    
    localStorage.clear();
    sessionStorage.clear();
    
    setCurrentUser(null);
    showToast('You have been signed out', 'success');
    window.location.href = '/auth/login?t=' + Date.now();
  }, [showToast]);

  useEffect(() => {
    const checkAuth = async () => {
      // For auth pages, let middleware handle the redirect if needed
      if (pathname?.startsWith('/auth/')) {
        setIsInitializing(false);
        return;
      }

      if (isPublicPage) {
        setIsInitializing(false);
        return;
      }

      // Check both cookie and localStorage for authentication
      // Cookie check is more reliable as it's set by the server/login process
      const hasToken = document.cookie.includes('geon_token=');
      const stored = localStorage.getItem('geon_user');

      if (!hasToken || !stored) {
        // No authentication - let middleware handle redirect
        // But we can also redirect to login as a fallback
        router.push('/auth/login?t=' + Date.now());
        setIsInitializing(false);
        return;
      }

      try {
        const parsed = JSON.parse(stored);
        
        let role: UserRole = 'influencer';
        const raw = (parsed.role || '').toLowerCase();

        if (parsed.is_admin || raw === 'admin') role = 'admin';
        else if (['business', 'brand', 'enterprise', 'operator'].includes(raw)) role = 'business';

        const user: CurrentUser = {
          id: parsed.id || parsed.operator_id || '',
          fullName: parsed.full_name || 'User',
          email: parsed.email || '',
          role,
          rawRole: raw
        };

        setCurrentUser(user);
        
        if (user.id) {
          fetchUserNotifications(user.id);
        }
      } catch (error) {
        console.error('Failed to parse user data:', error);
        localStorage.removeItem('geon_user');
        router.push('/auth/login?t=' + Date.now());
      } finally {
        setIsInitializing(false);
      }
    };

    checkAuth();
  }, [pathname, isPublicPage, router, fetchUserNotifications]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 bg-rose-500 rounded-xl flex items-center justify-center text-white mx-auto mb-4 animate-pulse shadow-sm">
            <Shield size={24} />
          </div>
          <p className="text-sm text-gray-400">Loading GeonPayGuard...</p>
        </div>
      </div>
    );
  }

  if (isPublicPage || !currentUser) {
    return <>{children}</>;
  }

  const navItems = NAV_MAP[currentUser.role] || [];
  const currentPage = navItems.find(item => 
    pathname === item.href || pathname?.startsWith(item.href + '/')
  )?.label || 'Dashboard';

  const getRoleColor = (role: UserRole) => {
    switch(role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'business': return 'bg-rose-100 text-rose-700';
      default: return 'bg-blue-100 text-blue-600';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

          {/* Logo & Mobile Menu */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <Link href="/" className="flex items-center gap-2.5 group">
              <GeonLogo />
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-gray-900 leading-tight">
                  GEON<span className="font-light">PAYGUARD</span>
                </span>
                <span className="text-[8px] text-gray-400 leading-tight hidden sm:block">
                  Secure Payment Vaults
                </span>
              </div>
            </Link>
          </div>

          {/* Mobile Page Title */}
          <div className="lg:hidden flex items-center gap-1 text-sm text-gray-500">
            <span className="truncate max-w-[150px]">{currentPage}</span>
            <ChevronRight size={14} className="text-gray-300" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {navItems.map(item => {
              const active = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                    active
                      ? 'text-gray-900 bg-gray-100'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-2">

            {/* Notifications */}
            <div className="relative">
              <NotificationBell userId={currentUser.id} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] bg-rose-500 text-white rounded-full flex items-center justify-center ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>

            {/* Settings */}
            <Link
              href="/settings"
              className="hidden sm:flex p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              title="Settings"
            >
              <SettingsIcon size={18} />
            </Link>

            {/* User Menu - Desktop */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="h-6 w-px bg-gray-200" />
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-900">{currentUser.fullName}</p>
                  <p className={`text-[10px] px-2 py-0.5 rounded-full ${getRoleColor(currentUser.role)}`}>
                    {currentUser.role}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Sign out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>

            {/* Mobile Menu Toggle (hidden on desktop) */}
            <div className="sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-2 space-y-1">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition"
                >
                  {item.label}
                  <ChevronRight size={14} className="text-gray-400" />
                </Link>
              ))}
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition"
              >
                Settings
                <SettingsIcon size={14} className="text-gray-400" />
              </Link>
              <div className="border-t border-gray-100 my-2 pt-2">
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
                    <User size={14} className="text-rose-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{currentUser.fullName}</p>
                    <p className="text-xs text-gray-400">{currentUser.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                    title="Sign out"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-xs text-gray-400 text-center">
            © {new Date().getFullYear()} GeonPayGuard. All rights reserved. Secure payment vaults for creators and brands.
          </p>
        </div>
      </footer>
    </div>
  );
}