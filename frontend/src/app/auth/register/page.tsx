'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Loader2, ArrowRight,  Eye, EyeOff,
  Mail, Lock, Building2, Sparkles, ArrowLeft,
  CheckCircle, AlertCircle, User, Key, Clock,
  Fingerprint, Globe, 
  Zap
} from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';

import { PartnerTypeSelector, UserRole } from '@/components/auth/PartnerTypeSelector';
import { EmailVerification } from '@/components/auth/EmailVerification';
import { RecoveryPhraseDisplay } from '@/components/auth/RecoveryPhraseDisplay';

// Token expiration time (30 minutes)
const TOKEN_EXPIRY = 30 * 60 * 1000; // 30 minutes in milliseconds

export default function RegistrationPage() {
  const router = useRouter();
  const { showToast } = useNotificationStore();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  const [registrationData, setRegistrationData] = useState({
    email: '',
    fullName: '',
    operatorId: '',
    recoveryPhrase: '',
    role: 'INFLUENCER' as UserRole,
    accessToken: '' // Store token for immediate login after verification
  });
  
  const [formData, setFormData] = useState({
    businessName: '', 
    firstName: '',     
    lastName: '',      
    email: '',
    password: '',
    confirmPassword: '',
    role: 'INFLUENCER' as UserRole,
    acceptTerms: false
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

  // Check for existing session
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('geon_user');
    const loginTimestamp = localStorage.getItem('login_timestamp');
    
    if (token && savedUser && loginTimestamp) {
      const timestamp = parseInt(loginTimestamp);
      const now = Date.now();
      
      // Check if token is expired
      if (now - timestamp < TOKEN_EXPIRY) {
        try {
          const user = JSON.parse(savedUser);
          const target = user.role === 'admin' 
            ? '/admin/dashboard' 
            : user.role === 'business' 
              ? '/business/dashboard' 
              : '/client/dashboard';
          router.replace(target);
        } catch (e) {
          // Invalid user data, clear storage
          localStorage.removeItem('auth_token');
          localStorage.removeItem('geon_user');
          localStorage.removeItem('login_timestamp');
        }
      } else {
        // Token expired, clear storage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('geon_user');
        localStorage.removeItem('login_timestamp');
      }
    }
  }, [router]);

  useEffect(() => {
    let strength = 0;
    const password = formData.password;
    if (password.length >= 8) strength += 25;
    if (password.match(/[a-z]/)) strength += 25;
    if (password.match(/[A-Z]/)) strength += 25;
    if (password.match(/[0-9]/)) strength += 15;
    if (password.match(/[^a-zA-Z0-9]/)) strength += 10;
    setPasswordStrength(Math.min(strength, 100));
  }, [formData.password]);

  // Updated cookie helper to match LoginPage logic
  const getAuthToken = () => {
    if (typeof document === 'undefined') return null;
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('geon_token='))
      ?.split('=')[1];
  };

  const setAuthCookie = (token: string, maxAge: number = 1800) => {
    document.cookie = `geon_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'secure' : ''}`;
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 100) {
      // Swipe left - next step
      if (step < 3) {
        setStep(step + 1);
      }
    }
    
    if (touchStart - touchEnd < -100) {
      // Swipe right - previous step
      if (step > 1) {
        setStep(step - 1);
      }
    }
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      showToast("Passwords don't match. Please try again.", "error");
      return;
    }
    
    if (passwordStrength < 40) {
      showToast("Please choose a stronger password.", "error");
      return;
    }

    if (!formData.acceptTerms) {
      showToast("You must accept the terms and conditions.", "error");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const payloadName = formData.role === 'BUSINESS' 
        ? formData.businessName.trim() 
        : `${formData.firstName} ${formData.lastName}`.trim();

      const token = getAuthToken() || localStorage.getItem('auth_token');
      
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          full_name: payloadName,
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          role: formData.role.toLowerCase()
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 400 && data.detail?.includes("already registered")) {
          throw new Error("An account with this email already exists. Please login instead.");
        }
        throw new Error(data.detail || "Registration failed. Please check your information.");
      }

      setRegistrationData({ 
        email: formData.email.toLowerCase().trim(),
        fullName: payloadName,
        role: formData.role,
        recoveryPhrase: data.recovery_phrase,
        operatorId: data.operator_id,
        accessToken: data.access_token || ''
      });

      // Store token if provided (for auto-login)
      if (data.access_token) {
        localStorage.setItem('auth_token', data.access_token);
        setAuthCookie(data.access_token);
        
        const loginTimestamp = Date.now().toString();
        localStorage.setItem('login_timestamp', loginTimestamp);
        document.cookie = `login_timestamp=${loginTimestamp}; path=/; max-age=1800; SameSite=Lax;`;
      }

      // Bypass check (admin or privileged enrollment)
      if (data.detail?.toLowerCase().includes("bypassed") || 
          formData.email.toLowerCase() === "root@geon.com" ||
          data.access_token) {
        setStep(3);
        showToast("Account created successfully!", "success");
      } else {
        setStep(2);
        showToast("We've sent a verification code to your email", "success");
      }
      
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (code: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registrationData.email, code }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 400) {
          throw new Error("Invalid verification code. Please try again.");
        }
        throw new Error(data.detail || "Verification failed");
      }

      // ✅ CRITICAL: Store token in LocalStorage for Dashboard components
      if (data.access_token) {
        localStorage.setItem('auth_token', data.access_token);
        setAuthCookie(data.access_token);
        
        const loginTimestamp = Date.now().toString();
        localStorage.setItem('login_timestamp', loginTimestamp);
        document.cookie = `login_timestamp=${loginTimestamp}; path=/; max-age=1800; SameSite=Lax;`;
        
        setRegistrationData(prev => ({
          ...prev,
          accessToken: data.access_token
        }));
      }

      setRegistrationData(prev => ({
        ...prev,
        operatorId: data.operator_id || prev.operatorId, 
      }));
      
      setStep(3); 
      showToast("Email verified successfully!", "success");
      
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registrationData.email }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Failed to resend code");
      }
      
      showToast("A new verification code has been sent", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleRegistrationComplete = async () => {
    setIsLoading(true);
    try {
      // Finalize the setup status in cookies
      document.cookie = `setup_complete=true; path=/; max-age=31536000; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'secure' : ''}`;
      
      // ✅ Sync session data with LoginPage format
      const sessionUser = {
        id: registrationData.operatorId,
        full_name: registrationData.fullName,
        email: registrationData.email,
        role: registrationData.role.toLowerCase(),
        operator_id: registrationData.operatorId,
        login_timestamp: Date.now()
      };
      
      localStorage.setItem('geon_user', JSON.stringify(sessionUser));
      
      // Ensure token exists
      if (!localStorage.getItem('auth_token') && registrationData.accessToken) {
        localStorage.setItem('auth_token', registrationData.accessToken);
      }
      
      showToast("Your account is ready! Taking you to your dashboard...", "success");
      
      // Small delay for toast to be visible
      setTimeout(() => {
        const target = registrationData.role === 'BUSINESS' 
          ? '/business/dashboard' 
          : '/client/dashboard';
        
        router.replace(target);
      }, 500);
      
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength < 40) return "Weak";
    if (passwordStrength < 70) return "Medium";
    return "Strong";
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return "bg-rose-500";
    if (passwordStrength < 70) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  const inputClasses = "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all text-sm text-gray-900 placeholder:text-gray-400";

  // Desktop View - Full page centered card
  const renderDesktop = () => (
    <div className="hidden lg:flex min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 items-center justify-center p-6">
      <div className="w-full max-w-xl">
        {/* Navigation Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors text-sm group">
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> 
            Back to Home
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((num) => (
                <div 
                  key={num} 
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    step >= num ? 'bg-rose-500 w-8' : 'bg-gray-200 w-2'
                  }`} 
                />
              ))}
            </div>
            <span className="text-xs text-gray-400 font-medium">Step {step} of 3</span>
          </div>
        </div>

        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-8">
              <div className="mb-6 text-center">
                <GeonLogo />
                <h1 className="text-2xl font-bold text-gray-900 mt-4">Create your account</h1>
                <p className="text-sm text-gray-500 mt-1">Join GeonPayGuard to start collaborating securely</p>
              </div>

              <form onSubmit={handleInitialSubmit} className="space-y-5">
                <PartnerTypeSelector 
                  selectedRole={formData.role} 
                  onChange={(role) => setFormData({...formData, role})} 
                />
                
                <div className="space-y-4">
                  {formData.role === 'BUSINESS' ? (
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1.5">Company Name</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          placeholder="Enter your company name" 
                          className={`${inputClasses} pl-10`}
                          required 
                          value={formData.businessName}
                          onChange={e => setFormData({...formData, businessName: e.target.value})}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-100 p-4 rounded-xl">
                        <div className="flex items-start gap-3">
                          <Sparkles size={20} className="text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-rose-900">Influencer & Creator Account</p>
                            <p className="text-xs text-rose-700 leading-relaxed mt-1">
                              Create secure escrow agreements for brand collaborations, freelance projects, 
                              or personal transactions. Funds are held safely until both sides are satisfied.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-700 block mb-1.5">First Name</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                              placeholder="John" 
                              className={`${inputClasses} pl-10`}
                              required 
                              value={formData.firstName}
                              onChange={e => setFormData({...formData, firstName: e.target.value})}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-700 block mb-1.5">Last Name</label>
                          <input 
                            placeholder="Doe" 
                            className={inputClasses}
                            required 
                            value={formData.lastName}
                            onChange={e => setFormData({...formData, lastName: e.target.value})}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="email" 
                        placeholder="you@example.com" 
                        className={`${inputClasses} pl-10`}
                        required 
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Create a password" 
                        className={`${inputClasses} pl-10 pr-10`}
                        required 
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {formData.password && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`} 
                              style={{ width: `${passwordStrength}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600">{getPasswordStrengthLabel()}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Key size={12} /> Minimum 8 characters with letters and numbers
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        placeholder="Confirm your password" 
                        className={`${inputClasses} pl-10 pr-10`}
                        required 
                        value={formData.confirmPassword}
                        onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> Passwords don't match
                      </p>
                    )}
                    {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password.length > 0 && (
                      <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                        <CheckCircle size={12} /> Passwords match
                      </p>
                    )}
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <input
                      type="checkbox" 
                      id="terms" 
                      checked={formData.acceptTerms}
                      onChange={(e) => setFormData({...formData, acceptTerms: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 mt-0.5"
                    />
                    <label htmlFor="terms" className="text-xs text-gray-600 leading-relaxed">
                      I agree to the <Link href="/terms" className="text-rose-600 font-medium hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-rose-600 font-medium hover:underline">Privacy Policy</Link>. I understand that my recovery phrase is my responsibility.
                    </label>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading || !formData.acceptTerms}
                  className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl text-sm font-medium transition-all flex justify-center items-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> 
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account <ArrowRight size={18} />
                    </>
                  )}
                </button>
                
                <p className="text-center text-sm text-gray-500">
                  Already have an account?{' '}
                  <Link href="/auth/login" className="text-rose-600 font-semibold hover:text-rose-700 hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            </div>
            
            {/* Trust indicators */}
            <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 flex items-center justify-between text-gray-400 text-xs">
              <div className="flex items-center gap-1.5">
                <Fingerprint size={14} />
                <span>Secure encryption</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Globe size={14} />
                <span>Global access</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={14} />
                <span>30-min sessions</span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <EmailVerification 
              email={registrationData.email}
              onVerify={handleVerifyOTP}
              onResend={handleResendOTP} 
              onBack={() => setStep(1)}
              isVerifying={isLoading}
            />
          </div>
        )}

        {step === 3 && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <RecoveryPhraseDisplay 
              phrase={registrationData.recoveryPhrase}
              operatorId={registrationData.operatorId}
              onComplete={handleRegistrationComplete}
            />
          </div>
        )}
      </div>
    </div>
  );

  // Mobile View - Swipeable cards
  const renderMobile = () => (
    <div className="lg:hidden min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 border-2 border-rose-500 rounded-lg opacity-20"></div>
              <div className="absolute inset-1 border border-rose-500 rounded-md opacity-40"></div>
              <span className="relative text-sm font-bold text-rose-500">G</span>
            </div>
            <span className="font-bold text-sm text-gray-900">GEON<span className="font-light">PAYGUARD</span></span>
          </Link>
          
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-rose-500" />
            <span className="text-xs text-gray-400 font-medium">{step}/3</span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="flex gap-1 mt-3">
          {[1, 2, 3].map((num) => (
            <div 
              key={num} 
              className={`h-1 rounded-full transition-all duration-500 flex-1 ${
                step >= num ? 'bg-rose-500' : 'bg-gray-200'
              }`} 
            />
          ))}
        </div>
      </div>

      {/* Swipeable Cards Container */}
      <div 
        className="px-4 py-6 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${(step - 1) * 100}%)` }}
        >
          {/* Card 1 - Registration */}
          <div className="w-full flex-shrink-0 px-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-5">
                <div className="mb-4 text-center">
                  <div className="relative w-10 h-10 flex items-center justify-center mx-auto">
                    <div className="absolute inset-0 border-2 border-rose-500 rounded-lg opacity-20"></div>
                    <div className="absolute inset-1 border border-rose-500 rounded-md opacity-40"></div>
                    <span className="relative text-base font-bold text-rose-500">G</span>
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 mt-3">Create account</h1>
                </div>

                <form onSubmit={handleInitialSubmit} className="space-y-4">
                  <PartnerTypeSelector 
                    selectedRole={formData.role} 
                    onChange={(role) => setFormData({...formData, role})} 
                  />
                  
                  <div className="space-y-3">
                    {formData.role === 'BUSINESS' ? (
                      <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1">Company Name</label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input 
                            placeholder="Company name" 
                            className="w-full px-4 py-2.5 pl-10 bg-white border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none"
                            required 
                            value={formData.businessName}
                            onChange={e => setFormData({...formData, businessName: e.target.value})}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-semibold text-gray-700 block mb-1">First</label>
                          <input 
                            placeholder="John" 
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none"
                            required 
                            value={formData.firstName}
                            onChange={e => setFormData({...formData, firstName: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-700 block mb-1">Last</label>
                          <input 
                            placeholder="Doe" 
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none"
                            required 
                            value={formData.lastName}
                            onChange={e => setFormData({...formData, lastName: e.target.value})}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="email" 
                          placeholder="you@example.com" 
                          className="w-full px-4 py-2.5 pl-10 bg-white border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none"
                          required 
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="Create password" 
                          className="w-full px-4 py-2.5 pl-10 pr-10 bg-white border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none"
                          required 
                          value={formData.password}
                          onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)} 
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Confirm</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type={showConfirmPassword ? "text" : "password"} 
                          placeholder="Confirm password" 
                          className="w-full px-4 py-2.5 pl-10 pr-10 bg-white border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none"
                          required 
                          value={formData.confirmPassword}
                          onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                      <input
                        type="checkbox" 
                        id="terms-mobile" 
                        checked={formData.acceptTerms}
                        onChange={(e) => setFormData({...formData, acceptTerms: e.target.checked})}
                        className="w-4 h-4 rounded border-gray-300 text-rose-600 mt-0.5"
                      />
                      <label htmlFor="terms-mobile" className="text-xs text-gray-600">
                        I agree to Terms & Privacy
                      </label>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isLoading || !formData.acceptTerms}
                    className="w-full py-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 shadow-lg"
                  >
                    {isLoading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Create Account'}
                  </button>
                  
                  <p className="text-center text-xs text-gray-500">
                    Have an account? <Link href="/auth/login" className="text-rose-600 font-medium">Sign in</Link>
                  </p>
                </form>
              </div>
            </div>
          </div>

          {/* Card 2 - Email Verification */}
          <div className="w-full flex-shrink-0 px-1">
            <EmailVerification 
              email={registrationData.email}
              onVerify={handleVerifyOTP}
              onResend={handleResendOTP} 
              onBack={() => setStep(1)}
              isVerifying={isLoading}
            />
          </div>

          {/* Card 3 - Recovery Phrase */}
          <div className="w-full flex-shrink-0 px-1">
            <RecoveryPhraseDisplay 
              phrase={registrationData.recoveryPhrase}
              operatorId={registrationData.operatorId}
              onComplete={handleRegistrationComplete}
            />
          </div>
        </div>

        {/* Swipe Hint */}
        <div className="flex justify-center gap-1 mt-4">
          {[1, 2, 3].map((num) => (
            <div 
              key={num} 
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                step === num ? 'bg-rose-500 w-4' : 'bg-gray-300'
              }`} 
            />
          ))}
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-2">
          ← Swipe to navigate →
        </p>
      </div>

      {/* Mobile Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-3 px-4">
        <div className="flex justify-center gap-4 text-[10px] text-gray-400">
          <div className="flex items-center gap-1">
            <Fingerprint size={12} />
            <span>Secure</span>
          </div>
          <div className="flex items-center gap-1">
            <Globe size={12} />
            <span>Global</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>30-min sessions</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop View - Full page centered card */}
      {renderDesktop()}
      
      {/* Mobile View - Swipeable cards */}
      {renderMobile()}
    </>
  );
}