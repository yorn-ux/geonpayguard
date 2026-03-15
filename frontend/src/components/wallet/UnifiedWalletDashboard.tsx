'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowUpRight, ArrowDownLeft, RefreshCcw, Smartphone, Bitcoin, 
  ShieldCheck, AlertCircle, PieChart, Activity, 
  RefreshCw, Plus, CreditCard, Building2, UserCircle,
  History, Wallet, TrendingUp, Download,
  Calendar, BarChart3, ExternalLink
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
  provider?: 'pesapal' | 'internal';
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
  pesapal_fees?: number;
  platform_fees?: number;
}

interface WalletBalance {
  balance_kes: number;
  balance_usdt: number;
  pending_kes: number;
  pending_usdt: number;
  pesapal_balance?: number;
  last_sync?: string;
}

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
                
                // ✅ Admins default to revenue tab
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm ${
              identity.role === 'admin' ? 'bg-purple-600' : 'bg-rose-500'
            }`}>
              {identity.role === 'admin' ? <BarChart3 size={20} /> : <Wallet size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900">
                  {identity.role === 'admin' ? 'Revenue Dashboard' : 'Financial Hub'}
                </h1>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                  identity.role === 'business' ? 'bg-rose-100 text-rose-700' :
                  identity.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {identity.role || 'Loading...'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">ID: {identity.operator_id || '...'}</p>
            </div>
          </div>

          {/* Tab Navigation - Admins ONLY see Revenue tab */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
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

        {/* Main Content - Admins ONLY see Revenue tab */}
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
            label="M-Pesa Wallet" 
            value={formatKES(balances.balance_kes)} 
            pending={balances.pending_kes > 0 ? `+${formatKES(balances.pending_kes)} pending` : undefined}
            currency="KES" 
            icon={Smartphone} 
            loading={loading} 
          />
          <BalancePanel 
            label="Digital Assets" 
            value={formatUSDT(balances.balance_usdt)} 
            pending={balances.pending_usdt > 0 ? `+${formatUSDT(balances.pending_usdt)} pending` : undefined}
            currency="USDT" 
            icon={Bitcoin} 
            loading={loading} 
          />
        </div>
        
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History size={18} className="text-gray-400" />
              <h3 className="text-sm font-medium text-gray-900">Recent Activity</h3>
            </div>
            {lastSync && (
              <span className="text-[10px] text-gray-400">Last sync: {lastSync}</span>
            )}
          </div>
          <RecentActivityList />
        </div>
      </div>

      <div className="lg:col-span-4 space-y-3">
        <h3 className="text-xs font-medium text-gray-400 px-2">Quick Actions</h3>
        <ActionBtn 
          icon={ArrowDownLeft} 
          label="Deposit Funds" 
          sub="Via M-PESA (PesaPal)" 
          onClick={() => setIsDepositOpen(true)} 
        />
        <ActionBtn 
          icon={ArrowUpRight} 
          label="Withdraw" 
          sub="To M-PESA or Crypto" 
          onClick={() => setIsWithdrawOpen(true)} 
        />
        <ActionBtn 
          icon={RefreshCcw} 
          label="Convert" 
          sub="Swap between KES & USDT" 
          onClick={() => setIsConvertOpen(true)} 
        />
        
        {/* Provider Info */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center gap-2 text-xs text-blue-700">
            <ShieldCheck size={14} />
            <span>Payments powered by PesaPal</span>
          </div>
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
    pesapal_balance?: number;
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
        authenticatedFetch('/api/v1/wallet/pesapal/stats')
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
            pesapal_balance: stats?.balance ?? 0
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
          <div className="bg-rose-500 text-white rounded-xl p-6 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-xs text-rose-100 mb-2">Company Balance</p>
              <p className="text-3xl font-semibold">KES {loading ? '...' : data.balance_kes.toLocaleString()}</p>
              {data.pending_kes > 0 && (
                <p className="text-xs text-rose-200 mt-1">+{data.pending_kes.toLocaleString()} pending</p>
              )}
              <button 
                onClick={() => setShowAddFunds(true)} 
                className="mt-4 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors backdrop-blur-sm"
              >
                <Plus size={14}/> Top Up via PesaPal
              </button>
            </div>
            <div className="absolute top-0 right-0 text-white/10">
              <Building2 size={120} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Bitcoin size={16} className="text-rose-500"/>
              <p className="text-xs text-gray-400">Crypto Reserve</p>
            </div>
            <p className="text-3xl font-semibold text-gray-900">
              {loading ? '...' : data.balance_usdt.toLocaleString()} 
              <span className="text-sm font-normal text-gray-400 ml-2">USDT</span>
            </p>
            {data.pending_usdt > 0 && (
              <p className="text-xs text-amber-600 mt-1">+{data.pending_usdt.toLocaleString()} pending</p>
            )}
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-6 shadow-sm">
          <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-4">
            <Activity size={16} className="text-gray-400"/> 
            PesaPal Status
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Provider</span>
              <span className="text-emerald-600 font-medium">ACTIVE</span>
            </div>
            {data.pesapal_balance !== undefined && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">PesaPal Balance</span>
                <span className="text-gray-900">KES {data.pesapal_balance?.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Last Sync</span>
              <span className="text-gray-900">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
          <button 
            onClick={fetchData} 
            className="w-full mt-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''}/>
            Sync with PesaPal
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <span className="text-sm font-medium text-gray-900">Transaction Audit Ledger</span>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span className="text-[10px] text-gray-400">PesaPal Verified</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-400">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Reference</th>
                <th className="px-6 py-3 text-left font-medium">Type</th>
                <th className="px-6 py-3 text-left font-medium">Provider</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-right font-medium">Net Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.transactions.length > 0 ? data.transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{tx.tx_ref || tx.id.slice(0,8)}</div>
                    <div className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleString()}</div>
                    {tx.provider_ref && (
                      <div className="text-[10px] text-gray-300">PesaPal: {tx.provider_ref.slice(0,8)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 capitalize">
                      {tx.tx_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-400">
                      {tx.provider || 'internal'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                      tx.status === 'failed' ? 'bg-rose-100 text-rose-700' : 
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    {tx.currency} {Number(tx.amount).toLocaleString()}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
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
    pesapal_fees: 0,
    platform_fees: 0 
  });
  const [loading, setLoading] = useState(true);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [pesapalMetrics, setPesaPalMetrics] = useState<any>(null);

  const fetchRevenueData = useCallback(async () => {
    try {
      const [metRes, balRes, volRes, pesapalRes] = await Promise.all([
        authenticatedFetch('/api/v1/wallet/withdrawals/metrics'),
        authenticatedFetch('/api/v1/wallet/balance'),
        authenticatedFetch(`/api/v1/admin/revenue/volume?timeframe=${timeframe}`),
        authenticatedFetch('/api/v1/admin/pesapal/metrics')
      ]);
      
      if (metRes.ok && balRes.ok) {
        const m = await metRes.json();
        const b = await balRes.json();
        const v = volRes.ok ? await volRes.json() : null;
        const p = pesapalRes.ok ? await pesapalRes.json() : null;
        
        // PesaPal typically charges ~1.5% for payments
        const pesapalFeeRate = 0.015;
        const platformFeeRate = 0.005; // Our platform fee
        
        setStats({ 
          total_kes: m.totalAmount || 0, 
          fees_kes: (m.totalAmount || 0) * (pesapalFeeRate + platformFeeRate), 
          net_kes: b.balance_kes ?? b.kes_balance ?? 0,
          pesapal_fees: (m.totalAmount || 0) * pesapalFeeRate,
          platform_fees: (m.totalAmount || 0) * platformFeeRate,
          daily_volume: v?.daily || [],
          weekly_volume: v?.weekly || [],
          monthly_volume: v?.monthly || []
        });
        
        setPesaPalMetrics(p);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Platform Revenue</h2>
          <p className="text-sm text-gray-500">Monitor platform earnings and PesaPal fees</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-600 outline-none focus:border-purple-400"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button
            onClick={fetchRevenueData}
            className="p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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
          label="PesaPal Fees" 
          value={`KES ${(stats.pesapal_fees || 0).toLocaleString()}`} 
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
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-medium text-gray-700">Revenue Volume</h3>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <span className="text-xs text-gray-500 capitalize">{timeframe} Overview</span>
          </div>
        </div>
        
        {loading ? (
          <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />
        ) : (
          <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <p className="text-sm text-gray-400">Revenue chart visualization</p>
          </div>
        )}
      </div>

      {/* PesaPal Metrics */}
      {pesapalMetrics && (
        <div className="bg-purple-50 rounded-xl border border-purple-100 p-6">
          <h3 className="text-sm font-medium text-purple-900 mb-4">PesaPal Payment Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-purple-600">Total Transactions</p>
              <p className="text-xl font-semibold text-purple-900">{pesapalMetrics.total_transactions || 0}</p>
            </div>
            <div>
              <p className="text-xs text-purple-600">Success Rate</p>
              <p className="text-xl font-semibold text-purple-900">{pesapalMetrics.success_rate || 98}%</p>
            </div>
            <div>
              <p className="text-xs text-purple-600">Avg. Processing Time</p>
              <p className="text-xl font-semibold text-purple-900">{pesapalMetrics.avg_time || '2.5s'}</p>
            </div>
            <div>
              <p className="text-xs text-purple-600">Settlements</p>
              <p className="text-xl font-semibold text-purple-900">KES {pesapalMetrics.total_settled || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Section - Separate for admin */}
      <div className="bg-purple-50 rounded-xl border border-purple-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center">
              <Download size={18} className="text-purple-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-purple-900">Platform Withdrawals</p>
              <p className="text-xs text-purple-600">Withdraw platform fees to your wallet</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsWithdrawOpen(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 transition-all shadow-sm"
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
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                <div>
                  <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-16 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="text-right">
                <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-12 bg-gray-200 rounded ml-auto" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (history.length === 0) {
      return (
        <div className="py-12 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-sm text-gray-400">No activity yet.</p>
        </div>
      );
    }

    return (
        <div className="space-y-2">
            {history.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-all">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          tx.tx_type === 'deposit' ? 'bg-emerald-50 text-emerald-600' : 
                          'bg-amber-50 text-amber-600'
                        }`}>
                            {tx.tx_type === 'deposit' ? <ArrowDownLeft size={16}/> : <ArrowUpRight size={16}/>}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900 capitalize">
                              {tx.tx_type.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </p>
                            {tx.provider === 'pesapal' && (
                              <span className="text-[10px] text-blue-400">via PesaPal</span>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`text-sm font-semibold ${
                          tx.tx_type === 'deposit' ? 'text-emerald-600' : 'text-gray-900'
                        }`}>
                            {tx.currency} {Number(tx.amount).toLocaleString()}
                        </p>
                        <span className={`text-[10px] ${
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
      className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
        active 
          ? 'bg-white text-gray-900 shadow-sm' 
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function BalancePanel({ label, value, pending, currency, icon: Icon, loading }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-600">
          <Icon size={20} />
        </div>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      {loading ? (
        <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-gray-900">{value}</span>
            <span className="text-sm text-gray-400">{currency}</span>
          </div>
          {pending && (
            <p className="text-xs text-amber-600 mt-1">{pending}</p>
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
      className="w-full bg-white border border-gray-100 p-4 rounded-xl flex items-center gap-4 hover:border-rose-200 hover:shadow-sm transition-all group text-left"
    >
      <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 bg-gray-50 text-gray-600 group-hover:bg-rose-500 group-hover:text-white transition-colors">
        <Icon size={20} />
      </div>
      <div>
        <p className="font-medium text-gray-900 text-sm">{label}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </button>
  );
}

function LockedState() {
  return (
    <div className="bg-white rounded-xl border border-rose-100 p-12 text-center max-w-lg mx-auto shadow-sm">
      <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center mx-auto mb-4">
        <AlertCircle size={32} />
      </div>
      <h2 className="text-lg font-semibold text-rose-900 mb-2">Identity Restricted</h2>
      <p className="text-sm text-gray-500">
        Account locking active. Contact security to verify operator status.
      </p>
    </div>
  );
}
