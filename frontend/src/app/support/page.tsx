'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Lock, FileText, Gavel, ArrowLeft, Clock, 
  Loader2, AlertTriangle, RefreshCw,  
  History, LifeBuoy, Send, ExternalLink, 
  CheckCircle2, Menu, X, Scale, 
  ThumbsUp, ThumbsDown, MinusCircle, 
  Gem, BadgeCheck, Home, 
   Shield
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// --- CONFIGURATION ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Token expiration time (30 minutes)
const TOKEN_EXPIRY = 30 * 60 * 1000;

// --- TYPES & INTERFACES ---
type Role = 'influencer' | 'business' | 'admin' | 'operator';
type NavigationTab = 'disputes' | 'support' | 'history';

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: 'PENDING' | 'ACTIVE' | 'RESOLVED';
  createdAt: string; 
  message?: string;
  user_id?: string;
  user_name?: string;
}

interface DisputeCase {
  id: string;
  vaultTitle: string; 
  amount: number;
  initiator: string;
  initiator_id: string;
  counterparty: string;
  counterparty_id: string;
  reason: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED';
  riskScore: number; 
  description: string;
  evidence: { name: string; size: string; type: string; url: string }[];
  timeline: { event: string; date: string }[];
  assigned_admin?: string;
  verdict?: string;
  verdict_details?: string;
  resolved_at?: string;
}

interface UserIdentity {
  id?: string;
  operator_id: string;
  role: Role;
  fullName: string;
  email: string;
  login_timestamp?: number;
}

interface AdminQueue {
  pending: number;
  in_review: number;
  resolved_today: number;
  avg_resolution_time: string;
}

// Professional Logo Component
const GeonLogo = () => (
  <div className="relative flex items-center justify-center">
    <div className="relative w-8 h-8">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl rotate-6 shadow-lg" />
      <div className="absolute inset-[2px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg rotate-6" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Gem size={12} className="text-amber-400" strokeWidth={1.5} />
      </div>
      <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse" />
    </div>
  </div>
);

