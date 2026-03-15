'use client';
import { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  Shield, 
  Fingerprint, 
  Lock,
  Globe,
  User,
  CheckCircle2,
  Radio,
  Terminal,
  ScanLine,
  Zap,
  Clock,
  BadgeCheck,
  Gem,
  Home,
  ChevronRight,
  Cpu
} from 'lucide-react';

// Component Imports
import InfluencerSettings from '@/components/settings/Influencer';
import BusinessSettings from '@/components/settings/Business';
import AdminSettings from '@/components/settings/Admin';

export default function SettingsHub() {
  const [role, setRole] = useState<'influencer' | 'business' | 'admin' | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to extract cookie
  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  useEffect(() => {
    async function syncAethelSovereign() {
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('auth_token') || getCookie('geon_token');
        const storedUser = localStorage.getItem('geon_user');

        if (!token || !storedUser) {
          throw new Error("Session expired. Please sign in again.");
        }

        const parsedUser = JSON.parse(storedUser);
        
        let userRole: 'influencer' | 'business' | 'admin' = 'influencer';
        const raw = (parsedUser.role || '').toLowerCase();
        if (parsedUser.is_admin || raw === 'admin') userRole = 'admin';
        else if (['business', 'operator', 'brand', 'enterprise'].includes(raw)) userRole = 'business';

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${API_URL}/api/v1/settings/sync`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.status === 401) throw new Error("Unauthorized Access");
        if (!res.ok) throw new Error("Vault synchronization failed");

        const json = await res.json();
        
        setRole(userRole);
        setData(json.data);
      } catch (e: any) {
        console.error("Sync Error:", e);
        setError(e.message || "Failed to Fetch");
      } finally {
        setTimeout(() => setLoading(false), 800);
      }
    }
    
    syncAethelSovereign();
  }, []);

  // Professional Logo Component
  const GeonLogo = () => (
    <div className="relative flex items-center justify-center">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl rotate-6 shadow-lg" />
        <div className="absolute inset-[2px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg rotate-6" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-0.5 bg-amber-400/60 rounded-full rotate-45 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <div className="w-4 h-0.5 bg-amber-400/60 rounded-full -rotate-45 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Gem size={16} className="text-amber-400" strokeWidth={1.5} />
        </div>
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse" />
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse delay-150" />
      </div>
    </div>
  );

  // --- 1. LOADING STATE (Matching Login/Registration) ---
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center space-y-8">
        {/* Animated Logo Container */}
        <div className="relative">
          {/* Outer Ring */}
          <div className="absolute inset-0 bg-amber-500/10 rounded-full animate-ping" />
          <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-pulse" />
          
          {/* Inner Circle */}
          <div className="relative w-24 h-24 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl rotate-45 overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-800 to-slate-900" />
            <div className="absolute inset-0 flex items-center justify-center -rotate-45">
              <div className="grid grid-cols-2 gap-1">
                <div className="w-3 h-3 bg-white/10 rounded-sm" />
                <div className="w-3 h-3 bg-amber-400/30 rounded-sm" />
                <div className="w-3 h-3 bg-amber-400/30 rounded-sm" />
                <div className="w-3 h-3 bg-white/10 rounded-sm" />
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Gem size={32} className="text-amber-400/80" strokeWidth={1.5} />
            </div>
          </div>

          {/* Floating Icons */}
          <div className="absolute -top-2 -right-2">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping" />
              <ScanLine className="text-white relative z-10" size={16} />
            </div>
          </div>
          <div className="absolute -bottom-2 -left-2">
            <Radio className="text-amber-500/30 animate-pulse" size={20} />
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Cpu size={14} className="text-amber-500" />
            <p className="text-[11px] font-mono font-bold uppercase tracking-[0.3em] text-slate-400">
              SYNCHRONIZING
            </p>
          </div>
          
          {/* Progress Bar */}
          <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full animate-loading-bar" />
          </div>

          <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400">
            <Clock size={12} />
            <span>Establishing secure channel...</span>
          </div>
        </div>

        {/* Security Badge */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-slate-200 shadow-sm">
          <Lock size={12} className="text-amber-500" />
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">
            AES-256 ENCRYPTED
          </span>
          <BadgeCheck size={12} className="text-emerald-500" />
        </div>
      </div>
    </div>
  );

  // --- 2. ERROR STATE (Matching Login/Registration) ---
  if (error || !role) return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-md w-full">
        {/* Error Card */}
        <div className="bg-white rounded-3xl border border-rose-200 shadow-2xl overflow-hidden">
          {/* Top Bar */}
          <div className="h-2 bg-gradient-to-r from-rose-500 to-rose-400" />
          
          <div className="p-8 text-center">
            {/* Icon Container */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 bg-rose-50 rounded-2xl animate-pulse" />
              <div className="relative w-full h-full bg-gradient-to-br from-rose-50 to-white rounded-2xl border border-rose-200 flex items-center justify-center">
                <AlertCircle size={32} className="text-rose-500" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-ping" />
            </div>

            {/* Error Message */}
            <h2 className="text-xl font-black tracking-tight text-slate-900 mb-2">
              Sync Interrupted
            </h2>
            <p className="text-slate-500 text-sm mb-8 font-mono bg-slate-50 p-3 rounded-xl border border-slate-200">
              {error}
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button 
                onClick={() => window.location.href = '/auth/login'}
                className="w-full py-4 bg-slate-900 text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-slate-800 transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                <Lock size={16} className="group-hover:rotate-12 transition-transform" />
                RE-AUTHENTICATE
              </button>
              
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-white text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all duration-300 border border-slate-200"
              >
                Retry Connection
              </button>
            </div>
          </div>

          {/* Error Code */}
          <div className="border-t border-rose-100 bg-rose-50/50 px-6 py-3">
            <p className="text-[10px] font-mono text-rose-600/70 text-center">
              ERROR_CODE: 0x{Math.random().toString(16).substring(2, 8).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Support Link */}
        <p className="text-center mt-4 text-[10px] text-slate-400">
          Need help? Contact{' '}
          <a href="/support" className="text-amber-600 underline underline-offset-4 hover:text-amber-700">
            protocol support
          </a>
        </p>
      </div>
    </div>
  );

  // --- 3. SUCCESS STATE (Matching Login/Registration) ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Header - Matching Login/Registration */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GeonLogo />
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">Settings</h1>
              <p className="text-xs text-slate-400">Manage your workspace preferences</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-600">Active Session</span>
            </div>
            <button 
              onClick={() => window.location.href = '/'}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <Home size={18} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Role Indicator */}
        <div className="mb-6 flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
            role === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
            role === 'business' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
            'bg-emerald-100 text-emerald-700 border border-emerald-200'
          }`}>
            <Shield size={12} />
            <span>{role.toUpperCase()} ACCESS</span>
          </div>
          <ChevronRight size={14} className="text-slate-300" />
          <span className="text-xs text-slate-400">Workspace Configuration</span>
        </div>

        {/* Main Content Card */}
        <div className="relative">
          {/* Decorative Elements */}
          <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 rounded-[3rem] blur-2xl" />
          
          {/* Content Card */}
          <div className="relative bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
            {/* Top Gradient Bar */}
            <div className="h-2 bg-gradient-to-r from-amber-500 to-amber-400" />
            
            {/* Card Header */}
            <div className="px-8 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50/30 to-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  role === 'admin' ? 'bg-purple-100' :
                  role === 'business' ? 'bg-amber-100' :
                  'bg-emerald-100'
                }`}>
                  <User size={18} className={
                    role === 'admin' ? 'text-purple-600' :
                    role === 'business' ? 'text-amber-600' :
                    'text-emerald-600'
                  } />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {role === 'admin' ? 'Administrator' : 
                     role === 'business' ? 'Business' : 'Influencer'} Settings
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400">Role-specific configuration panel</p>
                </div>
              </div>
              
              {/* Security Badges */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-full">
                  <Lock size={10} className="text-slate-500" />
                  <span className="text-[7px] font-mono font-bold text-slate-500 uppercase">TLS 1.3</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-full border border-emerald-200">
                  <CheckCircle2 size={10} className="text-emerald-600" />
                  <span className="text-[7px] font-mono font-bold text-emerald-600 uppercase">Verified</span>
                </div>
              </div>
            </div>

            {/* Settings Content */}
            <div className="p-8">
              {role === 'influencer' && <InfluencerSettings data={data} />}
              {role === 'business' && <BusinessSettings data={data} />}
              {role === 'admin' && <AdminSettings />}
            </div>

            {/* Card Footer */}
            <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-4 text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Shield size={12} />
                  <span className="text-[8px] font-bold uppercase tracking-widest">E2E Encrypted</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Fingerprint size={12} />
                  <span className="text-[8px] font-bold uppercase tracking-widest">Biometric Auth</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe size={12} />
                  <span className="text-[8px] font-bold uppercase tracking-widest">Secure Gateway</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Zap size={12} className="text-amber-500" />
                <span className="text-[7px] font-mono text-slate-400">
                  v2.0.1 • sovereign protocol
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info Bar */}
        <div className="mt-6 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Radio size={10} className="text-amber-500/50" />
              <span className="text-[7px] font-mono text-slate-400">NODE ACTIVE</span>
            </div>
            <div className="flex items-center gap-1">
              <Terminal size={10} className="text-amber-500/50" />
              <span className="text-[7px] font-mono text-slate-400">SESSION: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
          
          <div className="text-[7px] font-mono text-slate-300">
            <span className="text-amber-500">●</span> GeonPayGuard • Sovereign Protocol
          </div>
        </div>
      </div>

      {/* Add custom animation keyframes */}
      <style jsx>{`
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        .animate-loading-bar {
          animation: loading-bar 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}