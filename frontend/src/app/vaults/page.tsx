'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus,  ArrowLeft, Layers, Users, Search,
  TrendingUp, Briefcase, AlertCircle, Clock, Shield,
  Filter, Download, RefreshCw, Eye, EyeOff, Copy,
  CheckCircle2, AlertTriangle, 
  BarChart3, Activity, Wallet,  Calendar,
   Award, Zap, 
  FileText,
  Loader2
} from 'lucide-react';

import VaultEngine from '@/components/vaults/VaultEngine';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface Vault {
  id: string;
  title: string;
  description?: string;
  vault_type: 'fixed' | 'milestone' | 'subscription';
  amount: number;
  currency: string;
  status: 'draft' | 'active' | 'completed' | 'disputed' | 'cancelled';
  status_code: number;
  counterparty_handle?: string;
  counterparty_name?: string;
  creator_id: string;
  created_at: string;
  completed_at?: string;
  dispute_count?: number;
  milestone_count?: number;
  completed_milestones?: number;
  tags?: string[];
  visibility: 'public' | 'private' | 'unlisted';
}

interface Stats {
  active_count: number;
  total_locked: number;
  total_locked_usd: number;
  pending_count: number;
  dispute_count: number;
  completed_count: number;
  draft_count: number;
  total_creators: number;
  avg_completion_time: number;
  success_rate: number;
  by_type: {
    fixed: number;
    milestone: number;
    subscription: number;
  };
  by_status: {
    active: number;
    completed: number;
    disputed: number;
    draft: number;
  };
  recent_activity: {
    date: string;
    count: number;
    volume: number;
  }[];
}

