'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Users, Building2, ArrowUpRight, 
  Loader2, 
  Activity, AlertCircle,
  UserCog, Briefcase, Star,
  ChevronRight,
  Clock, CheckCircle, 
  Wallet
} from 'lucide-react';
// Remove Link import
import { useRouter } from 'next/navigation';

interface DashboardStats {
  total_users: number;
  active_vaults: number;
  pending_review: number;
  total_volume: number;
  user_growth: number;
  role_breakdown?: {
    admin: number;
    operator: number;
    business: number;
    influencer: number;
  };
}

interface Vault {
  id: string;
  vault_id: string;
  title: string;
  status: string;
  status_code: number;
  creator_name: string;
  creator_id: string;
  client_name: string;
  amount: number;
  created_at: string;
}

interface UserIdentity {
  operator_id: string;
  fullName: string;
  email: string;
  avatar_url: string;
  role: string;
}

interface RecentUser {
  operator_id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [identity, setIdentity] = useState<UserIdentity>({ 
    operator_id: '', 
    fullName: '', 
    email: '', 
    avatar_url: '',
    role: ''
  });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentVault, setRecentVault] = useState<Vault | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Helper function to get token (same as login page)
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

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }, [getToken]);

  useEffect(() => {
    setMounted(true);
    const storedUser = localStorage.getItem('geon_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.role !== 'admin' && parsed.role !== 'operator') {
          router.push('/auth/login');
          return;
        }
        setIdentity({ 
          operator_id: parsed.operator_id || parsed.id || '', 
          fullName: parsed.full_name || parsed.fullName || 'Admin',
          email: parsed.email || '',
          avatar_url: parsed.avatar_url || '',
          role: parsed.role || 'admin'
        });
      } catch (err) {
        console.error("Failed to parse user data:", err);
        router.push('/auth/login');
      }
    } else {
      router.push('/auth/login');
    }
  }, [router]);

  const fetchDashboardData = useCallback(async () => {
    if (!identity.operator_id) return;
    
    setLoading(true);
    setError(null);
    
    const token = getToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }

    const headers = getAuthHeaders();

    try {
      const statsRes = await fetch(`${API_URL}/api/v1/admin/users/stats`, { headers });
      const vaultRes = await fetch(`${API_URL}/api/v1/admin/vaults/recent`, { headers });
      const operatorsRes = await fetch(`${API_URL}/api/v1/admin/operators?limit=5`, { headers });

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          total_users: statsData.total || 0,
          active_vaults: statsData.active_vaults || 0,
          pending_review: statsData.kyc?.pending || 0,
          total_volume: statsData.total_volume || 0,
          user_growth: statsData.trends?.new_last_30_days || 0,
          role_breakdown: statsData.roles
        });
      } else if (statsRes.status === 403) {
        setError("Access Denied: Admin privileges required");
      }

      if (vaultRes.ok) {
        const vaultData = await vaultRes.json();
        if (vaultData && vaultData.id) {
          setRecentVault({
            id: vaultData.id,
            vault_id: vaultData.vault_id || vaultData.id,
            title: vaultData.title || 'Untitled Vault',
            status: vaultData.status || 'active',
            status_code: vaultData.status_code || 1,
            creator_name: vaultData.creator_name || 'Unknown',
            creator_id: vaultData.creator_id || '',
            client_name: vaultData.client_name || 'Unknown',
            amount: vaultData.amount || 0,
            created_at: vaultData.created_at || new Date().toISOString()
          });
        } else {
          setRecentVault(null);
        }
      } else {
        setRecentVault(null);
      }

      if (operatorsRes.ok) {
        const operatorsData = await operatorsRes.json();
        const users = Array.isArray(operatorsData) ? operatorsData : operatorsData.operators || [];
        setRecentUsers(users.slice(0, 3));
      }

    } catch (err) {
      console.error("Dashboard Sync Error:", err);
      setError("Unable to connect to admin dashboard. Please try again.");
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  }, [API_URL, getAuthHeaders, getToken, identity.operator_id, router]);

  useEffect(() => {
    if (mounted && identity.operator_id) {
      fetchDashboardData();
    }
  }, [mounted, identity.operator_id, fetchDashboardData]);

  const getRoleBadge = (role: string): string => {
    switch(role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'operator': return 'bg-blue-100 text-blue-700';
      case 'business': return 'bg-emerald-100 text-emerald-700';
      case 'influencer': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleIcon = (role: string): React.ElementType => {
    switch(role) {
      case 'admin': return Shield;
      case 'operator': return UserCog;
      case 'business': return Briefcase;
      case 'influencer': return Star;
      default: return Users;
    }
  };

  const getStatusIcon = (code: number) => {
    if (code >= 5) return <CheckCircle size={16} className="text-emerald-500" />;
    if (code >= 3) return <Activity size={16} className="text-blue-500" />;
    if (code >= 2) return <Clock size={16} className="text-amber-500" />;
    return <Clock size={16} className="text-gray-400" />;
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                <Shield size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    {identity.role}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{identity.email}</p>
              </div>
            </div>
            
            {/* Replace Link with a non-navigation element */}
            <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium ring-2 ring-white cursor-default">
              {identity.fullName.charAt(0)}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-3 text-rose-700 text-sm">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Welcome Card */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-purple-600" />
            <h2 className="text-sm font-medium text-gray-700">Platform Overview</h2>
          </div>
          
          {stats?.role_breakdown && !loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(stats.role_breakdown).map(([role, count]) => {
                const Icon = getRoleIcon(role);
                return (
                  <div key={role} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`p-2 rounded-lg ${getRoleBadge(role)}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 capitalize">{role}s</p>
                      <p className="text-lg font-semibold text-gray-900">{count}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : null}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard 
            label="Total Users"
            value={stats?.total_users ?? 0}
            icon={Users}
            trend={stats?.user_growth ? `+${stats.user_growth} this month` : undefined}
            color="text-blue-600"
          />
          <StatCard 
            label="Active Vaults"
            value={stats?.active_vaults ?? 0}
            icon={Building2}
            subtext={stats?.pending_review ? `${stats.pending_review} pending review` : undefined}
            color="text-emerald-600"
          />
          <StatCard 
            label="Total Volume"
            value={`KES ${(stats?.total_volume ?? 0).toLocaleString()}`}
            icon={Wallet}
            color="text-purple-600"
          />
          <StatCard 
            label="Platform Health"
            value="98.5%"
            icon={Activity}
            subtext="All systems operational"
            color="text-amber-600"
          />
        </div>

        {/* Recent Activity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Vault */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700">Latest Vault Activity</h2>
              {/* Remove Link, replace with plain text */}
              <span className="text-xs text-gray-400 flex items-center gap-1 cursor-default">
                View all <ChevronRight size={12} />
              </span>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl p-8 flex justify-center border border-gray-100">
                <Loader2 className="animate-spin text-purple-500" size={24} />
              </div>
            ) : recentVault ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                        {getStatusIcon(recentVault.status_code)}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{recentVault.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">ID: {recentVault.vault_id?.slice(0, 8)}...</p>
                      </div>
                    </div>
                    {/* Remove Link, replace with disabled button */}
                    <button 
                      disabled
                      className="px-4 py-2 bg-purple-300 text-white rounded-lg text-sm font-medium cursor-not-allowed flex items-center gap-2"
                    >
                      Review <ArrowUpRight size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Creator</p>
                      <p className="text-sm font-medium text-gray-900">{recentVault.creator_name}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Client</p>
                      <p className="text-sm font-medium text-gray-900">{recentVault.client_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Vault Amount</p>
                      <p className="text-lg font-semibold text-gray-900">KES {recentVault.amount?.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      <StatusBadge code={recentVault.status_code} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
                <Building2 size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No vaults to monitor</p>
              </div>
            )}
          </div>

          {/* Recent Users */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700">Recent Users</h2>
              {/* Remove Link, replace with plain text */}
              <span className="text-xs text-gray-400 flex items-center gap-1 cursor-default">
                View all <ChevronRight size={12} />
              </span>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl p-8 flex justify-center border border-gray-100">
                <Loader2 className="animate-spin text-purple-500" size={24} />
              </div>
            ) : recentUsers.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y">
                {recentUsers.map((user) => {
                  const RoleIcon = getRoleIcon(user.role);
                  return (
                    <div key={user.operator_id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getRoleBadge(user.role)}`}>
                          <RoleIcon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                <Users size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No recent users</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, icon: Icon, trend, subtext, color = "text-gray-900" }: any) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">{label}</p>
        <Icon size={16} className="text-gray-400" />
      </div>
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
      {trend && <p className="text-xs text-emerald-600 mt-2">{trend}</p>}
      {subtext && <p className="text-xs text-gray-400 mt-2">{subtext}</p>}
    </div>
  );
}

// Status Badge Component
function StatusBadge({ code }: { code: number }) {
  const getStatusInfo = (code: number) => {
    if (code >= 5) return { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' };
    if (code >= 4) return { label: 'In Review', color: 'bg-amber-100 text-amber-700' };
    if (code >= 3) return { label: 'In Progress', color: 'bg-blue-100 text-blue-700' };
    if (code >= 2) return { label: 'Locked', color: 'bg-purple-100 text-purple-700' };
    return { label: 'Pending', color: 'bg-gray-100 text-gray-600' };
  };

  const { label, color } = getStatusInfo(code);
  return (
    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
