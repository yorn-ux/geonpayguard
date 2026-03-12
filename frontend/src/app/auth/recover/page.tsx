'use client';

import React, { useState } from 'react';
import { 
   ArrowRight, Loader2, Mail, Lock, 
  Eye, EyeOff, AlertCircle, Home, Check, Sparkles,
  Fingerprint, Key, Globe, 
  Copy, Shield
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotificationStore } from '@/store/useNotificationStore';

export default function RecoveryPage() {
  const router = useRouter();
  const { showToast } = useNotificationStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPhrase, setShowPhrase] = useState(false);
  const [error, setError] = useState('');
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');
  
  const [formData, setFormData] = useState({
    email: '',
    recovery_phrase: '',
    new_password: '',
    confirm_password: ''
  });

  const wordCount = formData.recovery_phrase.trim() 
    ? formData.recovery_phrase.trim().split(/\s+/).length 
    : 0;

  const handlePastePhrase = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setFormData({...formData, recovery_phrase: text});
    } catch (err) {
      showToast("Unable to paste. Please type manually.", "error");
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phrase length
    if (wordCount !== 12) {
      setError('Recovery phrase must contain exactly 12 words');
      return;
    }

    // Validate password match
    if (formData.new_password !== formData.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    // Validate password strength
    if (formData.new_password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError('');
    setStep('processing');

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_URL}/api/auth/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          recovery_phrase: formData.recovery_phrase.trim(),
          new_password: formData.new_password
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Recovery failed. Please check your recovery phrase.');
      }

      setStep('success');
      
      // Auto redirect after 3 seconds
      setTimeout(() => {
        showToast("Identity restored. Please login with your new credentials.", "success");
        router.push('/auth/login');  // ✅ FIXED: Changed from /client/login to /auth/login
      }, 3000);

    } catch (err: any) {
      setError(err.message);
      setStep('form');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses = "w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all duration-200 outline-none text-sm font-medium text-[#1A1C21] placeholder:text-slate-300 hover:border-slate-200";
  const textareaClasses = "w-full pl-12 pr-12 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all duration-200 outline-none text-sm font-mono font-medium text-[#1A1C21] placeholder:text-slate-300 hover:border-slate-200 resize-none";

  const isFieldInvalid = (fieldName: string) => {
    return touchedFields[fieldName] && !formData[fieldName as keyof typeof formData];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FCFCFD] via-white to-rose-50/30 text-[#1A1C21] flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-md w-full z-10">
        {/* Top navigation */}
        <div className="flex justify-between items-center mb-10 px-2">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-slate-400 hover:text-[#1A1C21] transition-all font-bold text-[10px] uppercase tracking-widest group"
          >
            <Home size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>Go Back</span>
          </Link>
          
          <div className="flex items-center gap-2 px-4 py-1.5 bg-white/80 backdrop-blur-sm rounded-full border border-slate-200/60 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Live • Protocol Active</span>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[40px] shadow-2xl shadow-slate-200/50 border border-white/50 overflow-hidden animate-fade-in-up">
          
          {step === 'form' && (
            <>
              {/* Header */}
              <div className="p-10 pb-6 text-center">
                <div className="inline-flex w-16 h-16 bg-gradient-to-br from-[#1A1C21] to-[#2A2C31] text-white rounded-2xl items-center justify-center mb-6 shadow-xl transform hover:scale-105 transition-transform duration-300">
                  <Key size={32} />
                </div>
                <h1 className="text-3xl font-extrabold text-[#1A1C21] tracking-tight">Account Recovery</h1>
                <p className="text-slate-400 text-sm font-medium mt-2 flex items-center justify-center gap-2">
                  <Sparkles size={14} className="text-rose-500" />
                  Restore access with your recovery phrase
                </p>
              </div>

              {/* Form */}
              <div className="p-10 pt-2">
                {/* Warning Banner */}
                <div className="mb-6 p-4 bg-amber-50/80 backdrop-blur-sm border border-amber-200 rounded-2xl flex items-start gap-3">
                  <Shield className="text-amber-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-amber-900 text-[10px] font-black uppercase tracking-widest mb-1">Critical Action</p>
                    <p className="text-amber-700 text-[9px] font-bold leading-relaxed">
                      This will reset your password and invalidate all existing sessions.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-rose-50/80 backdrop-blur-sm border border-rose-100 rounded-2xl flex items-center gap-3 animate-slide-down">
                    <AlertCircle className="text-rose-600 shrink-0" size={18} />
                    <p className="text-rose-900 text-[11px] font-bold uppercase flex-1">{error}</p>
                    <button 
                      onClick={() => setError('')}
                      className="text-rose-400 hover:text-rose-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <form onSubmit={handleRecovery} className="space-y-6">
                  {/* Email field */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Mail size={12} />
                      Account Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="email" 
                        required
                        placeholder="name@company.com"
                        className={`${inputClasses} ${isFieldInvalid('email') ? 'border-red-300 bg-red-50/50' : ''}`}
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        onBlur={() => setTouchedFields({...touchedFields, email: true})}
                      />
                    </div>
                  </div>

                  {/* Recovery Phrase field */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Key size={12} />
                      12-Word Recovery Phrase
                    </label>
                    <div className="relative">
                      <Key className="absolute left-4 top-4 text-slate-300" size={18} />
                      <textarea 
                        required
                        rows={4}
                        placeholder="word1 word2 word3 ..."
                        className={`${textareaClasses} ${isFieldInvalid('recovery_phrase') ? 'border-red-300 bg-red-50/50' : ''}`}
                        value={formData.recovery_phrase}
                        onChange={e => setFormData({...formData, recovery_phrase: e.target.value})}
                        onBlur={() => setTouchedFields({...touchedFields, recovery_phrase: true})}
                      />
                      <div className="absolute right-3 top-3 flex gap-1">
                        <button
                          type="button"
                          onClick={() => setShowPhrase(!showPhrase)}
                          className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                          {showPhrase ? <EyeOff size={14} className="text-slate-400" /> : <Eye size={14} className="text-slate-400" />}
                        </button>
                        <button
                          type="button"
                          onClick={handlePastePhrase}
                          className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                          <Copy size={14} className="text-slate-400" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Word counter */}
                    {formData.recovery_phrase && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              wordCount === 12 ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${(wordCount / 12) * 100}%` }}
                          />
                        </div>
                        <span className={`text-[9px] font-bold ${
                          wordCount === 12 ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {wordCount}/12 words
                        </span>
                      </div>
                    )}
                  </div>

                  {/* New Password field */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Lock size={12} />
                      New Master Key
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Minimum 8 characters"
                        className={`${inputClasses} ${isFieldInvalid('new_password') ? 'border-red-300 bg-red-50/50' : ''}`}
                        value={formData.new_password}
                        onChange={e => setFormData({...formData, new_password: e.target.value})}
                        onBlur={() => setTouchedFields({...touchedFields, new_password: true})}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password field */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Lock size={12} />
                      Confirm Master Key
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="password"
                        required
                        placeholder="Re-enter new password"
                        className={`${inputClasses} ${isFieldInvalid('confirm_password') ? 'border-red-300 bg-red-50/50' : ''}`}
                        value={formData.confirm_password}
                        onChange={e => setFormData({...formData, confirm_password: e.target.value})}
                        onBlur={() => setTouchedFields({...touchedFields, confirm_password: true})}
                      />
                    </div>
                  </div>

                  {/* Password match indicator */}
                  {formData.new_password && formData.confirm_password && (
                    <div className="flex items-center gap-2 text-[10px] font-bold">
                      {formData.new_password === formData.confirm_password ? (
                        <>
                          <Check size={14} className="text-emerald-500" />
                          <span className="text-emerald-600 uppercase tracking-widest">Passwords match</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={14} className="text-amber-500" />
                          <span className="text-amber-600 uppercase tracking-widest">Passwords do not match</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Submit button */}
                  <button 
                    type="submit"
                    disabled={isLoading || wordCount !== 12}
                    className="w-full py-5 bg-gradient-to-r from-[#1A1C21] to-[#2A2C31] hover:from-rose-600 hover:to-rose-500 text-white rounded-2xl font-bold text-[12px] uppercase tracking-widest transition-all duration-300 shadow-xl flex justify-center items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mt-4 group"
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        Recover Account
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="px-4 bg-white text-slate-400">Security Notice</span>
                  </div>
                </div>

                {/* Back to login link - ✅ FIXED: Changed from /client/login to /auth/login */}
                <div className="text-center">
                  <Link 
                    href="/auth/login" 
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#1A1C21] hover:text-rose-600 transition-colors group"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-widest">Back to Sign In</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div className="p-16 text-center">
              <Loader2 size={48} className="mx-auto animate-spin text-rose-500 mb-6" />
              <h3 className="text-xl font-bold text-[#1A1C21] mb-2">Processing Recovery</h3>
              <p className="text-sm text-slate-400">
                Verifying your recovery phrase and resetting credentials...
              </p>
              <div className="mt-6 flex justify-center gap-1">
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="p-16 text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-xl">
                <Check size={40} className="text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-[#1A1C21] mb-2">Recovery Complete</h3>
              <p className="text-sm text-slate-400 mb-6">
                Your account has been restored successfully
              </p>
              <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-200">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Next Step
                </p>
                <p className="text-xs text-[#1A1C21] font-medium">
                  Redirecting to login page in 3 seconds...
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Security badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-slate-300 animate-fade-in">
          <div className="flex items-center gap-1">
            <Fingerprint size={12} />
            <span className="text-[8px] font-bold uppercase">Biometric Ready</span>
          </div>
          <div className="flex items-center gap-1">
            <Key size={12} />
            <span className="text-[8px] font-bold uppercase">2FA Protected</span>
          </div>
          <div className="flex items-center gap-1">
            <Globe size={12} />
            <span className="text-[8px] font-bold uppercase">GDPR Compliant</span>
          </div>
        </div>

        {/* Trust indicator */}
        <div className="mt-6 flex items-center justify-center gap-3 text-slate-300">
          <Check size={14} className="text-rose-500" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Secure Recovery Protocol • 256-bit Encryption</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out;
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slideDown 0.3s ease-out;
        }
        .animate-fade-in {
          animation: fadeInUp 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}