export default function UnifiedVaultPage() {
  const [role, setRole] = useState<'influencer' | 'business' | 'admin'>('influencer'); 
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [view, setView] = useState<'registry' | 'details' | 'analytics'>('registry');
  const [selectedVault, setSelectedVault] = useState<any>(null);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [filteredVaults, setFilteredVaults] = useState<Vault[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'week' | 'month' | 'year' | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 12;

  // Ref to prevent multiple simultaneous fetches
  const isFetching = useRef(false);

  const KES_TO_USD = 0.0076;

  // ==================== IDENTITY & AUTH SETUP ====================
  useEffect(() => {
    setMounted(true);
    const savedUser = localStorage.getItem('geon_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        if (user.role) setRole(user.role);
        if (user.wallet_address) setOperatorId(user.wallet_address);
        if (user.operator_id) setOperatorId(user.operator_id);
      } catch (e) {
        console.error("Failed to parse session user");
      }
    }
  }, []);

  // ==================== DATA FETCHING ====================
  const fetchRegistryData = useCallback(async (resetPage = true) => {
    if (!API_BASE || !operatorId || isFetching.current) return;
    
    isFetching.current = true;
    setError(null);
    const token = localStorage.getItem('auth_token');

    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const currentPage = resetPage ? 1 : page;
      const queryParams = new URLSearchParams({
        operator_id: operatorId,
        role: role,
        page: currentPage.toString(),
        limit: limit.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(dateFilter !== 'all' && { timeframe: dateFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const [statsRes, vaultsRes] = await Promise.all([
        fetch(`${API_BASE}/api/vaults/stats?operator_id=${operatorId}&role=${role}`, { headers }),
        fetch(`${API_BASE}/api/vaults?${queryParams.toString()}`, { headers })
      ]);

      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData);
      }

      if (vaultsRes.ok) {
        const vData = await vaultsRes.json();
        const newVaults = vData.vaults || vData;
        
        if (resetPage) {
          setVaults(newVaults);
          setFilteredVaults(newVaults);
        } else {
          setVaults(prev => [...prev, ...newVaults]);
          setFilteredVaults(prev => [...prev, ...newVaults]);
        }
        
        setTotalCount(vData.total || newVaults.length);
        setHasMore(newVaults.length === limit);
        if (!resetPage) {
          setPage(prev => prev + 1);
        }
      }
    } catch (err) {
      console.error("Registry fetch error:", err);
      setError("Unable to connect to vault registry. Please try again.");
    } finally {
      setTimeout(() => setLoading(false), 500);
      isFetching.current = false;
    }
  }, [operatorId, role, page, sortBy, sortOrder, statusFilter, typeFilter, dateFilter, searchTerm]);

  // Apply filters client-side
  useEffect(() => {
    if (!vaults.length) return;

    let filtered = [...vaults];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v => 
        v.title.toLowerCase().includes(term) ||
        v.counterparty_handle?.toLowerCase().includes(term) ||
        v.id.toLowerCase().includes(term) ||
        v.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(v => v.vault_type === typeFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      
      if (dateFilter === 'week') {
        cutoff.setDate(now.getDate() - 7);
      } else if (dateFilter === 'month') {
        cutoff.setMonth(now.getMonth() - 1);
      } else if (dateFilter === 'year') {
        cutoff.setFullYear(now.getFullYear() - 1);
      }

      filtered = filtered.filter(v => new Date(v.created_at) >= cutoff);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortBy === 'status') {
        comparison = (a.status || '').localeCompare(b.status || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredVaults(filtered);
  }, [vaults, searchTerm, statusFilter, typeFilter, dateFilter, sortBy, sortOrder]);

  // Trigger fetch on mount / identity change
  useEffect(() => {
    if (mounted && operatorId) {
      fetchRegistryData(true);
    } else if (mounted && !operatorId) {
      const timer = setTimeout(() => setLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [mounted, operatorId, fetchRegistryData]);

  // ==================== HANDLERS ====================
  const openVault = (vaultId: string) => {
    setSelectedVault({ id: vaultId });
    setView('details');
  };

  const initNewVault = () => {
    setSelectedVault({ id: 'NEW' }); 
    setView('details');
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchRegistryData(false);
    }
  };

  const exportVaults = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/api/vaults/export?operator_id=${operatorId}&role=${role}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vaults_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const copyVaultId = (id: string) => {
    navigator.clipboard.writeText(id);
    // Could add toast notification here
  };

  if (!mounted) return null;

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {view === 'registry' && 'Vault Registry'}
                {view === 'details' && 'Vault Engine'}
                {view === 'analytics' && 'Vault Analytics'}
              </h1>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <span className="capitalize">{role}</span>
                {operatorId && (
                  <>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span className="font-mono">{operatorId?.slice(0, 6)}...{operatorId?.slice(-4)}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          
          {view === 'registry' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('analytics')}
                className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
              >
                <BarChart3 size={16} /> Analytics
              </button>
              <button 
                onClick={initNewVault}
                className="flex items-center gap-2 bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-rose-600 transition-all active:scale-95 shadow-sm"
              >
                <Plus size={16} /> Deploy New Vault
              </button>
            </div>
          )}

          {view === 'analytics' && (
            <button
              onClick={() => setView('registry')}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft size={16} /> Back to Registry
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-700 text-sm">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Analytics View */}
      {view === 'analytics' && stats && (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              label="Total Value Locked" 
              value={`KES ${stats.total_locked.toLocaleString()}`}
              subValue={`≈ ${(((stats.total_locked_usd ?? stats.total_locked) ?? 0) * KES_TO_USD).toFixed(2)}`}
              icon={Wallet}
              highlight
            />
            <StatCard 
              label="Active Vaults" 
              value={stats.active_count}
              subValue={`${stats.by_status.active} active, ${stats.by_status.completed} completed`}
              icon={Activity}
            />
            <StatCard 
              label="Success Rate" 
              value={`${stats.success_rate || 98}%`}
              subValue={`Avg completion: ${stats.avg_completion_time || 5} days`}
              icon={Award}
            />
            <StatCard 
              label="Total Creators" 
              value={stats.total_creators || 0}
              icon={Users}
            />
          </div>

          {/* Charts Placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Vaults by Type</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Fixed</span>
                  <span className="text-xs font-medium">{stats.by_type.fixed}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500"
                    style={{ width: `${(stats.by_type.fixed / (stats.active_count || 1)) * 100}%` }}
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Milestone</span>
                  <span className="text-xs font-medium">{stats.by_type.milestone}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500"
                    style={{ width: `${(stats.by_type.milestone / (stats.active_count || 1)) * 100}%` }}
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Subscription</span>
                  <span className="text-xs font-medium">{stats.by_type.subscription}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500"
                    style={{ width: `${(stats.by_type.subscription / (stats.active_count || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Vaults by Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Active</span>
                  <span className="text-xs font-medium">{stats.by_status.active}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500"
                    style={{ width: `${(stats.by_status.active / (stats.active_count || 1)) * 100}%` }}
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Completed</span>
                  <span className="text-xs font-medium">{stats.by_status.completed}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500"
                    style={{ width: `${(stats.by_status.completed / (stats.active_count || 1)) * 100}%` }}
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Disputed</span>
                  <span className="text-xs font-medium">{stats.by_status.disputed}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500"
                    style={{ width: `${(stats.by_status.disputed / (stats.active_count || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {stats.recent_activity && stats.recent_activity.length > 0 && (
            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {stats.recent_activity.slice(0, 5).map((activity, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-600">{new Date(activity.date).toLocaleDateString()}</span>
                    <span className="text-xs font-medium">{activity.count} vaults</span>
                    <span className="text-xs text-emerald-600">KES {activity.volume.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Registry View */}
      {view === 'registry' && (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* STATS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              label="Active Vaults" 
              value={stats?.active_count ?? 0}
              subValue={`${stats?.by_status?.draft || 0} drafts`}
              icon={Briefcase}
            />
            <StatCard 
              label="Total Value Locked" 
              value={`KES ${Number(stats?.total_locked ?? 0).toLocaleString()}`}
              subValue={`≈ ${(((stats?.total_locked_usd ?? stats?.total_locked) ?? 0) * KES_TO_USD).toFixed(2)}`}
              icon={TrendingUp}
              highlight
            />
            <StatCard 
              label="Pending Approvals" 
              value={stats?.pending_count ?? 0}
              icon={Clock}
            />
            <StatCard 
              label="Active Disputes" 
              value={stats?.dispute_count ?? 0}
              icon={AlertCircle}
              warning={(stats?.dispute_count ?? 0) > 0}
            />
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-10 pr-4 outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-100 transition-all text-sm" 
                  placeholder="Search vaults by title, counterparty, ID, or tags..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-2 transition-all ${
                    showFilters ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Filter size={16} />
                  Filters
                </button>
                
                <button
                  onClick={exportVaults}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Download size={16} />
                  Export
                </button>
                
                <button
                  onClick={() => fetchRegistryData(true)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Status</label>
                  <select 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="disputed">Disputed</option>
                    <option value="draft">Draft</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Vault Type</label>
                  <select 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="fixed">Fixed</option>
                    <option value="milestone">Milestone</option>
                    <option value="subscription">Subscription</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Date Range</label>
                  <select 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                  >
                    <option value="all">All Time</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="year">Last Year</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Sort By</label>
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                    >
                      <option value="date">Date</option>
                      <option value="amount">Amount</option>
                      <option value="status">Status</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* VAULT LIST */}
          {loading && vaults.length === 0 ? (
            <div className="bg-white rounded-xl p-12 flex justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-rose-500 rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Loading vaults...</p>
              </div>
            </div>
          ) : filteredVaults.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVaults.map((v) => (
                  <VaultCard 
                    key={v.id} 
                    vault={v} 
                    role={role} 
                    onOpen={() => openVault(v.id)}
                    onCopy={() => copyVaultId(v.id)}
                  />
                ))}
              </div>

              {/* Load More */}
              {hasMore && filteredVaults.length < totalCount && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-6 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : 'Load More'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl p-16 border border-gray-100 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Layers size={28} className="text-gray-300" />
              </div>
              <h3 className="text-gray-900 font-medium mb-1">No vaults found</h3>
              <p className="text-gray-500 text-sm mb-6 max-w-sm">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? "No vaults match your filters. Try adjusting your search criteria."
                  : "Deploy a new vault to start securing payments and managing escrows."}
              </p>
              <button 
                onClick={initNewVault}
                className="flex items-center gap-2 bg-rose-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-rose-600 transition-all shadow-sm"
              >
                <Plus size={16} /> Deploy Your First Vault
              </button>
            </div>
          )}
        </div>
      )}

      {/* Details View */}
      {view === 'details' && (
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => setView('registry')} 
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft size={16} /> Back to registry
            </button>
            
            {selectedVault?.id !== 'NEW' && (
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                  <Eye size={14} /> Preview
                </button>
                <button className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs hover:bg-rose-600 flex items-center gap-1">
                  <Download size={14} /> Export
                </button>
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <VaultEngine 
              vaultId={selectedVault?.id} 
              userRole={role} 
              onStateChange={() => {
                fetchRegistryData(true);
                setView('registry');
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  highlight?: boolean;
  warning?: boolean;
}

function StatCard({ label, value, subValue, icon: Icon, highlight, warning }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500">{label}</p>
        <div className={`p-1.5 rounded-lg ${
          highlight ? 'bg-rose-50' : warning ? 'bg-amber-50' : 'bg-gray-50'
        }`}>
          <Icon size={16} className={
            highlight ? 'text-rose-500' : warning ? 'text-amber-500' : 'text-gray-500'
          } />
        </div>
      </div>
      <div>
        <h3 className={`text-xl font-semibold ${
          highlight ? 'text-rose-600' : warning ? 'text-amber-600' : 'text-gray-900'
        }`}>
          {value}
        </h3>
        {subValue && (
          <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>
        )}
      </div>
    </div>
  );
}

interface VaultCardProps {
  vault: Vault;
  role: 'influencer' | 'business' | 'admin';
  onOpen: () => void;
  onCopy: () => void;
}

function VaultCard({ vault, role, onOpen, onCopy }: VaultCardProps) {
  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500';
      case 'completed': return 'bg-blue-500';
      case 'disputed': return 'bg-rose-500';
      case 'draft': return 'bg-gray-300';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Zap size={10} className="text-emerald-600" />;
      case 'completed': return <CheckCircle2 size={10} className="text-blue-600" />;
      case 'disputed': return <AlertTriangle size={10} className="text-rose-600" />;
      case 'draft': return <FileText size={10} className="text-gray-600" />;
      default: return null;
    }
  };

  const statusColor = getStatusColor(vault.status);
  const StatusIcon = getStatusIcon(vault.status);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const progress = vault.milestone_count && vault.completed_milestones
    ? (vault.completed_milestones / vault.milestone_count) * 100
    : vault.status_code && vault.status_code < 5
    ? (vault.status_code / 5) * 100
    : null;

  return (
    <div 
      onClick={onOpen} 
      className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:border-rose-200 hover:shadow-md cursor-pointer transition-all group relative"
    >
      {/* Copy Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCopy();
        }}
        className="absolute top-3 right-3 p-1.5 bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200"
        title="Copy Vault ID"
      >
        <Copy size={12} className="text-gray-500" />
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-3 pr-8">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`} />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
            {StatusIcon}
            {vault.vault_type ?? 'Escrow'}
          </span>
        </div>
        {vault.visibility === 'private' && (
          <EyeOff size={12} className="text-gray-300" />
        )}
      </div>

      {/* Title */}
      <h4 className="text-base font-semibold text-gray-900 mb-1 truncate pr-8 group-hover:text-rose-600 transition-colors">
        {vault.title ?? 'Untitled Vault'}
      </h4>
      
      {/* Counterparty */}
      <p className="text-sm text-gray-500 mb-3 flex items-center gap-1.5">
        <Users size={14} className="text-gray-400" />
        {role === 'business' 
          ? vault.counterparty_name || vault.counterparty_handle || 'Influencer' 
          : vault.counterparty_name || `ID: ${vault.creator_id?.slice(0, 8)}`}
      </p>

      {/* Tags */}
      {vault.tags && vault.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {vault.tags.slice(0, 2).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 bg-gray-100 rounded text-[8px] text-gray-500">
              #{tag}
            </span>
          ))}
          {vault.tags.length > 2 && (
            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[8px] text-gray-500">
              +{vault.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Balance */}
      <div className="pt-3 border-t border-gray-50">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-gray-400">Balance</span>
          <div className="text-right">
            <span className="text-base font-bold text-gray-900">
              {vault.amount.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-gray-400 ml-1">{vault.currency || 'KES'}</span>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          <Calendar size={8} />
          {formatDate(vault.created_at)}
        </span>
        {vault.dispute_count ? (
          <span className="flex items-center gap-1 text-rose-500">
            <AlertTriangle size={8} />
            {vault.dispute_count} dispute{vault.dispute_count !== 1 ? 's' : ''}
          </span>
        ) : vault.milestone_count ? (
          <span className="flex items-center gap-1">
            <Layers size={8} />
            {vault.completed_milestones || 0}/{vault.milestone_count}
          </span>
        ) : null}
      </div>

      {/* Progress bar */}
      {progress !== null && progress < 100 && (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-rose-500 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-medium text-gray-400">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}