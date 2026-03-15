'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, Loader2, Mail, Lock, 
  Eye, EyeOff, Home, Fingerprint, Key, 
  Globe, AlertTriangle, CheckCircle, RefreshCw, 
  UserCheck, XCircle, Zap, Shield, Gem,
  BadgeCheck, LockKeyhole, Clock,
  ChevronRight, Building2, Users
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
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Professional Logo Component - Matches RootLayout
  const GeonLogo = () => (
    <div className="relative flex items-center justify-center group">
      {/* Logo Mark */}
      <div className="relative w-16 h-16">
        {/* Background Shield */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl rotate-6 group-hover:rotate-12 transition-all duration-500 shadow-xl" />
        
        {/* Inner Geometric Pattern */}
        <div className="absolute inset-[3px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl rotate-6 group-hover:rotate-12 transition-all duration-500" />
        
        {/* Gold Accent Lines */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-0.5 bg-amber-400/60 rounded-full rotate-45 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <div className="w-6 h-0.5 bg-amber-400/60 rounded-full -rotate-45 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        
        {/* Central Gem */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Gem size={24} className="text-amber-400 group-hover:text-amber-300 transition-colors animate-pulse" strokeWidth={1.5} />
        </div>
        
        {/* Security Verification Dots */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse shadow-lg" />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse delay-150 shadow-lg" />
      </div>

      {/* Text Mark - Hidden on mobile, visible on desktop */}
      <div className="hidden sm:block ml-3 text-left">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black tracking-tight text-slate-900">GEON</span>
          <BadgeCheck size={16} className="text-emerald-500" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">PayGuard</span>
          <span className="text-[8px] font-medium text-amber-500/70 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200/50">
            SECURE
          </span>
        </div>
      </div>
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

      // STORE SESSION DATA
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
      
      router.replace(entryPath);
      
    } catch (err: any) {
      const msg = err.message || 'Unable to log in. Please try again.';
      setError(msg);
      showToast(msg, "error");
      setIsLoading(false);
    }
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

  const inputClasses = (fieldName: string) => 
    `w-full pl-12 pr-12 py-4 bg-white border rounded-xl focus:outline-none transition-all duration-200 text-sm text-slate-900 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500 ${
      focusedField === fieldName 
        ? 'border-amber-500 ring-4 ring-amber-500/10' 
        : error && !formData[fieldName as keyof typeof formData]
        ? 'border-rose-300 bg-rose-50/30'
        : 'border-slate-200 hover:border-slate-300'
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Navigation */}
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="group flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-all text-sm">
            <Home size={16} className="group-hover:-translate-x-0.5 transition-transform" /> 
            <span className="text-xs font-medium">Back to Home</span>
          </Link>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-600">Secure Portal</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Top Gradient Bar */}
          <div className="h-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500" />
          
          <div className="p-8 md:p-10">
            <div className="mb-8 text-center">
              <div className="flex justify-center">
                <GeonLogo />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-4">Welcome Back</h1>
              <p className="text-sm text-slate-500 mt-1">Sign in to access your secure workspace</p>
              
              {/* Session timeout indicator */}
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-50 py-2 px-4 rounded-full border border-slate-200">
                <Zap size={12} className="text-amber-500" />
                <span>Lightning fast •</span>
                <Clock size={12} className="text-amber-500" />
                <span>30 min session</span>
                <BadgeCheck size={12} className="text-emerald-500" />
              </div>
            </div>

            {/* Error Display */}
            {error && !showVerificationPrompt && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 animate-shake">
                <div className="shrink-0">
                  <XCircle className="text-rose-600" size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-rose-700 text-sm font-semibold">{error}</p>
                  <p className="text-rose-600 text-xs mt-1">Please check your credentials and try again</p>
                </div>
              </div>
            )}

            {/* Verification Prompt */}
            {showVerificationPrompt && (
              <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-xl animate-slide-down">
                <div className="flex items-start gap-3">
                  <div className="shrink-0">
                    <AlertTriangle className="text-amber-600" size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-amber-800 text-sm">Email Not Verified</h3>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                      Please verify your email address before logging in.
                    </p>
                    
                    {hasPartialRegistration && (
                      <div className="mt-3 p-3 bg-amber-100/70 rounded-lg border border-amber-200">
                        <p className="text-xs text-amber-800 flex items-center gap-1.5">
                          <UserCheck size={14} />
                          <span className="font-medium">Incomplete registration found for:</span>
                        </p>
                        <p className="text-sm font-mono text-amber-900 mt-1 font-semibold">{pendingEmail}</p>
                      </div>
                    )}
                    
                    {verificationResent && (
                      <div className="mt-3 p-2 bg-emerald-100 rounded-lg flex items-center gap-2 border border-emerald-200">
                        <CheckCircle size={14} className="text-emerald-600" />
                        <p className="text-xs text-emerald-700 font-medium">Verification email sent! Check your inbox.</p>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        onClick={handleResendVerification}
                        disabled={isResendingVerification}
                        className="flex items-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-lg transition-all font-medium disabled:opacity-50 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
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
                        className="flex items-center gap-1 text-xs border border-amber-300 hover:bg-amber-100 text-amber-800 px-4 py-2.5 rounded-lg transition-all font-medium"
                      >
                        Continue Registration
                        <ChevronRight size={14} />
                      </button>
                      <button
                        onClick={handleClearPending}
                        className="text-xs text-amber-700 hover:text-amber-800 px-3 py-2.5 underline-offset-2 hover:underline"
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
                <label className="text-xs font-semibold text-slate-700 ml-1 flex items-center gap-1.5">
                  <Mail size={12} className="text-amber-500" />
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="email" 
                    required 
                    placeholder="you@example.com"
                    className={inputClasses('email')}
                    value={formData.email}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    disabled={isLoading}
                    autoComplete="email"
                  />
                  {formData.email && !error && (
                    <CheckCircle size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <LockKeyhole size={12} className="text-amber-500" />
                    Password
                  </label>
                  <Link 
                    href="/auth/recover" 
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium hover:underline flex items-center gap-1"
                  >
                    Forgot password?
                    <ChevronRight size={10} />
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    placeholder="Enter your password"
                    className={inputClasses('password')}
                    value={formData.password}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 transition-colors"
                    disabled={isLoading}
                  />
                  <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors">
                    Remember me <span className="text-slate-400">(30 min session)</span>
                  </span>
                </label>
                
                <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                  <Lock size={10} />
                  <span>Encrypted</span>
                  <Shield size={10} />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all flex justify-center items-center gap-2 disabled:opacity-50 shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 group relative overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> 
                    Verifying credentials...
                  </>
                ) : (
                  <>
                    Sign In to Workspace 
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">
                Don't have an account?{' '}
                <Link 
                  href="/auth/register" 
                  className="text-amber-600 font-bold hover:text-amber-700 hover:underline inline-flex items-center gap-1 group"
                >
                  Create free account
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </p>
            </div>

            {/* Role-based quick access */}
            <div className="mt-6 p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 text-center">
                Quick Access by Role
              </p>
              <div className="flex justify-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Users size={12} className="text-emerald-500" />
                  <span>Influencer</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Building2 size={12} className="text-amber-500" />
                  <span>Business</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Shield size={12} className="text-purple-500" />
                  <span>Admin</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Trust Indicators */}
        <div className="mt-8 flex items-center justify-center gap-8 text-slate-400">
          <div className="flex items-center gap-1.5 group hover:text-slate-600 transition-colors">
            <Fingerprint size={14} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs">Biometric Ready</span>
          </div>
          <div className="flex items-center gap-1.5 group hover:text-slate-600 transition-colors">
            <Key size={14} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs">2FA Support</span>
          </div>
          <div className="flex items-center gap-1.5 group hover:text-slate-600 transition-colors">
            <Globe size={14} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs">24/7 Access</span>
          </div>
        </div>

        {/* Support Link */}
        <div className="mt-6 text-center">
          <Link 
            href="/support" 
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1 group"
          >
            <span className="group-hover:underline">Need help? Contact support</span>
            <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}