export default function GlobalResolutionCenter() {
  const router = useRouter();
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [userRole, setUserRole] = useState<Role>('influencer');
  const [activeTab, setActiveTab] = useState<NavigationTab>('disputes');
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [cases, setCases] = useState<DisputeCase[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [adminQueue, setAdminQueue] = useState<AdminQueue>({
    pending: 0,
    in_review: 0,
    resolved_today: 0,
    avg_resolution_time: '0h'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Standardized token function used across all pages
  const getToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    
    const localToken = localStorage.getItem('auth_token');
    if (localToken) return localToken;
    
    const getCookie = (name: string): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        const cookieValue = parts.pop();
        return cookieValue ? cookieValue.split(';').shift() || null : null;
      }
      return null;
    };
    
    return getCookie('geon_token');
  }, []);

  // Standardized headers function
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }, [getToken]);

  // Check token expiration
  const isTokenExpired = useCallback((loginTimestamp: number): boolean => {
    const now = Date.now();
    return now - loginTimestamp > TOKEN_EXPIRY;
  }, []);

  // Clear auth data and redirect to login
  const handleAuthError = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('geon_user');
    localStorage.removeItem('login_timestamp');
    document.cookie = 'geon_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    router.push('/auth/login?reason=expired');
  }, [router]);

  // Get user identity from localStorage (matching other pages)
  useEffect(() => {
    setMounted(true);
    
    const loadUser = () => {
      const storedUser = localStorage.getItem('geon_user');
      const token = getToken();
      const loginTimestamp = localStorage.getItem('login_timestamp');
      
      if (!token || !storedUser) {
        handleAuthError();
        return;
      }

      if (loginTimestamp) {
        const timestamp = parseInt(loginTimestamp);
        if (isTokenExpired(timestamp)) {
          handleAuthError();
          return;
        }
      }

      try {
        const parsed = JSON.parse(storedUser);
        const userData: UserIdentity = {
          id: parsed.id,
          operator_id: parsed.operator_id || parsed.id || '',
          role: (parsed.role as Role) || 'influencer',
          fullName: parsed.full_name || parsed.fullName || 'User',
          email: parsed.email || '',
          login_timestamp: parsed.login_timestamp || parseInt(loginTimestamp || '0')
        };
        setUser(userData);
        setUserRole(userData.role);
      } catch (err) {
        console.error("Failed to parse user data:", err);
        handleAuthError();
      }
    };

    loadUser();
  }, [router, getToken, handleAuthError, isTokenExpired]);

  // Activity listener for token expiration
  useEffect(() => {
    const checkTokenExpiration = () => {
      const loginTimestamp = localStorage.getItem('login_timestamp');
      const token = getToken();
      
      if (token && loginTimestamp) {
        const timestamp = parseInt(loginTimestamp);
        if (isTokenExpired(timestamp)) {
          handleAuthError();
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
  }, [getToken, handleAuthError, isTokenExpired]);

  // Fetch disputes and tickets
  const fetchDisputes = useCallback(async () => {
    if (!user?.operator_id) return;
    
    setLoading(true);
    setError(null);
    
    const token = getToken();
    if (!token) {
      setError("Authentication token not found. Please log in again.");
      handleAuthError();
      setLoading(false);
      return;
    }

    const headers = getAuthHeaders();

    try {
      const disputesUrl = `${API_BASE_URL}/api/v1/dispute/disputes?role=${user.role}&operator_id=${user.operator_id}`;
      const disputesResponse = await fetch(disputesUrl, { headers });
      
      if (disputesResponse.status === 401) {
        handleAuthError();
        return;
      }
      
      if (disputesResponse.status === 403) {
        throw new Error("Access denied: You don't have permission to view these disputes");
      }
      
      if (!disputesResponse.ok) {
        throw new Error(`Failed to fetch disputes: ${disputesResponse.status}`);
      }
      
      const disputesData = await disputesResponse.json();
      setCases(Array.isArray(disputesData) ? disputesData : []);

      const ticketsResponse = await fetch(`${API_BASE_URL}/api/v1/dispute/support?operator_id=${user.operator_id}`, {
        headers
      });
      
      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json();
        setTickets(Array.isArray(ticketsData) ? ticketsData : []);
      }

      if (user.role === 'admin') {
        const queueResponse = await fetch(`${API_BASE_URL}/api/v1/dispute/admin/queue`, { headers });
        if (queueResponse.ok) {
          const queueData = await queueResponse.json();
          setAdminQueue(queueData);
        }
      }

    } catch (err: any) {
      console.error("Sync error:", err);
      setError(err.message || "Failed to connect to resolution node. Please try again.");
      setCases([]);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [user, getToken, getAuthHeaders, handleAuthError]);

  useEffect(() => { 
    if (mounted && user?.operator_id) {
      fetchDisputes(); 
    }
  }, [fetchDisputes, user?.operator_id, mounted]);

  const stats = useMemo(() => ({
    totalLocked: cases.filter(c => c.status !== 'RESOLVED').reduce((acc, c) => acc + c.amount, 0),
    open: cases.filter(c => c.status !== 'RESOLVED').length,
    highRisk: cases.filter(c => c.riskScore > 75).length,
  }), [cases]);

  const canViewCase = useCallback((caseData: DisputeCase) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return caseData.initiator_id === user.operator_id || caseData.counterparty_id === user.operator_id;
  }, [user]);

  const canSubmitVerdict = userRole === 'admin';

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping" />
          <div className="relative w-16 h-16 bg-gradient-to-br from-amber-50 to-amber-100 rounded-full border-2 border-amber-200 flex items-center justify-center">
            <Loader2 className="text-amber-600 animate-spin" size={32} />
          </div>
        </div>
        <p className="text-xs font-mono text-slate-400">Authenticating...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition"
            >
              {mobileMenuOpen ? <X size={20} className="text-slate-600" /> : <Menu size={20} className="text-slate-600" />}
            </button>
            
            <div className="flex items-center gap-3">
              <GeonLogo />
              <div>
                <h1 className="text-sm font-black tracking-tight text-slate-900">
                  Resolution<span className="text-amber-600">.Hub</span>
                </h1>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield size={10} className="text-emerald-500" />
                  <span className="text-[8px] font-mono text-slate-400">Arbitration Node</span>
                </div>
              </div>
              {user.role === 'admin' && (
                <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-[8px] font-bold border border-purple-200">
                  ADMIN PANEL
                </span>
              )}
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <TabBtn 
              active={activeTab === 'disputes'} 
              onClick={() => {setActiveTab('disputes'); setView('list');}} 
              icon={<Gavel size={14}/>} 
              label="Disputes" 
            />
            <TabBtn 
              active={activeTab === 'support'} 
              onClick={() => setActiveTab('support')} 
              icon={<LifeBuoy size={14}/>} 
              label="Support" 
            />
            <TabBtn 
              active={activeTab === 'history'} 
              onClick={() => setActiveTab('history')} 
              icon={<History size={14}/>} 
              label="History" 
            />
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-3 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                user.role === 'admin' ? 'bg-purple-600' : 
                user.role === 'business' ? 'bg-amber-600' : 'bg-emerald-600'
              }`}>
                {user.fullName.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-900">{user.fullName.split(' ')[0]}</p>
                <p className="text-[8px] font-mono font-bold text-slate-400 uppercase">{user.role}</p>
              </div>
              <BadgeCheck size={10} className="text-emerald-500" />
            </div>
            
            <div className="sm:hidden w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
              {user.fullName.charAt(0)}
            </div>
            
            <button onClick={fetchDisputes} className="p-2 hover:bg-slate-100 rounded-xl border border-transparent hover:border-slate-200 transition-all">
              <RefreshCw size={16} className={loading ? "animate-spin text-amber-500" : "text-slate-400"} />
            </button>
            
            <button 
              onClick={() => router.push('/')}
              className="hidden sm:block p-2 hover:bg-slate-100 rounded-xl border border-transparent hover:border-slate-200 transition-all"
            >
              <Home size={16} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg p-4">
            <div className="flex flex-col space-y-2">
              <MobileTabBtn active={activeTab === 'disputes'} onClick={() => {setActiveTab('disputes'); setView('list'); setMobileMenuOpen(false);}} icon={<Gavel size={16}/>} label="Disputes" />
              <MobileTabBtn active={activeTab === 'support'} onClick={() => {setActiveTab('support'); setMobileMenuOpen(false);}} icon={<LifeBuoy size={16}/>} label="Support" />
              <MobileTabBtn active={activeTab === 'history'} onClick={() => {setActiveTab('history'); setMobileMenuOpen(false);}} icon={<History size={16}/>} label="History" />
              
              <div className="border-t border-slate-200 pt-4 mt-2">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold ${
                    user.role === 'admin' ? 'bg-purple-600' : 
                    user.role === 'business' ? 'bg-amber-600' : 'bg-emerald-600'
                  }`}>
                    {user.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{user.fullName}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                    <p className="text-[10px] font-mono font-bold text-slate-400 uppercase mt-1">Role: {user.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Admin Queue Stats */}
        {user.role === 'admin' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <AdminStatCard 
              label="Pending Review" 
              value={adminQueue.pending} 
              icon={Clock} 
              color="text-amber-600" 
              bgColor="bg-amber-50"
              borderColor="border-amber-200"
            />
            <AdminStatCard 
              label="In Progress" 
              value={adminQueue.in_review} 
              icon={Scale} 
              color="text-blue-600" 
              bgColor="bg-blue-50"
              borderColor="border-blue-200"
            />
            <AdminStatCard 
              label="Resolved Today" 
              value={adminQueue.resolved_today} 
              icon={CheckCircle2} 
              color="text-emerald-600" 
              bgColor="bg-emerald-50"
              borderColor="border-emerald-200"
            />
            <AdminStatCard 
              label="Avg. Resolution" 
              value={adminQueue.avg_resolution_time} 
              icon={History} 
              color="text-purple-600" 
              bgColor="bg-purple-50"
              borderColor="border-purple-200"
            />
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping" />
              <div className="relative w-16 h-16 bg-gradient-to-br from-amber-50 to-amber-100 rounded-full border-2 border-amber-200 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-amber-600" />
              </div>
            </div>
            <p className="text-xs font-mono font-bold text-slate-400">Syncing with Arbitration Node...</p>
          </div>
        ) : error ? (
          <ErrorState message={error} retry={fetchDisputes} />
        ) : activeTab === 'support' ? (
          <SupportView user={user} onTicketCreated={fetchDisputes} getAuthToken={getToken} />
        ) : activeTab === 'history' ? (
          <HistoryView tickets={tickets} user={user} />
        ) : (
          view === 'list' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard label="Total Frozen" value={`KES ${stats.totalLocked.toLocaleString()}`} icon={<Lock size={16}/>} color="text-rose-600" bgColor="bg-rose-50" />
                <StatCard label="Active Disputes" value={stats.open} icon={<Gavel size={16}/>} color="text-amber-600" bgColor="bg-amber-50" />
                <StatCard label="High Risk Alert" value={stats.highRisk} icon={<AlertTriangle size={16}/>} color="text-orange-600" bgColor="bg-orange-50" />
              </div>
              
              <CaseTable 
                cases={cases} 
                onSelect={(id) => {
                  const selectedCase = cases.find(c => c.id === id);
                  if (selectedCase && canViewCase(selectedCase)) {
                    setSelectedCaseId(id);
                    setView('detail');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    alert("You don't have permission to view this case");
                  }
                }} 
                userRole={user.role}
                user={user}
              />
            </div>
          ) : (
            <CaseDetailView 
              user={user}
              caseData={cases.find(c => c.id === selectedCaseId)!} 
              onBack={() => {
                setView('list');
                fetchDisputes();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              canSubmitVerdict={canSubmitVerdict}
              fetchDisputes={fetchDisputes}
              getAuthToken={getToken}
              handleAuthError={handleAuthError}
            />
          )
        )}
      </main>
    </div>
  );
}

