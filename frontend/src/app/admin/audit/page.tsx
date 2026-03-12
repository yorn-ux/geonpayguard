'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, UserCircle, Search, RefreshCw, Globe,
  Loader2, AlertTriangle, ShieldCheck, Download,
  Filter, Calendar, Clock, ChevronRight,
  Eye, EyeOff, Server, Briefcase, Star,
  UserCog, Activity
} from 'lucide-react';
import { useRouter } from 'next/navigation';

type AuditScope = 'all' | 'admin' | 'operator' | 'business' | 'influencer';

interface AuditLog {
  id: number;
  timestamp: string | null;
  user: string;
  user_role?: string | null;
  user_id?: string | null;
  user_operator_id?: string | null;
  user_email?: string | null;
  action: string;
  oldValue: string;
  newValue: string;
  ip: string;
}

interface Stats {
  total: number;
  today: number;
  orphaned: number;
  byRole: {
    admin: number;
    operator: number;
    business: number;
    influencer: number;
  };
}

export default function EnhancedAuditLedger() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [scope, setScope] = useState<AuditScope>('all');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{start?: string, end?: string}>({});
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [mounted, setMounted] = useState(false);
  
  const [stats, setStats] = useState<Stats>({
    total: 0,
    today: 0,
    orphaned: 0,
    byRole: {
      admin: 0,
      operator: 0,
      business: 0,
      influencer: 0
    }
  });
  
  const limit = 50;

  // ==================== AUTHENTICATION ====================
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
    if (!token) {
      router.push('/auth/login');
      throw new Error('No authentication token found');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, [router, getToken]);

  const checkAdminAccess = useCallback((): boolean => {
    const storedUser = localStorage.getItem('geon_user');
    if (!storedUser) return false;
    
    try {
      const user = JSON.parse(storedUser);
      const role = user.role?.toLowerCase() || '';
      return role === 'admin' || role === 'operator';
    } catch {
      return false;
    }
  }, []);

  // ==================== DATA FETCHING ====================
  const fetchLogs = useCallback(async (resetOffset = false) => {
    setAuthError(null);
    
    try {
      if (!checkAdminAccess()) {
        setAuthError("Access Denied: Admin Privileges Required");
        setLoading(false);
        return;
      }

      const token = getToken();
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const newOffset = resetOffset ? 0 : offset;
      if (!resetOffset && !hasMore) return;

      setLoading(true);
      
      const params = new URLSearchParams({ 
        limit: limit.toString(),
        offset: newOffset.toString()
      });
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Determine which endpoint to use based on scope
      let url: string;
      if (scope !== 'all') {
        // Use role-specific endpoint
        url = `${API_BASE_URL}/api/v1/admin/audit-logs/by-role/${scope}?${params.toString()}`;
      } else {
        // Use general endpoint
        url = `${API_BASE_URL}/api/v1/admin/audit-logs?${params.toString()}`;
      }
      
      const headers = getAuthHeaders();
      const response = await fetch(url, { headers });

      // Fetch stats (always fetch from summary endpoint)
      const statsUrl = `${API_BASE_URL}/api/v1/admin/audit-logs/summary`;
      const statsResponse = await fetch(statsUrl, { headers });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats({
          total: statsData?.total || 0,
          today: statsData?.today || 0,
          orphaned: statsData?.orphaned || 0,
          byRole: {
            admin: statsData?.byRole?.admin || 0,
            operator: statsData?.byRole?.operator || 0,
            business: statsData?.byRole?.business || 0,
            influencer: statsData?.byRole?.influencer || 0
          }
        });
      }

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('geon_user');
        router.push('/auth/login');
        return;
      }

      if (response.status === 403) {
        setAuthError("Access Denied: Admin Privileges Required");
        setLoading(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        
        // Apply client-side filters
        let filteredData = data;
        
        // Action type filter (client-side since backend doesn't filter by action)
        if (actionFilter !== 'all') {
          filteredData = filteredData.filter((log: AuditLog) => 
            log.action?.toLowerCase().includes(actionFilter.toLowerCase())
          );
        }
        
        // Date range filter (client-side)
        if (dateRange.start || dateRange.end) {
          filteredData = filteredData.filter((log: AuditLog) => {
            if (!log.timestamp) return false;
            const logDate = new Date(log.timestamp).getTime();
            if (dateRange.start && logDate < new Date(dateRange.start).getTime()) return false;
            if (dateRange.end && logDate > new Date(dateRange.end).getTime()) return false;
            return true;
          });
        }
        
        if (resetOffset) {
          setLogs(filteredData);
        } else {
          setLogs(prev => [...prev, ...filteredData]);
        }
        
        setHasMore(data.length === limit);
        if (!resetOffset) {
          setOffset(newOffset + limit);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setAuthError(errorData.detail || "Ledger Sync Failed");
      }
    } catch (err) {
      console.error('Audit log fetch error:', err);
      setAuthError("Connection Failure: Security Enclave Unreachable");
    } finally {
      setLoading(false);
    }
  }, [scope, offset, hasMore, router, dateRange, actionFilter, checkAdminAccess, getToken, getAuthHeaders]);

  const exportLogs = async () => {
    setExporting(true);
    try {
      const token = getToken();
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/audit-logs/export`, { headers });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/auth/login');
        return;
      }

      if (response.status === 403) {
        setAuthError("Access Denied: Admin Privileges Required");
        return;
      }

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setAuthError(errorData.detail || "Export Failed");
      }
    } catch (err) {
      console.error('Export failed:', err);
      setAuthError("Export Failed");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    setOffset(0);
    setHasMore(true);
    fetchLogs(true);
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (!loading && !exporting) {
        setOffset(0);
        setHasMore(true);
        fetchLogs(true);
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [scope, dateRange.start, dateRange.end, actionFilter]); // Fixed dependency array

  // ==================== UTILITY FUNCTIONS ====================
  const filteredLogs = logs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    return (
      log.action?.toLowerCase().includes(searchLower) || 
      log.user?.toLowerCase().includes(searchLower) ||
      log.ip?.toLowerCase().includes(searchLower) ||
      (log.user_email && log.user_email.toLowerCase().includes(searchLower)) ||
      (log.user_operator_id && log.user_operator_id.toLowerCase().includes(searchLower))
    );
  });

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchLogs(false);
    }
  };

  const getActionIcon = (action: string = '') => {
    const actionLower = action?.toLowerCase() || '';
    if (actionLower.includes('login')) return <Activity size={14} />;
    if (actionLower.includes('create')) return <Activity size={14} />;
    if (actionLower.includes('update')) return <Activity size={14} />;
    if (actionLower.includes('delete')) return <Activity size={14} />;
    if (actionLower.includes('lock') || actionLower.includes('suspend')) return <Activity size={14} />;
    if (actionLower.includes('unlock') || actionLower.includes('activate')) return <Activity size={14} />;
    if (actionLower.includes('verify')) return <Activity size={14} />;
    if (actionLower.includes('reject')) return <Activity size={14} />;
    if (actionLower.includes('key') || actionLower.includes('token')) return <Activity size={14} />;
    if (actionLower.includes('fingerprint') || actionLower.includes('biometric')) return <Activity size={14} />;
    if (actionLower.includes('blacklist')) return <Activity size={14} />;
    if (actionLower.includes('freeze')) return <Activity size={14} />;
    return <Activity size={14} />;
  };

  const getActionColor = (action: string = '') => {
    const actionLower = action?.toLowerCase() || '';
    if (actionLower.includes('delete')) return 'text-rose-600 bg-rose-50 border-rose-200';
    if (actionLower.includes('create')) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (actionLower.includes('update')) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (actionLower.includes('login')) return 'text-purple-600 bg-purple-50 border-purple-200';
    if (actionLower.includes('lock') || actionLower.includes('suspend')) return 'text-amber-600 bg-amber-50 border-amber-200';
    if (actionLower.includes('unlock') || actionLower.includes('activate')) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (actionLower.includes('verify')) return 'text-green-600 bg-green-50 border-green-200';
    if (actionLower.includes('reject')) return 'text-rose-600 bg-rose-50 border-rose-200';
    if (actionLower.includes('blacklist')) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (actionLower.includes('freeze')) return 'text-cyan-600 bg-cyan-50 border-cyan-200';
    if (actionLower.includes('role')) return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getRoleIcon = (role: string | null | undefined) => {
    switch(role?.toLowerCase()) {
      case 'admin': return ShieldAlert;
      case 'operator': return UserCog;
      case 'business': return Briefcase;
      case 'influencer': return Star;
      default: return UserCircle;
    }
  };

  const getRoleBadgeColor = (role: string | null | undefined) => {
    switch(role?.toLowerCase()) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'operator': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'business': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'influencer': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '—';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header with Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Audit Ledger</h1>
              <p className="text-sm text-gray-500">Immutable record of system operations</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by user, action, IP, operator ID..." 
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 bg-white border border-gray-200 rounded-lg transition-colors ${
                showFilters ? 'text-purple-600 border-purple-300 bg-purple-50' : 'text-gray-500 hover:bg-gray-50'
              }`}
              title="Toggle filters"
            >
              <Filter size={16} />
            </button>
            <button 
              onClick={exportLogs}
              disabled={exporting || loading}
              className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Export as CSV"
            >
              <Download size={16} className={exporting ? 'animate-pulse' : ''} />
            </button>
            <button 
              onClick={() => {
                setOffset(0);
                setHasMore(true);
                fetchLogs(true);
              }}
              disabled={loading}
              className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-purple-600' : ''} />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <StatCard 
            label="Total Logs" 
            value={stats?.total?.toLocaleString() || '0'} 
            icon={Activity}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard 
            label="Today" 
            value={stats?.today?.toLocaleString() || '0'} 
            icon={Clock}
            color="bg-green-50 text-green-600"
          />
          <StatCard 
            label="Orphaned" 
            value={stats?.orphaned?.toLocaleString() || '0'} 
            icon={AlertTriangle}
            color="bg-gray-50 text-gray-600"
          />
          <StatCard 
            label="Admin" 
            value={stats?.byRole?.admin?.toLocaleString() || '0'} 
            icon={ShieldAlert}
            color="bg-purple-50 text-purple-600"
          />
          <StatCard 
            label="Operator" 
            value={stats?.byRole?.operator?.toLocaleString() || '0'} 
            icon={UserCog}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard 
            label="Business/Influencer" 
            value={(stats?.byRole?.business + stats?.byRole?.influencer)?.toLocaleString() || '0'} 
            icon={Briefcase}
            color="bg-emerald-50 text-emerald-600"
          />
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Role Scope Buttons */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg overflow-x-auto">
              <ScopeBtn 
                active={scope === 'all'} 
                onClick={() => setScope('all')} 
                label="All Roles" 
                icon={Globe} 
              />
              <ScopeBtn 
                active={scope === 'admin'} 
                onClick={() => setScope('admin')} 
                label="Admin" 
                icon={ShieldAlert} 
              />
              <ScopeBtn 
                active={scope === 'operator'} 
                onClick={() => setScope('operator')} 
                label="Operator" 
                icon={UserCog} 
              />
              <ScopeBtn 
                active={scope === 'business'} 
                onClick={() => setScope('business')} 
                label="Business" 
                icon={Briefcase} 
              />
              <ScopeBtn 
                active={scope === 'influencer'} 
                onClick={() => setScope('influencer')} 
                label="Influencer" 
                icon={Star} 
              />
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400"
                >
                  <option value="all">All Actions</option>
                  <option value="login">Login</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                  <option value="verify">Verify</option>
                  <option value="lock">Lock/Suspend</option>
                  <option value="role">Role Changes</option>
                  <option value="blacklist">Blacklist</option>
                  <option value="freeze">Freeze</option>
                </select>

                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <input
                    type="date"
                    value={dateRange.start || ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400"
                    placeholder="Start"
                  />
                </div>
                <span className="text-gray-400">—</span>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <input
                    type="date"
                    value={dateRange.end || ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400"
                    placeholder="End"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {authError && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg flex items-center gap-3 text-rose-700 animate-in fade-in">
            <AlertTriangle size={18} className="shrink-0" />
            <span className="text-sm font-medium">{authError}</span>
          </div>
        )}

        {/* Logs Table */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs text-gray-400">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">User & Role</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Changes</th>
                  <th className="px-5 py-3">IP Address</th>
                  <th className="px-5 py-3">Operator ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <Loader2 className="animate-spin text-purple-600 mx-auto mb-3" size={32} />
                      <p className="text-sm text-gray-400">Loading audit logs...</p>
                    </td>
                  </tr>
                ) : filteredLogs.length > 0 ? (
                  filteredLogs.map((log, i) => {
                    const RoleIcon = getRoleIcon(log.user_role || '');
                    const roleColor = getRoleBadgeColor(log.user_role || '');
                    const ActionIcon = getActionIcon(log.action || '');
                    const actionColor = getActionColor(log.action || '');
                    
                    return (
                      <tr key={log.id || i} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">
                              {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '—'}
                            </span>
                            <span className="text-xs text-gray-400" title={log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}>
                              {formatTimestamp(log.timestamp)}
                            </span>
                          </div>
                        </td>
                        
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              log.user_role === 'admin' ? 'bg-purple-100' :
                              log.user_role === 'operator' ? 'bg-blue-100' :
                              log.user_role === 'business' ? 'bg-emerald-100' :
                              log.user_role === 'influencer' ? 'bg-amber-100' :
                              'bg-gray-100'
                            }`}>
                              <RoleIcon size={16} className={
                                log.user_role === 'admin' ? 'text-purple-600' :
                                log.user_role === 'operator' ? 'text-blue-600' :
                                log.user_role === 'business' ? 'text-emerald-600' :
                                log.user_role === 'influencer' ? 'text-amber-600' :
                                'text-gray-500'
                              } />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-900 block">
                                {log.user_email || log.user || 'System'}
                              </span>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium mt-0.5 ${roleColor}`}>
                                {log.user_role || 'system'}
                              </span>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${actionColor.split(' ').slice(1).join(' ')}`}>
                              {ActionIcon}
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded ${actionColor}`}>
                              {log.action?.replace(/_/g, ' ') || '—'}
                            </span>
                          </div>
                        </td>
                        
                        <td className="px-5 py-4">
                          <div className="space-y-1 max-w-xs">
                            {log.oldValue && log.oldValue !== '""' && (
                              <div className="flex items-start gap-2 text-xs">
                                <EyeOff size={12} className="text-gray-400 mt-0.5 shrink-0" />
                                <span className="font-mono text-gray-400 line-through break-all" title={log.oldValue}>
                                  {log.oldValue.length > 40 ? `${log.oldValue.substring(0, 40)}...` : log.oldValue}
                                </span>
                              </div>
                            )}
                            {log.newValue && log.newValue !== '""' && (
                              <div className="flex items-start gap-2 text-xs">
                                <Eye size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                                <span className="font-mono text-emerald-600 break-all" title={log.newValue}>
                                  {log.newValue.length > 40 ? `${log.newValue.substring(0, 40)}...` : log.newValue}
                                </span>
                              </div>
                            )}
                            {(!log.oldValue || log.oldValue === '""') && (!log.newValue || log.newValue === '""') && (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
                            <Server size={12} className="text-gray-400 shrink-0" />
                            <span className="truncate max-w-[100px]" title={log.ip}>
                              {log.ip || '127.0.0.1'}
                            </span>
                          </div>
                        </td>
                        
                        <td className="px-5 py-4">
                          {log.user_operator_id ? (
                            <span className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                              {log.user_operator_id}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-gray-400">
                      <div className="flex flex-col items-center">
                        <Activity size={32} className="text-gray-300 mb-3" />
                        <p className="text-sm font-medium">No audit logs found</p>
                        <p className="text-xs mt-1">Try adjusting your filters or search criteria</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Load More */}
          {hasMore && filteredLogs.length > 0 && (
            <div className="px-5 py-4 border-t border-gray-100 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : <ChevronRight size={14} />}
                {loading ? 'Loading...' : 'Load More Records'}
              </button>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 text-gray-400">
            <span>Showing {filteredLogs.length} of {stats?.total || 0} records</span>
            <span>•</span>
            <span>Last updated {new Date().toLocaleTimeString()}</span>
          </div>
          
          <div className="flex items-center gap-3">
            {scope !== 'all' && (
              <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-lg">
                <ShieldAlert size={12} />
                Filtering: {scope} actions only
              </span>
            )}
            {actionFilter !== 'all' && (
              <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg">
                <Activity size={12} />
                Action: {actionFilter}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <div className={`p-1.5 rounded-lg ${color}`}>
          <Icon size={12} />
        </div>
      </div>
      <p className="text-base font-semibold text-gray-900">{value}</p>
    </div>
  );
}

interface ScopeBtnProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ElementType;
}

function ScopeBtn({ active, onClick, label, icon: Icon }: ScopeBtnProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
        active 
          ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon size={14} className={active ? 'text-purple-600' : 'text-gray-400'} />
      {label}
    </button>
  );
}
