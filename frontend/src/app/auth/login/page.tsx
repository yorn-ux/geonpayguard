'use client';

import React, { useState, useEffect } from 'react';
import { 
   ArrowRight, Loader2, Mail, Lock, 
  Eye, EyeOff,  Home,
  Fingerprint, Key, Globe, AlertTriangle,
  CheckCircle, RefreshCw, UserCheck, XCircle,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotificationStore } from '@/store/useNotificationStore';

interface UserSession {
  id: string;
  full_name: string;
  operator_id: string;
  email: string;
  role: 'influencer' | 'business' | 'admin';
  wallet_address: string;
  is_verified: boolean;
  kyc_status: 'pending' | 'approved' | 'rejected' | 'not_submitted';
  setup_complete: boolean;
  login_timestamp: number;
}

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useNotificationStore();
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState<boolean>(false);
  const [pendingEmail, setPendingEmail] = useState<string>('');
  const [hasPartialRegistration, setHasPartialRegistration] = useState<boolean>(false);
  const [isResendingVerification, setIsResendingVerification] = useState<boolean>(false);
  const [verificationResent, setVerificationResent] = useState<boolean>(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Custom Logo Component
  const GeonLogo = () => (
    <div className="relative w-12 h-12 flex items-center justify-center mx-auto">
      <div className="absolute inset-0 border-2 border-rose-500 rounded-xl opacity-20"></div>
      <div className="absolute inset-1 border border-rose-500 rounded-lg opacity-40"></div>
      <span className="relative text-xl font-bold text-rose-500">G</span>
      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full"></div>
      <div className="absolute -bottom-0.5 -left-0.5 w-2 h-2 bg-emerald-500 rounded-full"></div>
    </div>
  );

  // Token expiration time (30 minutes in milliseconds)
  const TOKEN_EXPIRY = 30 * 60 * 1000;

  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const clearAuthData = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('geon_user');
    localStorage.removeItem('pending_registration');
    localStorage.removeItem('login_timestamp');
    document.cookie = 'geon_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'setup_complete=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'email_verified=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'login_timestamp=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
  };

  // Check token expiration
  const isTokenExpired = (loginTimestamp: number): boolean => {
    const now = Date.now();
    return now - loginTimestamp > TOKEN_EXPIRY;
  };

  // Setup activity listener to check token expiration
  useEffect(() => {
    const checkTokenExpiration = () => {
      const loginTimestamp = localStorage.getItem('login_timestamp');
      const token = localStorage.getItem('auth_token');
      
      if (token && loginTimestamp) {
        const timestamp = parseInt(loginTimestamp);
        if (isTokenExpired(timestamp)) {
          clearAuthData();
          showToast('Session expired. Please login again.', 'info');
          router.push('/auth/login');
        }
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, checkTokenExpiration);
    });

    const interval = setInterval(checkTokenExpiration, 60000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, checkTokenExpiration);
      });
      clearInterval(interval);
    };
  }, [router, showToast]);

  // Check for existing session on mount
  useEffect(() => {
    const validateExistingSession = async () => {
      const token = localStorage.getItem('auth_token') || getCookie('geon_token');
      const savedUser = localStorage.getItem('geon_user');
      const loginTimestamp = localStorage.getItem('login_timestamp');
      
      if (!token || !savedUser) {
        clearAuthData();
        return;
      }

      if (loginTimestamp) {
        const timestamp = parseInt(loginTimestamp);
        if (isTokenExpired(timestamp)) {
          clearAuthData();
          showToast('Session expired. Please login again.', 'info');
          return;
        }
      }

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${API_URL}/api/v1/auth/verify`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          const user = JSON.parse(savedUser) as UserSession;
          
          if (!data.is_verified) {
            clearAuthData();
            setError('Your email verification has expired. Please login again.');
            return;
          }

          const target = user.role === 'admin' 
            ? '/admin/dashboard' 
            : user.role === 'business' 
              ? '/business/dashboard' 
              : '/client/dashboard';
          
          // INSTANT redirect - no delay
          router.replace(target);
        } else {
          clearAuthData();
        }
      } catch (e) {
        clearAuthData();
      }
    };

    validateExistingSession();

    const pendingRegistration = localStorage.getItem('pending_registration');
    if (pendingRegistration) {
      try {
        const pending = JSON.parse(pendingRegistration);
        if (pending.email && !pending.verified) {
          setPendingEmail(pending.email);
          setHasPartialRegistration(true);
        }
      } catch (e) {
        localStorage.removeItem('pending_registration');
      }
    }
  }, [router, showToast]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setShowVerificationPrompt(false);
    setVerificationResent(false);

    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Email and password are required');
      setIsLoading(false);
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid email or password');
        }
        
        if (response.status === 403) {
          if (data.code === 'email_not_verified' || data.detail?.toLowerCase().includes('verify your email')) {
            setPendingEmail(formData.email.trim().toLowerCase());
            setShowVerificationPrompt(true);
            
            localStorage.setItem('pending_registration', JSON.stringify({
              email: formData.email.trim().toLowerCase(),
              verified: false,
              timestamp: Date.now()
            }));
            
            throw new Error('Please verify your email address before logging in');
          }
          
          if (data.code === 'account_locked') {
            throw new Error('Your account has been locked. Please contact support.');
          }
          
          if (data.code === 'account_disabled') {
            throw new Error('Your account has been disabled. Please contact support.');
          }
        }
        
        if (response.status === 429) {
          throw new Error('Too many login attempts. Please try again later.');
        }
        
        throw new Error(data.detail || data.message || 'Login failed. Please try again.');
      }

      if (!data.access_token || !data.user) {
        throw new Error('Invalid response from server');
      }

      localStorage.removeItem('pending_registration');
      
      const rawRole = (data.user.role || '').toLowerCase();
      let resolvedRole: 'influencer' | 'business' | 'admin' = 'influencer';
      
      if (rawRole === 'admin') {
        resolvedRole = 'admin';
      } else if (['business', 'brand', 'enterprise', 'agency'].includes(rawRole)) {
        resolvedRole = 'business';
      }

      const loginTimestamp = Date.now();

      const sessionData: UserSession = {
        id: data.user.id,
        full_name: data.user.full_name || data.user.name || 'User',
        operator_id: data.user.operator_id,
        email: data.user.email,
        role: resolvedRole,
        wallet_address: data.user.wallet_address || '',
        is_verified: data.user.is_verified || false,
        kyc_status: data.user.kyc_status || 'not_submitted',
        setup_complete: data.user.setup_complete || false,
        login_timestamp: loginTimestamp
      };

      // STORE SESSION DATA - critical for dashboard access
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('geon_user', JSON.stringify(sessionData));
      localStorage.setItem('login_timestamp', loginTimestamp.toString());
      
      const maxAge = 1800;
      const cookieBase = `path=/; max-age=${maxAge}; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'secure' : ''}`;
      
      document.cookie = `geon_token=${data.access_token}; ${cookieBase}`;
      document.cookie = `user_role=${resolvedRole}; ${cookieBase}`;
      document.cookie = `email_verified=true; ${cookieBase}`;
      document.cookie = `setup_complete=${sessionData.setup_complete}; ${cookieBase}`;
      document.cookie = `login_timestamp=${loginTimestamp}; ${cookieBase}`;

      // Optional: Show toast but don't delay redirect
      showToast(`Welcome back, ${sessionData.full_name}!`, "success");

      // DETERMINE DASHBOARD PATH
      let entryPath = '/client/dashboard';
      
      if (resolvedRole === 'admin') {
        entryPath = '/admin/dashboard';
      } else if (resolvedRole === 'business') {
        entryPath = '/business/dashboard';
      } else {
        entryPath = '/client/dashboard';
      }
      
      // INSTANT REDIRECT - no setTimeout, no delays
      // router.replace is instant (milliseconds)
      router.replace(entryPath);
      
    } catch (err: any) {
      const msg = err.message || 'Unable to log in. Please try again.';
      setError(msg);
      showToast(msg, "error");
      setIsLoading(false);
    }
    // Note: isLoading is NOT set to false on success because we redirect immediately
  };

  const handleResendVerification = async () => {
    if (!pendingEmail) return;
    
    setIsResendingVerification(true);
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_URL}/api/v1/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setVerificationResent(true);
        showToast('Verification email sent! Please check your inbox.', 'success');
        
        setTimeout(() => {
          setVerificationResent(false);
        }, 5000);
      } else {
        showToast(data.detail || 'Failed to send verification email', 'error');
      }
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleContinueRegistration = () => {
    if (pendingEmail) {
      sessionStorage.setItem('skip_to_verification', 'true');
      router.replace(`/auth/register?email=${encodeURIComponent(pendingEmail)}&step=verify`);
    } else {
      router.replace('/auth/register');
    }
  };

  const handleClearPending = () => {
    localStorage.removeItem('pending_registration');
    setHasPartialRegistration(false);
    setPendingEmail('');
    setShowVerificationPrompt(false);
  };

  const inputClasses = "w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none text-sm text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-500";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Navigation */}
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-all text-sm group">
            <Home size={16} className="group-hover:-translate-x-0.5 transition-transform" /> 
            <span>Back to Home</span>
          </Link>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-gray-600">Geon PayGuard</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8">
            <div className="mb-8 text-center">
              <GeonLogo />
              <h1 className="text-2xl font-bold text-gray-900 mt-4">Welcome Back</h1>
              <p className="text-sm text-gray-500 mt-1">Sign in to access your financial dashboard</p>
              
              {/* Session timeout indicator */}
              <div className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-400">
                <Zap size={12} className="text-rose-500" />
                <span>Lightning fast • Session expires after 30 mins</span>
              </div>
            </div>

            {/* Error Display */}
            {error && !showVerificationPrompt && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                <div className="shrink-0">
                  <XCircle className="text-rose-600" size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-rose-700 text-sm font-medium">{error}</p>
                  <p className="text-rose-600 text-xs mt-1">Please check your credentials and try again</p>
                </div>
              </div>
            )}

            {/* Verification Prompt */}
            {showVerificationPrompt && (
              <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="shrink-0">
                    <AlertTriangle className="text-amber-600" size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-800">Email Not Verified</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Please verify your email address before logging in.
                    </p>
                    
                    {hasPartialRegistration && (
                      <div className="mt-3 p-3 bg-amber-100/50 rounded-lg border border-amber-200">
                        <p className="text-xs text-amber-800 flex items-center gap-1.5">
                          <UserCheck size={14} />
                          <span className="font-medium">Incomplete registration found for:</span>
                        </p>
                        <p className="text-sm font-mono text-amber-900 mt-1">{pendingEmail}</p>
                      </div>
                    )}
                    
                    {verificationResent && (
                      <div className="mt-3 p-2 bg-emerald-100 rounded-lg flex items-center gap-2">
                        <CheckCircle size={14} className="text-emerald-600" />
                        <p className="text-xs text-emerald-700">Verification email sent! Check your inbox.</p>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        onClick={handleResendVerification}
                        disabled={isResendingVerification}
                        className="flex items-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50"
                      >
                        {isResendingVerification ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <RefreshCw size={14} />
                        )}
                        Resend Verification
                      </button>
                      <button
                        onClick={handleContinueRegistration}
                        className="text-xs border border-amber-300 hover:bg-amber-100 text-amber-800 px-4 py-2 rounded-lg transition-colors font-medium"
                      >
                        Continue Registration →
                      </button>
                      <button
                        onClick={handleClearPending}
                        className="text-xs text-amber-700 hover:text-amber-800 px-3 py-2"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="email" 
                    required 
                    placeholder="you@example.com"
                    className={inputClasses}
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-semibold text-gray-700">Password</label>
                  <Link 
                    href="/auth/recover" 
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    placeholder="Enter your password"
                    className={inputClasses}
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                    disabled={isLoading}
                  />
                  <span className="text-xs text-gray-600">Remember me (30 min session)</span>
                </label>
                
                <div className="text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Lock size={12} />
                    Encrypted
                  </span>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl text-sm font-medium transition-all flex justify-center items-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> 
                    Verifying credentials...
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link 
                  href="/auth/register" 
                  className="text-rose-600 font-semibold hover:text-rose-700 hover:underline"
                >
                  Create free account
                </Link>
              </p>
            </div>

            {/* Security Notice */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-center gap-2">
              <Zap size={14} className="text-rose-500" />
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">Instant access</span> • Dashboard loads in milliseconds
              </p>
            </div>
          </div>
        </div>
        
        {/* Trust Indicators */}
        <div className="mt-8 flex items-center justify-center gap-8 text-gray-400">
          <div className="flex items-center gap-1.5">
            <Fingerprint size={14} />
            <span className="text-xs">Biometric Ready</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Key size={14} />
            <span className="text-xs">2FA Support</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe size={14} />
            <span className="text-xs">24/7 Access</span>
          </div>
        </div>

        {/* Support Link */}
        <div className="mt-6 text-center">
          <Link 
            href="/support" 
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Need help? Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}