'use client';

import { useState, useEffect, Suspense } from 'react';
import { 
   Loader2, AlertTriangle, CheckCircle, 
  XCircle, ArrowLeft, Mail, Shield
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

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

interface LockAccountResponse {
  status?: string;
  message?: string;
  detail?: string;
}

function LockAccountContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');
  const [message, setMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (token) {
      handleLockAccount();
    }
  }, [token]);

  const handleLockAccount = async () => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid request. No token provided.');
      return;
    }

    setIsProcessing(true);
    setStatus('loading');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/lock-account/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: LockAccountResponse = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Your account has been locked successfully.');
        
        // Clear any auth data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('geon_user');
        document.cookie = 'geon_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      } else {
        setStatus('error');
        setMessage(data.detail || data.message || 'Failed to lock account. The link may be invalid or expired.');
      }
    } catch (error) {
      console.error('Lock account error:', error);
      setStatus('error');
      setMessage('An error occurred while processing your request. Please try again later.');
    } finally {
      setIsProcessing(false);
    }
  };

  // No token provided - show request form
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <GeonLogo />
            
            <h1 className="text-2xl font-bold text-white text-center mt-6 mb-2">
              Lock Account
            </h1>
            <p className="text-slate-400 text-center text-sm mb-8">
              To lock your account, please use the link sent to your email address.
            </p>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-amber-200 text-sm font-medium">Security Notice</p>
                  <p className="text-amber-400/70 text-xs mt-1">
                    For security reasons, account lock requests must be initiated from your registered email address.
                  </p>
                </div>
              </div>
            </div>

            <Link 
              href="/auth/login"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition-colors"
            >
              <ArrowLeft size={18} />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (status === 'loading' || isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <GeonLogo />
            
            <h1 className="text-2xl font-bold text-white text-center mt-6 mb-4">
              Locking Your Account
            </h1>
            
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="text-rose-500 animate-spin" size={40} />
              <p className="text-slate-400 text-sm mt-4">
                Please wait while we process your request...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <GeonLogo />
            
            <h1 className="text-2xl font-bold text-white text-center mt-6 mb-2">
              Account Locked
            </h1>
            
            <div className="flex flex-col items-center justify-center py-4">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="text-emerald-500" size={32} />
              </div>
              <p className="text-slate-300 text-center text-sm">
                {message}
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <Shield className="text-slate-400 flex-shrink-0" size={18} />
                <p className="text-slate-400 text-xs">
                  If you believe this was a mistake or need to unlock your account, please contact support.
                </p>
              </div>
            </div>

            <Link 
              href="/support"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors mb-3"
            >
              <Mail size={18} />
              Contact Support
            </Link>

            <Link 
              href="/"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition-colors"
            >
              <ArrowLeft size={18} />
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <GeonLogo />
          
          <h1 className="text-2xl font-bold text-white text-center mt-6 mb-2">
            Unable to Lock Account
          </h1>
          
          <div className="flex flex-col items-center justify-center py-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <XCircle className="text-red-500" size={32} />
            </div>
            <p className="text-slate-300 text-center text-sm">
              {message}
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-amber-500 flex-shrink-0" size={18} />
              <p className="text-slate-400 text-xs">
                The lock link may be invalid, expired, or already used.
              </p>
            </div>
          </div>

          <Link 
            href="/auth/login"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition-colors mb-3"
          >
            <ArrowLeft size={18} />
            Back to Login
          </Link>

          <Link 
            href="/support"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
          >
            <Mail size={18} />
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LockAccountPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Loader2 className="text-rose-500 animate-spin" size={40} />
      </div>
    }>
      <LockAccountContent />
    </Suspense>
  );
}
