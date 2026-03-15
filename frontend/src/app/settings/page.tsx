'use client';
import { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  Shield, 
  Fingerprint, 
  Lock,
  Key,
  Globe,
  User,
  Settings2,
  Sparkles,
  CheckCircle2,
  Radio,
  Terminal,
  ScanLine
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

  // Helper to extract cookie (matching LoginPage logic)
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
        // 1. Unified Token Retrieval
        const token = localStorage.getItem('auth_token') || getCookie('geon_token');
        const storedUser = localStorage.getItem('geon_user');

        if (!token || !storedUser) {
          throw new Error("Session expired. Please sign in again.");
        }

        const parsedUser = JSON.parse(storedUser);
        
        // 2. Normalize Role
        let userRole: 'influencer' | 'business' | 'admin' = 'influencer';
        const raw = (parsedUser.role || '').toLowerCase();
        if (parsedUser.is_admin || raw === 'admin') userRole = 'admin';
        else if (['business', 'operator', 'brand', 'enterprise'].includes(raw)) userRole = 'business';

        // 3. Authenticated Fetch
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

  // --- 1. LOADING STATE (Redesigned) ---
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-black/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-black/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center space-y-8">
        {/* Animated Logo Container */}
        <div className="relative">
          {/* Outer Ring */}
          <div className="absolute inset-0 bg-black/5 rounded-full animate-ping" />
          <div className="absolute inset-0 bg-black/10 rounded-full animate-pulse" />
          
          {/* Inner Circle */}
          <div className="relative w-24 h-24 bg-black rounded-2xl rotate-45 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-gray-800 to-black" />
            <div className="absolute inset-0 flex items-center justify-center -rotate-45">
              <div className="grid grid-cols-2 gap-1">
                <div className="w-3 h-3 bg-white/20 rounded-sm" />
                <div className="w-3 h-3 bg-white/40 rounded-sm" />
                <div className="w-3 h-3 bg-white/40 rounded-sm" />
                <div className="w-3 h-3 bg-white/20 rounded-sm" />
              </div>
            </div>
          </div>

          {/* Floating Icons */}
          <div className="absolute -top-2 -right-2">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping" />
              <ScanLine className="text-white relative z-10" size={16} />
            </div>
          </div>
          <div className="absolute -bottom-2 -left-2">
            <Radio className="text-black/30 animate-pulse" size={20} />
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Terminal size={14} className="text-black/50" />
            <p className="text-[11px] font-mono font-bold uppercase tracking-[0.3em] text-black/50">
              INITIALIZING
            </p>
          </div>
          
          {/* Progress Bar */}
          <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-black rounded-full animate-loading-bar" />
          </div>

          <p className="text-[10px] font-mono text-gray-400">
            Establishing secure channel...
          </p>
        </div>

        {/* Security Badge */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm">
          <Lock size={12} className="text-black/50" />
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-black/50">
            AES-256 ENCRYPTED
          </span>
          <Key size={12} className="text-black/50" />
        </div>
      </div>
    </div>
  );

  // --- 2. ERROR STATE (Redesigned) ---
  if (error || !role) return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-md w-full">
        {/* Error Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-red-100 shadow-xl overflow-hidden">
          {/* Top Bar */}
          <div className="h-2 bg-gradient-to-r from-red-500 to-red-600" />
          
          <div className="p-8 text-center">
            {/* Icon Container */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 bg-red-50 rounded-2xl animate-pulse" />
              <div className="relative w-full h-full bg-gradient-to-br from-red-50 to-white rounded-2xl border border-red-100 flex items-center justify-center">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-ping" />
            </div>

            {/* Error Message */}
            <h2 className="text-xl font-black tracking-tight text-gray-900 mb-2">
              Connection Interrupted
            </h2>
            <p className="text-gray-500 text-sm mb-8 font-mono bg-gray-50 p-3 rounded-xl border border-gray-100">
              {error}
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button 
                onClick={() => window.location.href = '/auth/login'}
                className="w-full py-4 bg-black text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-gray-800 transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                <Lock size={16} className="group-hover:rotate-12 transition-transform" />
                RE-AUTHENTICATE
              </button>
              
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-all duration-300"
              >
                Retry Connection
              </button>
            </div>
          </div>

          {/* Error Code */}
          <div className="border-t border-red-100 bg-red-50/50 px-6 py-3">
            <p className="text-[10px] font-mono text-red-600/70 text-center">
              ERROR_CODE: 0x{Math.random().toString(16).substring(2, 8).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Support Link */}
        <p className="text-center mt-4 text-[10px] text-gray-400">
          Need help? Contact{' '}
          <a href="/support" className="text-black underline underline-offset-4 hover:text-gray-600">
            protocol support
          </a>
        </p>
      </div>
    </div>
  );

  // --- 3. SUCCESS STATE (Redesigned) ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-10 relative">
          {/* Background Decoration */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-black/5 rounded-full blur-3xl" />
          
          {/* Header Content */}
          <div className="relative z-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-full">
                <Radio size={12} className="animate-pulse" />
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest">
                  {role}
                </span>
              </div>
              
              <div className="flex items-center gap-1 text-gray-300">
                <span className="text-[10px] font-mono">/</span>
                <span className="text-[10px] font-mono text-gray-400">secure</span>
                <span className="text-[10px] font-mono">/</span>
                <span className="text-[10px] font-mono text-gray-400">workspace</span>
              </div>

              {/* Status Indicator */}
              <div className="ml-auto flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full border border-green-100">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-mono font-bold text-green-700 uppercase tracking-widest">
                    Active Session
                  </span>
                </div>
              </div>
            </div>

            {/* Title Section */}
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-2">
                  Workspace
                  <span className="text-gray-200 mx-2">/</span>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                    Settings
                  </span>
                </h1>
                
                {/* Quick Stats */}
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <Shield size={12} className="text-black/50" />
                    <span className="text-[9px] font-mono font-bold text-black/50 uppercase tracking-widest">
                      ROLE: {role.toUpperCase()}
                    </span>
                  </div>
                  <div className="w-1 h-1 bg-gray-300 rounded-full" />
                  <div className="flex items-center gap-1.5">
                    <Fingerprint size={12} className="text-black/50" />
                    <span className="text-[9px] font-mono font-bold text-black/50 uppercase tracking-widest">
                      NODE: AUTHENTICATED
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button className="group px-6 py-3 bg-white border border-gray-200 rounded-2xl hover:border-gray-300 transition-all duration-300 shadow-sm hover:shadow flex items-center gap-2">
                <Settings2 size={16} className="group-hover:rotate-90 transition-transform duration-500" />
                <span className="text-xs font-bold uppercase tracking-widest">Configure</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="relative">
          {/* Decorative Elements */}
          <div className="absolute -inset-4 bg-gradient-to-r from-black/5 via-transparent to-black/5 rounded-[3rem] blur-2xl" />
          
          {/* Content Card */}
          <div className="relative bg-white/80 backdrop-blur-sm rounded-[2.5rem] border border-gray-200 shadow-2xl overflow-hidden">
            {/* Card Header */}
            <div className="px-8 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Workspace Configuration</h3>
                  <p className="text-[10px] font-mono text-gray-400">Role-specific settings panel</p>
                </div>
              </div>
              
              {/* Security Badges */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 bg-black/5 rounded-full">
                  <Lock size={10} className="text-black/50" />
                  <span className="text-[7px] font-mono font-bold text-black/50 uppercase">TLS 1.3</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-black/5 rounded-full">
                  <CheckCircle2 size={10} className="text-green-600" />
                  <span className="text-[7px] font-mono font-bold text-green-600 uppercase">Verified</span>
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
            <div className="px-8 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-4 text-gray-400">
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
                <Sparkles size={12} className="text-yellow-500" />
                <span className="text-[7px] font-mono text-gray-400">
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
              <Radio size={10} className="text-black/30" />
              <span className="text-[7px] font-mono text-black/30">NODE ACTIVE</span>
            </div>
            <div className="flex items-center gap-1">
              <Terminal size={10} className="text-black/30" />
              <span className="text-[7px] font-mono text-black/30">SESSION: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
          
          <div className="text-[7px] font-mono text-gray-300">
            © 2024 Aethel PayGuard • Sovereign Protocol
          </div>
        </div>
      </div>

      {/* Add custom animation keyframes in your global CSS */}
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