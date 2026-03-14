import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get token from cookies
  const token = request.cookies.get('geon_token')?.value;
  const userRole = request.cookies.get('user_role')?.value?.toLowerCase(); 

  // Debug logging (remove in production)
  console.log('Proxy - Path:', pathname);
  console.log('Proxy - Token:', token ? 'Present' : 'Missing');
  console.log('Proxy - User Role:', userRole);

  // Route Classification
  const isAdminRoute = pathname.startsWith('/admin');
  const isBusinessRoute = pathname.startsWith('/business');
  const isClientRoute = pathname.startsWith('/client');
  
  // Shared routes that multiple roles can access
  const isVaultsRoute = pathname === '/vaults' || pathname.startsWith('/vaults/');
  const isWalletRoute = pathname === '/wallet' || pathname.startsWith('/wallet/');
  const isSupportRoute = pathname === '/support' || pathname.startsWith('/support/');
  const isSettingsRoute = pathname === '/settings' || pathname.startsWith('/settings/');
  
  const isAuthRoute = pathname.startsWith('/auth');
  
  // Public routes that don't require authentication
  const isPublicRoute = [
    '/', 
    '/privacy', 
    '/terms', 
    '/about', 
    '/pricing', 
    '/features'
  ].includes(pathname);

  // Dashboard Mapping based on role
  const homeDashboards: Record<string, string> = {
    admin: '/admin/dashboard',
    business: '/business/dashboard',
    influencer: '/client/dashboard',
    client: '/client/dashboard',
    brand: '/business/dashboard',
    enterprise: '/business/dashboard',
    operator: '/business/dashboard'
  };

  const userHome = homeDashboards[userRole as string] || '/client/dashboard';

  // --- AUTHENTICATION LOGIC ---

  // A. PUBLIC ROUTES - Always accessible
  if (isPublicRoute) {
    console.log('Proxy - Public route, allowing access');
    return NextResponse.next();
  }

  // B. AUTH ROUTES - If logged in, redirect to dashboard; if logged out, show auth pages
  if (isAuthRoute) {
    if (token) {
      // User is logged in - redirect to their dashboard
      console.log('Proxy - Auth route with token, redirecting to:', userHome);
      return NextResponse.redirect(new URL(userHome, request.url));
    }
    // User is logged out - allow access to auth pages
    console.log('Proxy - Auth route without token, allowing access');
    return NextResponse.next();
  }

  // C. PROTECTED ROUTES - Require authentication
  if (!token) {
    // No token - redirect to login
    console.log('Proxy - No token, redirecting to login');
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // D. SHARED ROUTES - Accessible by multiple roles
  if (isVaultsRoute || isWalletRoute || isSupportRoute || isSettingsRoute) {
    console.log('Proxy - Shared route, allowing access for role:', userRole);
    return NextResponse.next();
  }

  // E. ROLE-BASED ACCESS CONTROL
  if (token && userRole) {
    // Admin routes - only admin can access
    if (isAdminRoute && userRole !== 'admin') {
      console.log('Proxy - Non-admin trying to access admin route, redirecting to:', userHome);
      return NextResponse.redirect(new URL(userHome, request.url));
    }
    
    // Business routes - only business can access
    if (isBusinessRoute && !['business', 'brand', 'enterprise', 'operator'].includes(userRole)) {
      console.log('Proxy - Non-business trying to access business route, redirecting to:', userHome);
      return NextResponse.redirect(new URL(userHome, request.url));
    }

    // Client routes - only influencers/clients can access
    if (isClientRoute && !['influencer', 'client'].includes(userRole)) {
      console.log('Proxy - Non-client trying to access client route, redirecting to:', userHome);
      return NextResponse.redirect(new URL(userHome, request.url));
    }
  }

  // Allow the request to proceed
  console.log('Proxy - Allowing access to:', pathname);
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};