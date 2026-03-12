'use client';
import { useState, useEffect } from 'react';
import { AlertCircle, Shield, Fingerprint, Cpu } from 'lucide-react';

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
        // LoginPage stores it in both places; we prioritize localStorage 'auth_token' 
        // but fallback to cookie 'aethel_token' for total sync.
        const token = localStorage.getItem('auth_token') || getCookie('geon_token');
        const storedUser = localStorage.getItem('geon_user');

        if (!token || !storedUser) {
          throw new Error("Session expired. Please sign in again.");
        }

        const parsedUser = JSON.parse(storedUser);
        
        // 2. Normalize Role (Matches RootLayout/LoginPage logic)
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

  // --- 1. LOADING STATE ---
  if (loading) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-6">
      <div className="relative">
        <div className="absolute inset-0 bg-black/5 blur-xl rounded-full animate-pulse" />
        <Cpu className="animate-spin text-black relative z-10" size={32} strokeWidth={1.5} />
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-400 animate-pulse">
          Syncing Authorized Node
        </p>
      </div>
    </div>
  );

  // --- 2. ERROR STATE ---
  if (error || !role) return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-sm w-full border border-red-100 bg-white rounded-2xl p-8 text-center shadow-sm">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-100">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-gray-900 text-lg font-bold tracking-tight mb-2">Sync Interrupted</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">{error}</p>
        <button 
          onClick={() => window.location.href = '/auth/login'}
          className="w-full py-3 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all"
        >
          Return to Login
        </button>
      </div>
    </div>
  );

  // --- 3. SUCCESS STATE ---
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <header className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="px-2 py-0.5 bg-gray-900 rounded text-[9px] font-black uppercase tracking-widest text-white">
            Node: {role}
          </div>
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">/ Secure Environment</span>
        </div>
        <h2 className="text-3xl font-black tracking-tight text-gray-900">Workspace Settings</h2>
      </header>

      <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
        {role === 'influencer' && <InfluencerSettings data={data} />}
        {role === 'business' && <BusinessSettings data={data} />}
        {role === 'admin' && <AdminSettings />} {/* Removed data prop */}
      </section>

      <footer className="mt-8 flex items-center justify-between px-4">
        <div className="flex items-center gap-4 text-gray-400">
          <div className="flex items-center gap-1.5">
            <Shield size={12} />
            <span className="text-[10px] font-bold uppercase tracking-widest">E2E Encrypted Session</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Fingerprint size={12} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Authenticated Node</span>
          </div>
        </div>
      </footer>
    </div>
  );
}