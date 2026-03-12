'use client';

import{ useState, useEffect, useCallback, useMemo } from 'react';
import { 
  TrendingUp, ShieldCheck, 
  AlertCircle, ArrowUpRight, Wallet,
  Clock, Loader2, Briefcase, Activity
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Transaction {
  id: string;
  beneficiary: string;
  status: 'released' | 'pending' | 'escrow';
  valueKes: number;
  date: string;
  nodeId: string;
}

interface Vault {
  vault_id: string;
  title: string;
  status_code: number;
  amount: number;
  counterparty: string;
}

export default function BusinessDashboard() {
  const router = useRouter();
  
  const [identity, setIdentity] = useState({ operator_id: '', fullName: '', email: '', avatar_url: '' });
  const [balance, setBalance] = useState<{ amount: number; currency: string } | null>(null);
  const [activeVaults, setActiveVaults] = useState<Vault[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const KES_TO_USD = 0.0076;

  // Get auth token from cookies
  const getAuthToken = useCallback(() => {
    if (typeof document === 'undefined') return null;
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
    };
    return getCookie('geon_token') || localStorage.getItem('auth_token');
  }, []);

  // Get user identity from localStorage
  useEffect(() => {
    setMounted(true);
    const storedUser = localStorage.getItem('geon_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setIdentity({ 
          operator_id: parsed.operator_id || parsed.id || '', 
          fullName: parsed.full_name || parsed.fullName || 'Business',
          email: parsed.email || '',
          avatar_url: parsed.avatar_url || ''
        });
      } catch (err) {
        console.error("Failed to parse user data:", err);
        router.push('/auth/login');
      }
    } else {
      router.push('/auth/login');
    }
  }, [router]);

  // Fetch all dashboard data
  const fetchData = useCallback(async (opId: string) => {
    if (!opId) return;
    
    setLoading(true);
    setError(null);
    
    const token = getAuthToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }

    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      const [balRes, vaultsRes, ledgerRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/wallet/balance?operator_id=${opId}`, { headers }),
        fetch(`${API_URL}/api/v1/vaults/latest?operator_id=${opId}&role=business`, { headers }),
        fetch(`${API_URL}/api/v1/business/ledger?operator_id=${opId}`, { headers })
      ]);

      if (balRes.ok) {
        const balanceData = await balRes.json();
        setBalance(balanceData);
      }

      if (vaultsRes.ok) {
        const vaultsData = await vaultsRes.json();
        setActiveVaults(Array.isArray(vaultsData) ? vaultsData : vaultsData ? [vaultsData] : []);
      }

      if (ledgerRes.ok) {
        const ledgerData = await ledgerRes.json();
        setTransactions(ledgerData.transactions || []);
      }

    } catch (err) {
      console.error("Dashboard Sync Error:", err);
      setError("Unable to connect to business dashboard. Please try again.");
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  }, [API_URL, getAuthToken, router]);

  useEffect(() => {
    if (mounted && identity.operator_id) {
      fetchData(identity.operator_id);
    }
  }, [mounted, identity.operator_id, fetchData]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalVolume = transactions.reduce((acc, curr) => acc + (Number(curr.valueKes) || 0), 0);
    const activeEscrows = activeVaults.filter(v => v.status_code < 5).length;
    const recentActivity = transactions.filter(t => 
      new Date(t.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    
    return [
      { label: 'Total Volume', value: `KES ${totalVolume.toLocaleString()}`, icon: TrendingUp },
      { label: 'Active Escrows', value: activeEscrows, icon: Briefcase },
      { label: 'Recent Activity', value: `${recentActivity} tx`, icon: Activity },
      { label: 'Trust Score', value: '98%', icon: ShieldCheck },
    ];
  }, [transactions, activeVaults]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Briefcase size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Business Dashboard</h1>
              <p className="text-sm text-gray-500">{identity.fullName}</p>
            </div>
          </div>
          
          <Link href="/client/settings" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden ring-2 ring-white">
              {identity.avatar_url ? (
                <img src={identity.avatar_url} alt={identity.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-rose-500 flex items-center justify-center text-white font-medium">
                  {identity.fullName.charAt(0)}
                </div>
              )}
            </div>
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-700 text-sm">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content - Two Column Layout */}
      <div className="max-w-7xl mx-auto">
        
        {/* Top Row - Balance Card + Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          {/* Balance Card - spans 1 column on desktop */}
          <div className="lg:col-span-1 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Available Balance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-gray-900">
                KES {balance?.amount?.toLocaleString() ?? '0'}
              </span>
              <span className="text-xs text-gray-400">
                ≈ ${balance?.amount ? (balance.amount * KES_TO_USD).toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <Link href="/client/wallet/deposit" className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1">
                Add funds <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>

          {/* Stats Cards - 3 cards */}
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="animate-pulse">
                  <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
                  <div className="h-6 w-20 bg-gray-200 rounded" />
                </div>
              </div>
            ))
          ) : (
            stats.slice(1).map((stat, i) => (
              <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <stat.icon size={16} className="text-gray-400" />
                </div>
                <p className="text-xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            ))
          )}
        </div>

        {/* Two Column Layout for Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Active Projects (2/3 width) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700">Active Projects</h2>
              <Link href="/client/vaults" className="text-xs text-rose-600 hover:text-rose-700">
                View all
              </Link>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl p-8 flex justify-center">
                <Loader2 className="animate-spin text-rose-500" size={24} />
              </div>
            ) : activeVaults.length > 0 ? (
              <div className="space-y-3">
                {activeVaults.slice(0, 3).map((vault) => (
                  <Link 
                    key={vault.vault_id}
                    href={`/client/vaults/${vault.vault_id}`}
                    className="block bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-rose-200 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{vault.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Partner: {vault.counterparty}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">KES {vault.amount.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Status dots */}
                    <div className="flex items-center gap-4">
                      <StatusDot 
                        label="Locked" 
                        active={vault.status_code >= 2} 
                        completed={vault.status_code >= 2}
                      />
                      <StatusDot 
                        label="Working" 
                        active={vault.status_code === 3} 
                        completed={vault.status_code > 3}
                      />
                      <StatusDot 
                        label="Review" 
                        active={vault.status_code === 4} 
                        completed={vault.status_code > 4}
                      />
                      <StatusDot 
                        label="Paid" 
                        active={vault.status_code === 5}
                        completed={vault.status_code === 5}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                <p className="text-gray-500">No active projects</p>
              </div>
            )}
          </div>

          {/* Right Column - Transactions & Help (1/3 width) */}
          <div className="space-y-4">
            {/* Recent Transactions */}
            <div>
              <h2 className="text-sm font-medium text-gray-700 mb-3">Recent Activity</h2>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                  <div className="p-6 flex justify-center">
                    <Loader2 className="animate-spin text-rose-500" size={20} />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-gray-500">No recent transactions</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {transactions.slice(0, 4).map((tx) => (
                      <div key={tx.id} className="p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{tx.beneficiary}</p>
                            <p className="text-xs text-gray-400">{tx.id.slice(0, 8)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">KES {tx.valueKes.toLocaleString()}</p>
                            <span className={`text-xs ${
                              tx.status === 'released' ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Stack */}
            <div className="space-y-3">
              {/* Help Card */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Need help?</p>
                      <p className="text-xs text-gray-500">24/7 support</p>
                    </div>
                  </div>
                  <Link 
                    href="/client/support" 
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                  >
                    Contact
                  </Link>
                </div>
              </div>

              {/* Balance Alert - Only if needed */}
              {balance?.amount === 0 && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet size={16} className="text-amber-600" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Low balance</p>
                        <p className="text-xs text-amber-700">Add funds to continue</p>
                      </div>
                    </div>
                    <Link 
                      href="/client/wallet/deposit" 
                      className="text-xs text-amber-800 hover:text-amber-900 font-medium"
                    >
                      Deposit
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Status Dot Component
function StatusDot({ label, active, completed }: { label: string; active?: boolean; completed?: boolean }) {
  let dotColor = 'bg-gray-200';
  if (active) dotColor = 'bg-rose-500';
  if (completed) dotColor = 'bg-emerald-500';

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}