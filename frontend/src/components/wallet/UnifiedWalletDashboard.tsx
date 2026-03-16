'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowUpRight, ArrowDownLeft, RefreshCcw, Smartphone, 
  ShieldCheck, AlertCircle, PieChart, Activity, 
  RefreshCw, Plus, CreditCard, Building2, UserCircle,
  History, Wallet, TrendingUp, Download,
  Calendar, BarChart3, ExternalLink, 
  Clock, BadgeCheck, Gem,
    Home, 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Modals
import AddFundsModal from '@/components/wallet/AddFundsModal';
import WithdrawalModal from '@/components/wallet/WithdrawalModal';
import ConvertModal from '@/components/wallet/ConvertModal';

// Shared Components
import { RevenueStatCard } from '@/components/wallet/RevenueStatCard';

/* =========================
   UTILITY: AUTHENTICATED FETCH
   Synced with LoginPage localStorage keys
========================= */
const authenticatedFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  if (!token) {
    console.warn("No authentication token found");
    return new Response(JSON.stringify({ detail: "Session expired" }), { status: 401 });
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token.trim()}`,
    ...options.headers,
  };

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, { ...options, headers });
    
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('geon_user');
      window.location.href = '/auth/login?reason=expired';
    }
    
    return response;
  } catch (err) {
    console.error("Network error during fetch:", err);
    throw err;
  }
};

/* =========================
   TYPES & INTERFACES
========================= */
interface Transaction {
  id: string;
  tx_ref?: string;
  tx_type: 'deposit' | 'withdrawal' | 'transfer' | 'conversion' | 'escrow_lock' | 'escrow_release';
  status: 'completed' | 'processing' | 'failed' | 'pending';
  currency: string;
  amount: string | number;
  created_at: string;
  provider?: 'gateway' | 'internal';
  provider_ref?: string;
}

interface UserIdentity {
  id: string;
  operator_id: string;
  fullName: string;
  wallet_address: string;
  role: 'admin' | 'business' | 'influencer' | '';
  email?: string;
  phone?: string;
}

interface RevenueStats {
  total_kes: number;
  fees_kes: number;
  net_kes: number;
  daily_volume?: number[];
  weekly_volume?: number[];
  monthly_volume?: number[];
  gateway_fees?: number;
  platform_fees?: number;
}

interface WalletBalance {
  balance_kes: number;
  balance_usdt: number;
  pending_kes: number;
  pending_usdt: number;
  gateway_balance?: number;
  last_sync?: string;
}

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

export default function UnifiedWalletDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'personal' | 'billing' | 'revenue'>('personal');
  const [mounted, setMounted] = useState(false);
  const [identity, setIdentity] = useState<UserIdentity>({ 
    id: '', 
    operator_id: '', 
    fullName: '', 
    wallet_address: '',
    role: '' 
  });

  useEffect(() => {
    setMounted(true);
    const fetchUser = async () => {
        try {
            const savedUser = localStorage.getItem('geon_user');
            if (savedUser) {
                const parsed = JSON.parse(savedUser);
                setIdentity({
                    id: parsed.id,
                    operator_id: parsed.operator_id,
                    fullName: parsed.full_name,
                    wallet_address: parsed.wallet_address || '',
                    role: parsed.role,
                    email: parsed.email,
                    phone: parsed.phone
                });
                
                if (parsed.role === 'admin') {
                  setActiveTab('revenue');
                } else if (parsed.role === 'business') {
                  setActiveTab('billing');
                } else {
                  setActiveTab('personal');
                }
            }

            const res = await authenticatedFetch('/api/v1/auth/me');
            if (res.ok) {
                const user = await res.json();
                const rawRole = (user.role || '').toLowerCase();
                let role: UserIdentity['role'] = 'influencer';
                if (rawRole === 'admin') role = 'admin';
                else if (['business', 'brand', 'operator', 'enterprise'].includes(rawRole)) role = 'business';

                setIdentity({ 
                    id: user.id,
                    operator_id: user.operator_id, 
                    fullName: user.full_name,
                    wallet_address: user.wallet_address || '',
                    role: role,
                    email: user.email,
                    phone: user.phone
                });
            } else if (res.status === 401) {
                router.push('/auth/login');
            }
        } catch (e) { console.error("Auth sync failed", e); }
    };
    fetchUser();
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Header - Matching other pages */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GeonLogo />
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">Financial Hub</h1>
              <p className="text-xs text-slate-400">Secure payment gateway integration</p>
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

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${
              identity.role === 'admin' ? 'bg-purple-600' : 
              identity.role === 'business' ? 'bg-amber-600' : 'bg-emerald-600'
            }`}>
              {identity.role === 'admin' ? <BarChart3 size={22} /> : 
               identity.role === 'business' ? <Building2 size={22} /> : <Wallet size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">
                  {identity.role === 'admin' ? 'Revenue Dashboard' : 
                   identity.role === 'business' ? 'Business Financial Hub' : 'Personal Wallet'}
                </h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                  identity.role === 'business' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                  identity.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                  'bg-emerald-100 text-emerald-700 border-emerald-200'
                }`}>
                  {identity.role || 'Loading...'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs font-mono text-slate-400">ID: {identity.operator_id || '...'}</p>
                <BadgeCheck size={12} className="text-emerald-500" />
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {identity.role === 'influencer' && (
              <TabBtn active={activeTab === 'personal'} onClick={() => setActiveTab('personal')} label="Personal" icon={UserCircle} />
            )}
            
            {identity.role === 'business' && (
              <>
                <TabBtn active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} label="Billing" icon={CreditCard} />
              </>
            )}
            
            {identity.role === 'admin' && (
              <TabBtn active={activeTab === 'revenue'} onClick={() => setActiveTab('revenue')} label="Revenue" icon={BarChart3} />
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="min-h-[400px]">
          {identity.role === 'admin' ? (
            <RevenueTabContent identity={identity} />
          ) : (
            <>
              {activeTab === 'personal' && <PersonalTab identity={identity} />}
              {activeTab === 'billing' && <BusinessBillingTab />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================
   TAB 1: PERSONAL (Influencers only)
========================= */
function PersonalTab({ identity }: { identity: UserIdentity }) {
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [balances, setBalances] = useState<WalletBalance>({ 
    balance_kes: 0, 
    balance_usdt: 0,
    pending_kes: 0,
    pending_usdt: 0 
  });
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string>('');

  const sync = useCallback(async () => {
    try {
      const res = await authenticatedFetch('/api/v1/wallet/balance');
      if (res.ok) {
        const data = await res.json();
        setBalances({
          balance_kes: data.balance_kes ?? data.kes_balance ?? 0,
          balance_usdt: data.balance_usdt ?? data.usdt_balance ?? 0,
          pending_kes: data.pending_kes ?? 0,
          pending_usdt: data.pending_usdt ?? 0,
          last_sync: data.last_sync || new Date().toISOString()
        });
        setLastSync(new Date().toLocaleTimeString());
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { sync(); }, [sync]);

  const formatKES = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2 });
  const formatUSDT = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BalancePanel 
            label="KES Wallet" 
            value={formatKES(balances.balance_kes)} 
            pending={balances.pending_kes > 0 ? `+${formatKES(balances.pending_kes)} pending` : undefined}
            currency="KES" 
            icon={Smartphone} 
            loading={loading} 
          />
          <BalancePanel 
            label="USDT Wallet" 
            value={formatUSDT(balances.balance_usdt)} 
            pending={balances.pending_usdt > 0 ? `+${formatUSDT(balances.pending_usdt)} pending` : undefined}
            currency="USDT" 
            icon={Wallet} 
            loading={loading} 
          />
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History size={18} className="text-slate-400" />
              <h3 className="text-sm font-black text-slate-900">Recent Activity</h3>
            </div>
            {lastSync && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Clock size={10} />
                <span>Last sync: {lastSync}</span>
              </div>
            )}
          </div>
          <RecentActivityList />
        </div>
      </div>

      <div className="lg:col-span-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-400 px-2 uppercase tracking-wider">Quick Actions</h3>
        <ActionBtn 
          icon={ArrowDownLeft} 
          label="Deposit Funds" 
          sub="Add money to your wallet" 
          onClick={() => setIsDepositOpen(true)} 
        />
        <ActionBtn 
          icon={ArrowUpRight} 
          label="Withdraw" 
          sub="Transfer to your bank or crypto" 
          onClick={() => setIsWithdrawOpen(true)} 
        />
        <ActionBtn 
          icon={RefreshCcw} 
          label="Convert" 
          sub="Swap between KES & USDT" 
          onClick={() => setIsConvertOpen(true)} 
        />
        
        {/* Gateway Info - Hidden identity */}
        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-center gap-2 text-xs text-amber-700">
            <ShieldCheck size={14} className="text-amber-600" />
            <span className="font-bold">Secured Payment Gateway</span>
          </div>
          <p className="text-[10px] text-amber-600/70 mt-1">Transactions processed via trusted partners</p>
        </div>
      </div>

      <AddFundsModal 
        isOpen={isDepositOpen} 
        onClose={() => setIsDepositOpen(false)} 
        onSuccess={sync} 
      />
      <WithdrawalModal 
        isOpen={isWithdrawOpen} 
        onClose={() => setIsWithdrawOpen(false)} 
        balances={{
          kes: formatKES(balances.balance_kes),
          usdt: formatUSDT(balances.balance_usdt)
        }} 
        isConnected={!!identity.wallet_address} 
        walletAddress={identity.wallet_address} 
      />
      <ConvertModal 
        isOpen={isConvertOpen} 
        onClose={() => setIsConvertOpen(false)} 
        balances={{
          kes: formatKES(balances.balance_kes),
          usdt: formatUSDT(balances.balance_usdt)
        }} 
        onSuccess={sync}
      />
    </div>
  );
}

/* =========================
   TAB 2: BILLING (Business only)
========================= */
function BusinessBillingTab() {
  const [data, setData] = useState<{
    balance_kes: number;
    balance_usdt: number;
    pending_kes: number;
    pending_usdt: number;
    transactions: Transaction[];
    isLocked: boolean;
    gateway_balance?: number;
  }>({ 
    balance_kes: 0, 
    balance_usdt: 0, 
    pending_kes: 0,
    pending_usdt: 0,
    transactions: [], 
    isLocked: false 
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);

  const fetchData = useCallback(async () => {
    setSyncing(true);
    try {
      const [balRes, histRes, statsRes] = await Promise.all([
        authenticatedFetch('/api/v1/wallet/balance'),
        authenticatedFetch('/api/v1/wallet/history?limit=50'),
        authenticatedFetch('/api/v1/wallet/payment/stats')
      ]);
      
      if (balRes.ok && histRes.ok) {
          const balance = await balRes.json();
          const history = await histRes.json();
          const stats = statsRes.ok ? await statsRes.json() : null;
          
          setData({
            balance_kes: balance.balance_kes ?? balance.kes_balance ?? 0,
            balance_usdt: balance.balance_usdt ?? balance.usdt_balance ?? 0,
            pending_kes: balance.pending_kes ?? 0,
            pending_usdt: balance.pending_usdt ?? 0,
            transactions: Array.isArray(history) ? history : [], 
            isLocked: balance.is_locked ?? false,
            gateway_balance: stats?.balance ?? 0
          });
      }
    } catch (err) { console.error(err); } finally { setLoading(false); setSyncing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (data.isLocked) return <LockedState />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-amber-600 to-amber-500 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-xs text-amber-100 mb-2 font-bold uppercase tracking-wider">Company Balance</p>
              <p className="text-3xl font-black">KES {loading ? '...' : data.balance_kes.toLocaleString()}</p>
              {data.pending_kes > 0 && (
                <p className="text-xs text-amber-200 mt-1 flex items-center gap-1">
                  <Clock size={10} /> {data.pending_kes.toLocaleString()} pending
                </p>
              )}
              <button 
                onClick={() => setShowAddFunds(true)} 
                className="mt-4 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors backdrop-blur-sm border border-white/30"
              >
                <Plus size={14}/> Top Up via Gateway
              </button>
            </div>
            <div className="absolute top-0 right-0 text-white/10">
              <Building2 size={120} />
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={16} className="text-amber-500"/>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Crypto Reserve</p>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {loading ? '...' : data.balance_usdt.toLocaleString()} 
              <span className="text-sm font-normal text-slate-400 ml-2">USDT</span>
            </p>
            {data.pending_usdt > 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <Clock size={10} /> {data.pending_usdt.toLocaleString()} pending
              </p>
            )}
          </div>
        </div>
        
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-4">
            <Activity size={16} className="text-amber-500"/> 
            Gateway Status
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Provider</span>
              <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">ACTIVE</span>
            </div>
            {data.gateway_balance !== undefined && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Gateway Balance</span>
                <span className="text-slate-900 font-bold">KES {data.gateway_balance?.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Last Sync</span>
              <span className="text-slate-900 font-mono">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
          <button 
            onClick={fetchData} 
            className="w-full mt-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''}/>
            Sync with Gateway
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-amber-50/30 to-white">
          <span className="text-sm font-black text-slate-900">Transaction Ledger</span>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verified</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="px-6 py-3 text-left font-bold">Reference</th>
                <th className="px-6 py-3 text-left font-bold">Type</th>
                <th className="px-6 py-3 text-left font-bold">Provider</th>
                <th className="px-6 py-3 text-left font-bold">Status</th>
                <th className="px-6 py-3 text-right font-bold">Net Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.transactions.length > 0 ? data.transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-900">{tx.tx_ref || tx.id.slice(0,8)}</div>
                    <div className="text-xs text-slate-400 font-mono">{new Date(tx.created_at).toLocaleString()}</div>
                    {tx.provider_ref && (
                      <div className="text-[10px] text-slate-300">Ref: {tx.provider_ref.slice(0,8)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-1 bg-slate-100 rounded-full text-slate-600 capitalize font-bold">
                      {tx.tx_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-400 font-mono">
                      {tx.provider || 'internal'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                      tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                      tx.status === 'failed' ? 'bg-rose-100 text-rose-700' : 
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-900">
                    {tx.currency} {Number(tx.amount).toLocaleString()}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No ledger entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <AddFundsModal isOpen={showAddFunds} onClose={() => setShowAddFunds(false)} onSuccess={fetchData} />
    </div>
  );
}

/* =========================
   TAB 3: REVENUE (ADMIN ONLY)
========================= */
function RevenueTabContent({ identity }: { identity: UserIdentity }) {
  const [stats, setStats] = useState<RevenueStats>({ 
    total_kes: 0, 
    fees_kes: 0, 
    net_kes: 0,
    gateway_fees: 0,
    platform_fees: 0 
  });
  const [loading, setLoading] = useState(true);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [gatewayMetrics, setGatewayMetrics] = useState<any>(null);

  const fetchRevenueData = useCallback(async () => {
    try {
      const [metRes, balRes, volRes, gatewayRes] = await Promise.all([
        authenticatedFetch('/api/v1/wallet/withdrawals/metrics'),
        authenticatedFetch('/api/v1/wallet/balance'),
        authenticatedFetch(`/api/v1/admin/revenue/volume?timeframe=${timeframe}`),
        authenticatedFetch('/api/v1/admin/gateway/metrics')
      ]);
      
      if (metRes.ok && balRes.ok) {
        const m = await metRes.json();
        const b = await balRes.json();
        const v = volRes.ok ? await volRes.json() : null;
        const g = gatewayRes.ok ? await gatewayRes.json() : null;
        
        const gatewayFeeRate = 0.015;
        const platformFeeRate = 0.005;
        
        setStats({ 
          total_kes: m.totalAmount || 0, 
          fees_kes: (m.totalAmount || 0) * (gatewayFeeRate + platformFeeRate), 
          net_kes: b.balance_kes ?? b.kes_balance ?? 0,
          gateway_fees: (m.totalAmount || 0) * gatewayFeeRate,
          platform_fees: (m.totalAmount || 0) * platformFeeRate,
          daily_volume: v?.daily || [],
          weekly_volume: v?.weekly || [],
          monthly_volume: v?.monthly || []
        });
        
        setGatewayMetrics(g);
      }
    } catch (err) {
      console.error("Failed to load revenue stats:", err);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 p-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">Platform Revenue</h2>
          <p className="text-sm text-slate-500">Monitor earnings and gateway fees</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 outline-none focus:border-purple-400 font-bold"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button
            onClick={fetchRevenueData}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <RevenueStatCard 
          label="Gross Revenue" 
          value={`KES ${stats.total_kes.toLocaleString()}`} 
          icon={TrendingUp} 
          loading={loading}
          className="border-l-4 border-purple-500"
        />
        <RevenueStatCard 
          label="Gateway Fees" 
          value={`KES ${(stats.gateway_fees || 0).toLocaleString()}`} 
          icon={ExternalLink} 
          loading={loading}
        />
        <RevenueStatCard 
          label="Platform Fees" 
          value={`KES ${(stats.platform_fees || 0).toLocaleString()}`} 
          icon={PieChart} 
          loading={loading}
        />
        <RevenueStatCard 
          label="Available Balance" 
          value={`KES ${stats.net_kes.toLocaleString()}`} 
          icon={Wallet} 
          highlight 
          loading={loading}
        />
      </div>

      {/* Volume Chart Placeholder */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black text-slate-700">Revenue Volume</h3>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <span className="text-xs text-slate-500 capitalize font-bold">{timeframe} Overview</span>
          </div>
        </div>
        
        {loading ? (
          <div className="h-48 bg-slate-100 animate-pulse rounded-xl" />
        ) : (
          <div className="h-48 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-sm text-slate-400">Revenue chart visualization</p>
          </div>
        )}
      </div>

      {/* Gateway Metrics - Hidden identity */}
      {gatewayMetrics && (
        <div className="bg-purple-50 rounded-2xl border border-purple-200 p-6">
          <h3 className="text-sm font-black text-purple-900 mb-4 flex items-center gap-2">
            <ShieldCheck size={16} />
            Payment Gateway Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-purple-600 font-bold">Total Transactions</p>
              <p className="text-xl font-black text-purple-900">{gatewayMetrics.total_transactions || 0}</p>
            </div>
            <div>
              <p className="text-xs text-purple-600 font-bold">Success Rate</p>
              <p className="text-xl font-black text-purple-900">{gatewayMetrics.success_rate || 98}%</p>
            </div>
            <div>
              <p className="text-xs text-purple-600 font-bold">Avg. Processing</p>
              <p className="text-xl font-black text-purple-900">{gatewayMetrics.avg_time || '2.5s'}</p>
            </div>
            <div>
              <p className="text-xs text-purple-600 font-bold">Settlements</p>
              <p className="text-xl font-black text-purple-900">KES {gatewayMetrics.total_settled || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Section */}
      <div className="bg-purple-50 rounded-2xl border border-purple-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-200 rounded-xl flex items-center justify-center">
              <Download size={18} className="text-purple-700" />
            </div>
            <div>
              <p className="text-sm font-black text-purple-900">Platform Withdrawals</p>
              <p className="text-xs text-purple-600">Withdraw platform fees to your wallet</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsWithdrawOpen(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-700 transition-all shadow-sm"
          >
            <Download size={16} />
            Withdraw Funds
          </button>
        </div>
      </div>

      {/* Withdrawal Modal */}
      <WithdrawalModal 
        isOpen={isWithdrawOpen} 
        onClose={() => setIsWithdrawOpen(false)} 
        balances={{
          kes: stats.net_kes.toLocaleString(undefined, { minimumFractionDigits: 2 }),
          usdt: '0.00'
        }}
        isConnected={!!identity.wallet_address}
        walletAddress={identity.wallet_address}
      />
    </div>
  );
}

/* =========================
   SHARED SUB-COMPONENTS
========================= */
function RecentActivityList() {
    const [history, setHistory] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authenticatedFetch('/api/v1/wallet/history?limit=10')
          .then(async r => {
            if (r.ok) {
              const json = await r.json();
              setHistory(json as Transaction[]);
            }
          })
          .finally(() => setLoading(false));
    }, []);

    if (loading) {
      return (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="animate-pulse flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                <div>
                  <div className="h-4 w-24 bg-slate-200 rounded mb-2" />
                  <div className="h-3 w-16 bg-slate-200 rounded" />
                </div>
              </div>
              <div className="text-right">
                <div className="h-4 w-20 bg-slate-200 rounded mb-2" />
                <div className="h-3 w-12 bg-slate-200 rounded ml-auto" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (history.length === 0) {
      return (
        <div className="py-12 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-sm text-slate-400">No activity yet.</p>
        </div>
      );
    }

    return (
        <div className="space-y-2">
            {history.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${
                          tx.tx_type === 'deposit' ? 'bg-emerald-50 text-emerald-600' : 
                          tx.tx_type === 'withdrawal' ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-50 text-slate-600'
                        }`}>
                            {tx.tx_type === 'deposit' ? <ArrowDownLeft size={16}/> : 
                             tx.tx_type === 'withdrawal' ? <ArrowUpRight size={16}/> :
                             <RefreshCcw size={16}/>}
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-900 capitalize">
                              {tx.tx_type.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-slate-400 font-mono">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </p>
                            {tx.provider === 'gateway' && (
                              <span className="text-[10px] text-amber-500 font-bold">via Gateway</span>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`text-sm font-black ${
                          tx.tx_type === 'deposit' ? 'text-emerald-600' : 'text-slate-900'
                        }`}>
                            {tx.currency} {Number(tx.amount).toLocaleString()}
                        </p>
                        <span className={`text-[10px] font-bold ${
                          tx.status === 'completed' ? 'text-emerald-500' :
                          tx.status === 'failed' ? 'text-rose-500' :
                          'text-amber-500'
                        }`}>
                            {tx.status}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function TabBtn({ active, onClick, label, icon: Icon }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
        active 
          ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function BalancePanel({ label, value, pending, currency, icon: Icon, loading }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600">
          <Icon size={20} />
        </div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      {loading ? (
        <div className="h-8 w-32 bg-slate-200 animate-pulse rounded" />
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{value}</span>
            <span className="text-sm font-bold text-slate-400">{currency}</span>
          </div>
          {pending && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <Clock size={10} /> {pending}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ActionBtn({ icon: Icon, label, sub, onClick }: any) {
  return (
    <button 
      onClick={onClick} 
      className="w-full bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4 hover:border-amber-200 hover:shadow-md transition-all group text-left"
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-slate-50 text-slate-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
        <Icon size={20} />
      </div>
      <div>
        <p className="font-black text-slate-900 text-sm">{label}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
    </button>
  );
}

function LockedState() {
  return (
    <div className="bg-white rounded-2xl border border-rose-200 p-12 text-center max-w-lg mx-auto shadow-sm">
      <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center mx-auto mb-4">
        <AlertCircle size={32} />
      </div>
      <h2 className="text-lg font-black text-rose-900 mb-2">Identity Restricted</h2>
      <p className="text-sm text-slate-500">
        Account locking active. Contact security to verify operator status.
      </p>
    </div>
  );
}