// ==================== COMPONENTS ====================

function AdminStatCard({ label, value, icon: Icon, color, bgColor, borderColor }: any) {
  return (
    <div className={`bg-white border-2 ${borderColor} rounded-xl p-5 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={`p-2 ${bgColor} rounded-lg border ${borderColor}`}>
          <Icon size={16} className={color} />
        </div>
      </div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function StatCard({ label, value, icon, color = "text-slate-900", bgColor = "bg-slate-50" }: any) {
  return (
    <div className="bg-white border-2 border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">{label}</p>
          <p className={`text-lg sm:text-xl font-black ${color} truncate`}>{value}</p>
        </div>
        <div className={`p-3 ${bgColor} rounded-xl text-slate-500 group-hover:scale-110 transition-transform ml-2 shrink-0 border-2 border-slate-200`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function CaseTable({ cases, onSelect, userRole, user }: { cases: DisputeCase[], onSelect: (id: string) => void, userRole: Role, user: UserIdentity }) {
  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b-2 border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Dispute</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Parties</th>
              <th className="px-6 py-4">Your Role</th>
              <th className="px-6 py-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cases.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">No disputes found</td></tr>
            ) : (
              cases.map(c => {
                const userRoleInCase = c.initiator_id === user.operator_id ? 'Initiator' : 
                                      c.counterparty_id === user.operator_id ? 'Counterparty' : 
                                      userRole === 'admin' ? 'Arbitrator' : 'Observer';
                
                return (
                  <tr key={c.id} onClick={() => onSelect(c.id)} className="cursor-pointer hover:bg-slate-50 transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${c.riskScore > 75 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-black truncate max-w-[200px] group-hover:text-amber-600 transition-colors">{c.vaultTitle}</p>
                          <p className="text-xs text-slate-400 font-mono truncate">#{c.id.slice(0,8)} • {c.reason}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-slate-900">KES {c.amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <p className="font-bold text-slate-700">{c.initiator}</p>
                        <p className="text-slate-400 text-[10px] font-mono">vs {c.counterparty}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded-lg text-[10px] font-bold border ${
                        userRoleInCase === 'Initiator' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        userRoleInCase === 'Counterparty' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        userRoleInCase === 'Arbitrator' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        'bg-slate-50 text-slate-400 border-slate-200'
                      }`}>
                        {userRoleInCase}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-block px-2 py-1 rounded-lg text-[10px] font-bold border ${
                        c.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        c.status === 'UNDER_REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-orange-50 text-orange-700 border-orange-200'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden divide-y divide-slate-100">
        {cases.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No disputes found</div>
        ) : (
          cases.map(c => {
            const userRoleInCase = c.initiator_id === user.operator_id ? 'Initiator' : 
                                   c.counterparty_id === user.operator_id ? 'Counterparty' : 
                                   userRole === 'admin' ? 'Arbitrator' : 'Observer';
            
            return (
              <div key={c.id} onClick={() => onSelect(c.id)} className="p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${c.riskScore > 75 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <p className="text-sm font-black truncate">{c.vaultTitle}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${
                    c.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700' : 
                    c.status === 'UNDER_REVIEW' ? 'bg-amber-50 text-amber-700' :
                    'bg-orange-50 text-orange-700'
                  }`}>
                    {c.status}
                  </span>
                </div>
                
                <p className="text-xs text-slate-400 mb-2 font-mono">#{c.id.slice(0,8)} • {c.reason}</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-slate-900">KES {c.amount.toLocaleString()}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${
                    userRoleInCase === 'Initiator' ? 'bg-rose-50 text-rose-700' :
                    userRoleInCase === 'Counterparty' ? 'bg-blue-50 text-blue-700' :
                    userRoleInCase === 'Arbitrator' ? 'bg-purple-50 text-purple-700' :
                    'bg-slate-50 text-slate-400'
                  }`}>
                    {userRoleInCase}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function CaseDetailView({ user, caseData, onBack, canSubmitVerdict, fetchDisputes, getAuthToken, handleAuthError }: { 
  user: UserIdentity, 
  caseData: DisputeCase, 
  onBack: () => void,
  canSubmitVerdict: boolean,
  fetchDisputes: () => void,
  getAuthToken: () => string | null,
  handleAuthError: () => void
}) {
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [verdictNote, setVerdictNote] = useState('');

  const handleVerdict = async (verdict: string) => {
    if (!confirm(`Submit ${verdict.toUpperCase()} verdict? This action cannot be undone.`)) return;
    
    setSubmitting(true);
    const token = getAuthToken();
    
    if (!token) {
      handleAuthError();
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/dispute/disputes/${caseData.id}/verdict`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          verdict: verdict,
          notes: verdictNote
        })
      });
      
      if (response.status === 401) {
        handleAuthError();
        return;
      }
      
      if (response.status === 403) {
        alert("You don't have permission to submit a verdict on this case.");
        return;
      }
      
      if (response.ok) {
        alert("Verdict submitted successfully!");
        fetchDisputes();
        onBack();
      } else {
        const error = await response.json();
        alert(error.detail || "Failed to submit verdict.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignToMe = async () => {
    const token = getAuthToken();
    if (!token) {
      handleAuthError();
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/dispute/admin/assign/${caseData.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ admin_id: user.operator_id })
      });
      
      if (response.status === 401) {
        handleAuthError();
        return;
      }
      
      if (response.ok) {
        alert("Case assigned to you");
        fetchDisputes();
      }
    } catch (err) {
      console.error("Assignment failed", err);
    }
  };

  const isInvolved = user.role === 'admin' || 
                     caseData.initiator_id === user.operator_id || 
                     caseData.counterparty_id === user.operator_id;

  if (!isInvolved) {
    return (
      <div className="text-center py-12 sm:py-20 px-4">
        <div className="w-20 h-20 bg-amber-50 rounded-full border-2 border-amber-200 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="text-amber-600" size={32} />
        </div>
        <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">Access Denied</h3>
        <p className="text-sm text-slate-400 mb-6">You don't have permission to view this case.</p>
        <button onClick={onBack} className="bg-slate-900 text-white px-6 sm:px-8 py-3 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg">
          Return to Registry
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-900 mb-6 transition-colors group">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform"/> Back to Registry
      </button>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Case Header */}
          <div className="bg-white border-2 border-slate-200 p-6 rounded-xl shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-black truncate text-slate-900">{caseData.vaultTitle}</h2>
                <p className="text-xs font-mono text-slate-400 mt-1">Case #{caseData.id}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xl sm:text-2xl font-black text-amber-600">KES {caseData.amount.toLocaleString()}</p>
                <p className="text-xs font-bold text-slate-400">Escrow Locked</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
                <p className="text-xs font-bold text-slate-400 mb-1">Initiator</p>
                <p className="text-sm font-black truncate text-slate-900">{caseData.initiator}</p>
                <p className="text-[10px] font-mono text-slate-400 mt-1">{caseData.initiator_id}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
                <p className="text-xs font-bold text-slate-400 mb-1">Counterparty</p>
                <p className="text-sm font-black truncate text-slate-900">{caseData.counterparty}</p>
                <p className="text-[10px] font-mono text-slate-400 mt-1">{caseData.counterparty_id}</p>
              </div>
            </div>
            
            <div className="bg-slate-50 p-5 rounded-xl border-2 border-slate-200">
              <p className="text-xs font-bold text-slate-400 mb-2">Dispute Description</p>
              <p className="text-sm text-slate-700 font-medium">"{caseData.description}"</p>
            </div>
          </div>

          {/* Evidence */}
          <div className="bg-white border-2 border-slate-200 p-6 rounded-xl shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Evidence</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {caseData.evidence?.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noreferrer" 
                   className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border-2 border-slate-200 hover:border-amber-200 hover:bg-amber-50/30 transition-all group">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={16} className="text-slate-400 group-hover:text-amber-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-black truncate text-slate-900">{f.name}</p>
                      <p className="text-[10px] font-mono text-slate-400">{f.size}</p>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-slate-300 group-hover:text-amber-600 shrink-0 ml-2" />
                </a>
              ))}
              {(!caseData.evidence || caseData.evidence.length === 0) && (
                <p className="text-sm text-slate-400 py-4 italic col-span-2 text-center">No evidence uploaded</p>
              )}
            </div>
          </div>

          {/* Comment Section */}
          {user.role !== 'admin' && caseData.status !== 'RESOLVED' && (
            <div className="bg-white border-2 border-slate-200 p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Add Comment</h3>
                <button onClick={() => setShowCommentBox(!showCommentBox)} className="text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors">
                  {showCommentBox ? 'Cancel' : 'Add Comment'}
                </button>
              </div>
              
              {showCommentBox && (
                <div className="space-y-4">
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                    placeholder="Add your response..." className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all resize-none" rows={4} />
                  <button onClick={() => { alert("Comment functionality coming soon!"); setComment(''); setShowCommentBox(false); }}
                    disabled={!comment.trim()} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 shadow-md">
                    Submit Comment
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Timeline */}
          <div className="bg-white border-2 border-slate-200 p-6 rounded-xl shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Timeline</h3>
            <div className="space-y-4">
              {caseData.timeline?.map((t, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-amber-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900">{t.event}</p>
                    <p className="text-xs font-mono text-slate-400">{t.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Actions */}
          {canSubmitVerdict && caseData.status !== 'RESOLVED' ? (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-xl shadow-xl border border-slate-700">
              <h3 className="text-xs font-bold text-slate-400 mb-4 text-center uppercase tracking-wider">Admin Verdict</h3>
              
              {!caseData.assigned_admin && (
                <button onClick={handleAssignToMe} className="w-full mb-4 bg-purple-600 py-3 rounded-xl text-xs font-bold hover:bg-purple-700 transition-all shadow-lg flex items-center justify-center gap-2">
                  <Shield size={14} /> Assign to Me
                </button>
              )}
              
              {caseData.assigned_admin === user.operator_id && (
                <p className="text-xs text-emerald-400 mb-3 text-center font-bold flex items-center justify-center gap-1">
                  <BadgeCheck size={12} /> ✓ Assigned to you
                </p>
              )}
              
              <textarea value={verdictNote} onChange={(e) => setVerdictNote(e.target.value)}
                placeholder="Add verdict notes..." className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-3 text-xs text-white mb-4 resize-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all" rows={3} />
              
              <div className="space-y-3">
                <button disabled={submitting} onClick={() => handleVerdict('influencer')} 
                  className="w-full bg-rose-600 py-4 rounded-xl text-xs font-bold hover:bg-rose-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
                  {submitting ? <Loader2 className="animate-spin" size={16}/> : <ThumbsUp size={14} />} Release to Initiator
                </button>
                <button disabled={submitting} onClick={() => handleVerdict('business')} 
                  className="w-full bg-slate-800 py-4 rounded-xl text-xs font-bold hover:bg-slate-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-slate-700">
                  {submitting ? <Loader2 className="animate-spin" size={16}/> : <ThumbsDown size={14} />} Refund to Counterparty
                </button>
                <button disabled={submitting} onClick={() => handleVerdict('split')} 
                  className="w-full bg-white text-slate-900 py-4 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
                  {submitting ? <Loader2 className="animate-spin" size={16}/> : <MinusCircle size={14} />} 50/50 Split
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-slate-200 p-6 rounded-xl text-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
                caseData.status === 'RESOLVED' ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-amber-50 border-2 border-amber-200'
              }`}>
                {caseData.status === 'RESOLVED' ? (
                  <CheckCircle2 className="text-emerald-600" size={24} />
                ) : (
                  <Clock className="text-amber-600" size={24} />
                )}
              </div>
              <p className="text-sm font-black text-slate-900">
                {caseData.status === 'RESOLVED' ? 'Case Resolved' : 'Awaiting Arbitration'}
              </p>
              {caseData.verdict && (
                <p className="text-xs font-bold text-slate-500 mt-2">Verdict: {caseData.verdict}</p>
              )}
              {caseData.verdict_details && (
                <p className="text-xs text-slate-400 mt-1 italic font-medium">"{caseData.verdict_details}"</p>
              )}
            </div>
          )}

          {/* Role Indicator */}
          <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-xl text-center">
            <p className="text-xs font-bold text-slate-400">Your Role</p>
            <p className="text-sm font-black text-slate-900 mt-1">
              {caseData.initiator_id === user.operator_id ? 'Initiator' : 
               caseData.counterparty_id === user.operator_id ? 'Counterparty' : 
               'Arbitrator'}
            </p>
            <BadgeCheck size={12} className="mx-auto mt-2 text-emerald-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SupportView({ user, onTicketCreated, getAuthToken }: { user: UserIdentity, onTicketCreated: () => void, getAuthToken: () => string | null }) {
  const [form, setForm] = useState({ category: 'Technical', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    const token = getAuthToken();
    
    if (!token) {
      alert("Authentication token not found. Please log in again.");
      setSending(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/dispute/support`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category: form.category,
          subject: form.subject,
          message: form.message,
          operator_id: user.operator_id,
          role: user.role
        })
      });
      
      if (response.status === 401) {
        alert("Session expired. Please log in again.");
        window.location.href = '/auth/login';
        return;
      }
      
      if (response.status === 403) {
        alert("You don't have permission to create support tickets.");
        return;
      }
      
      if (response.ok) {
        setSent(true);
        onTicketCreated();
      } else {
        const error = await response.json();
        alert(error.detail || "Failed to create ticket.");
      }
    } catch {
      alert("Network error. Please check your connection.");
    } finally {
      setSending(false);
    }
  };

  if (sent) return <SuccessCard onReset={() => setSent(false)} />;

  return (
    <div className="max-w-2xl mx-auto bg-white border-2 border-slate-200 p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-black text-slate-900 mb-6">Support Ticket</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Category</label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
              className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-medium">
              <option>Technical</option>
              <option>Escalation</option>
              <option>Payment</option>
              <option>Dispute</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Subject</label>
            <input required value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} 
              className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all" 
              placeholder="Brief summary" />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Message</label>
          <textarea required value={form.message} onChange={e => setForm({...form, message: e.target.value})} 
            rows={5} className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all resize-none" 
            placeholder="Describe your issue..." />
        </div>
        <button type="submit" disabled={sending} 
          className="w-full bg-slate-900 text-white py-4 rounded-xl text-sm font-bold hover:bg-amber-600 transition-all disabled:bg-slate-200 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg">
          {sending ? <><Loader2 className="animate-spin" size={16} /> Submitting...</> : <>Submit Ticket <Send size={16} /></>}
        </button>
        <p className="text-xs font-mono text-slate-400 text-center">Submitting as {user.fullName} ({user.role})</p>
      </form>
    </div>
  );
}

function HistoryView({ tickets }: { tickets: SupportTicket[], user: UserIdentity }) {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-xl font-black text-slate-900 mb-6">Support History</h2>
      <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {tickets.length === 0 ? (
          <div className="p-12 text-center">
            <History className="mx-auto text-slate-200 mb-4" size={48}/>
            <p className="text-sm text-slate-400 font-bold">No support tickets found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b-2 border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Ticket</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 hidden sm:table-cell">Created</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t, i) => (
                  <tr key={t.id || i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-black truncate max-w-[200px] text-slate-900">{t.subject}</p>
                      <p className="text-xs font-mono text-slate-400">#{t.id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">{t.category}</td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-400 hidden sm:table-cell">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-block px-2 py-1 rounded-lg text-[10px] font-bold border ${
                        t.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        t.status === 'ACTIVE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
      active ? 'bg-white shadow-md text-slate-900 border-2 border-slate-200' : 'text-slate-400 hover:text-slate-600'
    }`}>
      {icon} {label}
    </button>
  );
}

function MobileTabBtn({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`w-full px-4 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-3 border-2 ${
      active ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
    }`}>
      {icon} {label}
    </button>
  );
}

function SuccessCard({ onReset }: { onReset: () => void }) {
  return (
    <div className="max-w-md mx-auto py-12 text-center">
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping" />
        <div className="relative w-20 h-20 bg-emerald-50 rounded-full border-2 border-emerald-200 flex items-center justify-center">
          <CheckCircle2 className="text-emerald-600" size={32} />
        </div>
      </div>
      <h2 className="text-xl font-black text-slate-900 mb-2">Ticket Submitted</h2>
      <p className="text-sm text-slate-400 mb-6">Your support request has been received.</p>
      <button onClick={onReset} className="bg-slate-900 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-amber-600 transition-all shadow-lg">
        Create Another
      </button>
    </div>
  );
}

function ErrorState({ message, retry }: { message: string, retry: () => void }) {
  return (
    <div className="max-w-2xl mx-auto bg-rose-50 border-2 border-rose-200 p-8 rounded-xl text-center">
      <div className="w-16 h-16 bg-rose-100 rounded-full border-2 border-rose-200 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="text-rose-600" size={28} />
      </div>
      <h2 className="text-lg font-black text-rose-900 mb-2">Connection Error</h2>
      <p className="text-sm text-rose-600 mb-6">{message}</p>
      <button onClick={retry} className="bg-rose-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-rose-700 transition-all shadow-lg">
        Retry Connection
      </button>
    </div>
  );
}