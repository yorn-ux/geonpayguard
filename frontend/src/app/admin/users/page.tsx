'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Wallet, RefreshCw, Search, UserPlus, 
  Loader2, ShieldAlert, 
  Users, UserCog, Briefcase, Star, 
  ChevronLeft, ChevronRight, Eye, Lock, Unlock,
  CheckCircle, AlertCircle, Filter, X
} from 'lucide-react';

// Sub-Components
import { RegistrationModal } from '@/components/auth/RegistrationModal';
import { OperatorProfileModal } from '@/components/admin/OperatorProfileModal';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'amber' | 'emerald' | 'orange';
}

interface Operator {
  id: number;
  operator_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'operator' | 'business' | 'influencer';
  is_active: boolean;
  is_verified: boolean;
  kyc_status: string;
  created_at: string;
  last_login: string | null;
  enrolled_by: string | null;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  admins: number;
  operators: number;
  businesses: number;
  influencers: number;
  verified: number;
  pending_kyc: number;
}

export default function OperatorLedger() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{show: boolean, opId: string, action: string} | null>(null);

  const [stats, setStats] = useState<Stats>({ 
    total: 0, 
    active: 0, 
    inactive: 0, 
    admins: 0,
    operators: 0,
    businesses: 0,
    influencers: 0,
    verified: 0,
    pending_kyc: 0
  });
  
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const router = useRouter();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // EXACT same token function as Admin Dashboard
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

  // EXACT same headers function as Admin Dashboard
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }, [getToken]);

  // Check admin access (same as Admin Dashboard)
  const checkAdminAccess = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    const storedUser = localStorage.getItem('geon_user');
    if (!storedUser) return false;
    
    try {
      const user = JSON.parse(storedUser);
      return user.role === 'admin' || user.role === 'operator';
    } catch {
      return false;
    }
  }, []);

  // FIXED: Simplified fetchOperators to match Admin Dashboard pattern
  const fetchOperators = useCallback(async () => {
    if (!checkAdminAccess()) {
      router.push('/auth/login');
      return;
    }

    if (operators.length === 0) setLoading(true);
    
    const token = getToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }

    try {
      console.log('Fetching operators from:', `${API_BASE_URL}/api/v1/admin/operators?limit=5`);
      
      const response = await fetch(
        `${API_BASE_URL}/api/v1/admin/operators?limit=5`, // Using same pattern as Admin Dashboard
        { headers: getAuthHeaders() }
      );

      console.log('Response status:', response.status);

      if (response.status === 401 || response.status === 403) {
        router.push('/auth/login');
        return;
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      // EXACT same handling as Admin Dashboard
      const operatorList = Array.isArray(data) ? data : data.operators || [];
      
      console.log('Operator list:', operatorList);
      setOperators(operatorList);
      
      // Calculate stats from the fetched operators
      const newStats = {
        total: operatorList.length,
        active: operatorList.filter((u: Operator) => u.is_active === true).length,
        inactive: operatorList.filter((u: Operator) => u.is_active === false).length,
        admins: operatorList.filter((u: Operator) => u.role === 'admin').length,
        operators: operatorList.filter((u: Operator) => u.role === 'operator').length,
        businesses: operatorList.filter((u: Operator) => u.role === 'business').length,
        influencers: operatorList.filter((u: Operator) => u.role === 'influencer').length,
        verified: operatorList.filter((u: Operator) => u.is_verified === true).length,
        pending_kyc: operatorList.filter((u: Operator) => 
          u.kyc_status === 'PENDING' || u.kyc_status === 'UNDER_REVIEW'
        ).length
      };
      
      console.log('Calculated stats:', newStats);
      setStats(newStats);

    } catch (error) {
      console.error('Fetch operators error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API_BASE_URL, router, checkAdminAccess, getToken, getAuthHeaders]);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  const handleRegisterPartner = async (formData: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Enrollment protocol failed");
      }

      fetchOperators(); 
      setShowRegistrationModal(false);
      return data;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const handleActionExecution = async () => {
    if (!confirmModal) return;
    const { opId, action } = confirmModal;
    
    setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ operator_id: opId, action: action })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `Protocol Violation`);

      fetchOperators();
    } catch (err: any) {
      console.error('Action failed:', err);
    } finally {
      setConfirmModal(null);
      setRefreshing(false);
    }
  };

  const handleRoleChange = async (operatorId: string, newRole: string) => {
    setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/role`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          operator_id: operatorId, 
          role: newRole 
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `Role change failed`);

      fetchOperators();
    } catch (err: any) {
      console.error('Role change failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Apply filters
  const filteredOperators = operators.filter((op: Operator) => {
    const matchesSearch = searchTerm === '' || 
      op.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.operator_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.role?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || op.role === roleFilter;
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && op.is_active === true) ||
      (statusFilter === 'inactive' && op.is_active === false);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'operator': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'business': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'influencer': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status?.toUpperCase()) {
      case 'VERIFIED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'REJECTED': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'PENDING': 
      case 'UNDER_REVIEW': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Users size={20} className="text-purple-600" />
              Operator Ledger
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage system users and their permissions</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push('/vaults')} 
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              <Wallet size={16} /> Vaults
            </button>
            <button 
              onClick={() => { setRefreshing(true); fetchOperators(); }} 
              disabled={refreshing} 
              className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-all"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin text-purple-600' : ''} />
            </button>
          </div>
        </div>

        {/* Stats Grid - This will now show the same numbers as Admin Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <StatCard label="Total Users" value={stats.total} icon={Users} color="blue" />
          <StatCard label="Active" value={stats.active} icon={CheckCircle} color="green" />
          <StatCard label="Admins" value={stats.admins} icon={ShieldAlert} color="purple" />
          <StatCard label="Business" value={stats.businesses} icon={Briefcase} color="emerald" />
          <StatCard label="Influencers" value={stats.influencers} icon={Star} color="amber" />
        </div>

        {/* Search & Actions */}
        <div className="bg-white rounded-lg border border-gray-100 p-4 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, ID, or role..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              <Filter size={16} />
              Filters
            </button>
            
            <button 
              onClick={() => setShowRegistrationModal(true)} 
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={16} /> Enroll New User
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Role</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="operator">Operator</option>
                  <option value="business">Business</option>
                  <option value="influencer">Influencer</option>
                </select>
              </div>
              
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                >
                  <X size={14} /> Clear Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          {loading && operators.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-purple-600 mb-4" size={32} />
              <p className="text-sm text-gray-400">Loading operator records...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-xs text-gray-400">
                    <tr>
                      <th className="px-5 py-3">Operator</th>
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">KYC</th>
                      <th className="px-5 py-3">Last Login</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOperators.length > 0 ? (
                      filteredOperators.map((op) => (
                        <tr key={op.operator_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{op.full_name || 'N/A'}</p>
                              <p className="text-xs text-gray-400">{op.email || 'N/A'}</p>
                              <p className="text-[10px] font-mono text-gray-300 mt-0.5">
                                {op.operator_id ? `${op.operator_id.slice(0, 8)}...` : 'N/A'}
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(op.role)}`}>
                              {op.role || 'N/A'}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${op.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                              <span className="text-xs text-gray-600">{op.is_active ? 'Active' : 'Inactive'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(op.kyc_status)}`}>
                              {op.kyc_status || 'PENDING'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-400">
                            {op.last_login ? new Date(op.last_login).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => { setSelectedOperator(op); setShowProfileModal(true); }}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                title="View Profile"
                              >
                                <Eye size={14} />
                              </button>
                              
                              {op.role !== 'admin' && (
                                <button
                                  onClick={() => setConfirmModal({ show: true, opId: op.operator_id, action: op.is_active ? 'suspend' : 'activate' })}
                                  className={`p-1.5 rounded ${
                                    op.is_active 
                                      ? 'text-amber-600 hover:bg-amber-50' 
                                      : 'text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                  title={op.is_active ? 'Suspend' : 'Activate'}
                                >
                                  {op.is_active ? <Lock size={14} /> : <Unlock size={14} />}
                                </button>
                              )}
                              
                              <button
                                onClick={() => handleRoleChange(op.operator_id, 
                                  op.role === 'influencer' ? 'business' : 
                                  op.role === 'business' ? 'operator' : 
                                  op.role === 'operator' ? 'admin' : 'influencer'
                                )}
                                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                                title="Change Role"
                              >
                                <UserCog size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                          {operators.length === 0 && !loading ? 
                            "No operators found. Try refreshing or check your connection." : 
                            "No operators found matching your search"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <span className="text-xs text-gray-400">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedOperator && (
        <OperatorProfileModal 
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          operator={selectedOperator}
        />
      )}
      
      <RegistrationModal 
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        onRegister={handleRegisterPartner}
        isDark={false}
      />

      {/* Confirmation Modal */}
      {confirmModal?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-xl p-6 text-center border border-gray-200 shadow-xl">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-amber-600" size={24} />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Confirm Action</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to <span className="font-medium text-amber-600">{confirmModal.action}</span> this operator?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmModal(null)} 
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleActionExecution} 
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  const colorClass = colorClasses[color] || 'bg-gray-50 text-gray-600';

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{label}</span>
        <div className={`p-1.5 rounded-lg ${colorClass}`}>
          <Icon size={14} />
        </div>
      </div>
      <p className="text-lg font-semibold text-gray-900">{value.toLocaleString()}</p>
    </div>
  );
}
