'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  UserPlus, Loader2, ShieldX, RefreshCw, ShieldCheck, 
   Lock, 
  Clock, Key, Edit2, Save, X,
  CheckCircle, Filter, Search, Download, Users,
  BadgeCheck, Ban,  History, Eye
} from 'lucide-react';
import InviteMemberModal from '@/components/auth/InviteMemberModal';
import MemberDetailsModal from '@/components/team/MemberDetailsModal';
import { useNotificationStore } from '@/store/useNotificationStore';

interface TeamMember {
  operator_id: string;
  full_name?: string;
  email: string;
  role: 'admin' | 'manager' | 'finance' | 'viewer' | 'compliance';
  is_verified: boolean;
  is_active: boolean;
  is_suspended: boolean;
  assigned_pages?: string[];
  enrolled_by?: string;
  enrolled_at?: string;
  last_active?: string;
  permissions?: string[];
  mfa_enabled?: boolean;
  department?: string;
  phone?: string;
  notes?: string;
}

interface TeamStats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  admins: number;
}

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [filteredTeam, setFilteredTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TeamMember>>({});
  
  const { showToast } = useNotificationStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Calculate team stats
  const stats: TeamStats = {
    total: team.length,
    active: team.filter(m => m.is_active && !m.is_suspended).length,
    pending: team.filter(m => !m.is_verified).length,
    suspended: team.filter(m => m.is_suspended).length,
    admins: team.filter(m => m.role === 'admin').length
  };

  const getAuthToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token') || localStorage.getItem('access_token');
  }, []);

  const fetchTeam = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError("Session expired. Please re-authenticate.");
      setLoading(false);
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/business/team`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch team roster');
      const data = await res.json();
      setTeam(Array.isArray(data) ? data : data.members || []);
      setError(null);
    } catch (err) {
      setError("Personnel data unavailable. Check node connection.");
      showToast("Failed to load team data", "error");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [API_URL, getAuthToken, showToast]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...team];
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.full_name?.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query) ||
        m.operator_id.toLowerCase().includes(query)
      );
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(m => m.role === roleFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(m => m.is_active && !m.is_suspended);
      } else if (statusFilter === 'pending') {
        filtered = filtered.filter(m => !m.is_verified);
      } else if (statusFilter === 'suspended') {
        filtered = filtered.filter(m => m.is_suspended);
      }
    }
    
    setFilteredTeam(filtered);
  }, [team, searchQuery, roleFilter, statusFilter]);

  const handleRevoke = async (operatorId: string) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/api/v1/business/team/${operatorId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Could not revoke access.");
      
      showToast("Access revoked and identity purged.", "success");
      setRevokeTarget(null);
      fetchTeam();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleSuspend = async (operatorId: string, suspend: boolean) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/api/v1/business/team/${operatorId}/suspend`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ suspend })
      });
      
      if (!res.ok) throw new Error("Failed to update member status");
      
      showToast(suspend ? "Member suspended" : "Member reactivated", "success");
      fetchTeam();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };


  const startEditing = (member: TeamMember) => {
    setEditingMember(member.operator_id);
    setEditForm({
      full_name: member.full_name,
      role: member.role,
      department: member.department,
      phone: member.phone,
      notes: member.notes
    });
  };

  const saveEdit = async (operatorId: string) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/api/v1/business/team/${operatorId}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });
      
      if (!res.ok) throw new Error("Failed to update member");
      
      showToast("Member updated successfully", "success");
      setEditingMember(null);
      fetchTeam();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const cancelEdit = () => {
    setEditingMember(null);
    setEditForm({});
  };

  const exportTeamData = () => {
    const dataStr = JSON.stringify(team, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `team-export-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showToast("Team data exported successfully", "success");
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-700 border-purple-200',
      manager: 'bg-blue-100 text-blue-700 border-blue-200',
      finance: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      viewer: 'bg-gray-100 text-gray-700 border-gray-200',
      compliance: 'bg-amber-100 text-amber-700 border-amber-200'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Users size={20} className="text-rose-500" />
              Team Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage operators and their access permissions</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={exportTeamData}
              className="p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-gray-600"
              title="Export team data"
            >
              <Download size={18} />
            </button>
            <button 
              onClick={fetchTeam} 
              disabled={syncing}
              className="p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
            >
              <RefreshCw size={18} className={syncing ? 'animate-spin text-rose-500' : 'text-gray-600'} />
            </button>
            <button 
              onClick={() => setIsInviteModalOpen(true)} 
              className="flex items-center gap-2 bg-rose-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-rose-600 transition-all shadow-sm"
            >
              <UserPlus size={16} /> Invite Member
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Total" value={stats.total} icon={Users} />
          <StatCard label="Active" value={stats.active} icon={CheckCircle} color="text-emerald-600" />
          <StatCard label="Pending" value={stats.pending} icon={Clock} color="text-amber-600" />
          <StatCard label="Suspended" value={stats.suspended} icon={Ban} color="text-rose-600" />
          <StatCard label="Admins" value={stats.admins} icon={ShieldCheck} color="text-purple-600" />
        </div>

        {/* Verification Logic Indicator */}
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-lg flex items-start gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
            <Lock size={16} className="text-rose-500" />
          </div>
          <div className="text-sm">
            <span className="font-medium text-rose-900">Privileged Enrollment Active:</span>
            <p className="text-rose-700 text-xs mt-0.5">As a Business Administrator, operators you enroll will bypass OTP verification and receive immediate node access.</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-all"
            >
              <Filter size={16} />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Role</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-rose-400"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="finance">Finance</option>
                  <option value="viewer">Viewer</option>
                  <option value="compliance">Compliance</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-rose-400"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Team Table */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs text-gray-400">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-gray-300" size={32} /></td></tr>
                ) : filteredTeam.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-sm text-gray-400">No team members found</td></tr>
                ) : (
                  filteredTeam.map((member) => (
                    <tr key={member.operator_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {editingMember === member.operator_id ? (
                          <input
                            type="text"
                            value={editForm.full_name || ''}
                            onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                            className="px-2 py-1 bg-white border border-gray-200 rounded text-sm w-32"
                            placeholder="Full name"
                          />
                        ) : (
                          <div>
                            <p className="text-sm font-medium text-gray-900">{member.full_name || 'Unnamed'}</p>
                            <p className="text-xs text-gray-400">{member.email}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingMember === member.operator_id ? (
                          <select
                            value={editForm.role || member.role}
                            onChange={(e) => setEditForm({...editForm, role: e.target.value as any})}
                            className="px-2 py-1 bg-white border border-gray-200 rounded text-sm"
                          >
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="finance">Finance</option>
                            <option value="viewer">Viewer</option>
                            <option value="compliance">Compliance</option>
                          </select>
                        ) : (
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                            {member.role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {member.is_verified ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-600">
                              <BadgeCheck size={14} />
                              Verified
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-amber-600">
                              <Clock size={14} />
                              Pending
                            </span>
                          )}
                          {member.is_suspended && (
                            <span className="flex items-center gap-1 text-xs text-rose-600">
                              <Ban size={14} />
                              Suspended
                            </span>
                          )}
                          {member.mfa_enabled && (
                            <span className="text-xs text-purple-600" title="MFA Enabled">
                              <Key size={14} />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {member.last_active ? new Date(member.last_active).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {revokeTarget === member.operator_id ? (
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setRevokeTarget(null)} 
                              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleRevoke(member.operator_id)} 
                              className="px-2 py-1 bg-rose-500 text-white rounded text-xs hover:bg-rose-600"
                            >
                              Confirm
                            </button>
                          </div>
                        ) : editingMember === member.operator_id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => saveEdit(member.operator_id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedMember(member);
                                setIsDetailsModalOpen(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => startEditing(member)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            {!member.is_suspended ? (
                              <button
                                onClick={() => handleSuspend(member.operator_id, true)}
                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                                title="Suspend"
                              >
                                <Ban size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSuspend(member.operator_id, false)}
                                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Reactivate"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => setRevokeTarget(member.operator_id)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="Revoke Access"
                            >
                              <ShieldX size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer with placeholder for future audit link */}
        <div className="flex justify-end">
          <button
            onClick={() => showToast("Audit log coming soon", "info")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <History size={16} />
            View Audit Log (Coming Soon)
          </button>
        </div>
      </div>

      {/* Modals */}
      <InviteMemberModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        onSuccess={() => {
          fetchTeam();
          showToast("Operator enrolled successfully", "success");
        }} 
      />

      {selectedMember && (
        <MemberDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          member={selectedMember}
          onUpdate={fetchTeam}
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, icon: Icon, color = "text-gray-900" }: any) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500">{label}</p>
        <Icon size={16} className="text-gray-400" />
      </div>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}