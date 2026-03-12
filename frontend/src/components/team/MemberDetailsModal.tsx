'use client';

import { useState } from 'react';
import {
  X, User, Mail, Shield, Calendar, Clock,
  Fingerprint, Key, BadgeCheck, Ban, AlertCircle,
  Edit2, Save, Phone, Building, FileText, History,
  CheckCircle, XCircle, Lock,  RefreshCw
} from 'lucide-react';
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

interface MemberDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember;
  onUpdate: () => void;
}

export default function MemberDetailsModal({ isOpen, onClose, member, onUpdate }: MemberDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'permissions' | 'activity' | 'security'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<TeamMember>>({});
  const [saving, setSaving] = useState(false);
  const [resettingMFA, setResettingMFA] = useState(false);
  
  const { showToast } = useNotificationStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token') || localStorage.getItem('access_token');
  };

  const startEditing = () => {
    setEditForm({
      full_name: member.full_name,
      role: member.role,
      department: member.department,
      phone: member.phone,
      notes: member.notes
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const handleSave = async () => {
    setSaving(true);
    const token = getAuthToken();

    try {
      const res = await fetch(`${API_URL}/api/v1/business/team/${member.operator_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (!res.ok) throw new Error('Failed to update member');

      showToast('Member updated successfully', 'success');
      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetMFA = async () => {
    if (!confirm('Are you sure you want to reset MFA for this user? They will need to set up MFA again on next login.')) return;

    setResettingMFA(true);
    const token = getAuthToken();

    try {
      const res = await fetch(`${API_URL}/api/v1/business/team/${member.operator_id}/reset-mfa`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) throw new Error('Failed to reset MFA');

      showToast('MFA reset successfully. User will need to reconfigure.', 'success');
      onUpdate();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setResettingMFA(false);
    }
  };

  const handleSuspend = async () => {
    const action = member.is_suspended ? 'reactivate' : 'suspend';
    if (!confirm(`Are you sure you want to ${action} this member?`)) return;

    const token = getAuthToken();

    try {
      const res = await fetch(`${API_URL}/api/v1/business/team/${member.operator_id}/suspend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ suspend: !member.is_suspended })
      });

      if (!res.ok) throw new Error(`Failed to ${action} member`);

      showToast(`Member ${action}d successfully`, 'success');
      onUpdate();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-700',
      manager: 'bg-blue-100 text-blue-700',
      finance: 'bg-emerald-100 text-emerald-700',
      viewer: 'bg-gray-100 text-gray-700',
      compliance: 'bg-amber-100 text-amber-700'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
              <User size={20} className="text-rose-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Member Details</h2>
              <p className="text-xs text-gray-500">View and manage member information</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-gray-100 flex gap-4 overflow-x-auto">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<User size={14} />} label="Overview" />
          <TabButton active={activeTab === 'permissions'} onClick={() => setActiveTab('permissions')} icon={<Shield size={14} />} label="Permissions" />
          <TabButton active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} icon={<History size={14} />} label="Activity" />
          <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={<Lock size={14} />} label="Security" />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </span>
                {member.is_verified ? (
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium flex items-center gap-1.5">
                    <BadgeCheck size={14} /> Verified
                  </span>
                ) : (
                  <span className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium flex items-center gap-1.5">
                    <Clock size={14} /> Pending
                  </span>
                )}
                {member.is_suspended ? (
                  <span className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-medium flex items-center gap-1.5">
                    <Ban size={14} /> Suspended
                  </span>
                ) : (
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium flex items-center gap-1.5">
                    <CheckCircle size={14} /> Active
                  </span>
                )}
                {member.mfa_enabled && (
                  <span className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium flex items-center gap-1.5">
                    <Key size={14} /> MFA Enabled
                  </span>
                )}
              </div>

              {/* Basic Information */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Basic Information</h3>
                
                {isEditing ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Full Name</label>
                      <input
                        type="text"
                        value={editForm.full_name || ''}
                        onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Department</label>
                      <input
                        type="text"
                        value={editForm.department || ''}
                        onChange={(e) => setEditForm({...editForm, department: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400"
                        placeholder="e.g., Engineering, Marketing"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                      <input
                        type="tel"
                        value={editForm.phone || ''}
                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400"
                        placeholder="+254 XXX XXX XXX"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                      <textarea
                        value={editForm.notes || ''}
                        onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400 min-h-[80px]"
                        placeholder="Additional notes about this member..."
                      />
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="space-y-2">
                    <InfoRow icon={<User size={14} />} label="Full Name" value={member.full_name || 'Not set'} />
                    <InfoRow icon={<Mail size={14} />} label="Email" value={member.email} />
                    <InfoRow icon={<Building size={14} />} label="Department" value={member.department || 'Not assigned'} />
                    <InfoRow icon={<Phone size={14} />} label="Phone" value={member.phone || 'Not provided'} />
                    <InfoRow icon={<FileText size={14} />} label="Notes" value={member.notes || 'No notes'} />
                  </div>
                )}
              </div>

              {/* System Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">System Information</h3>
                <div className="space-y-2">
                  <InfoRow icon={<Fingerprint size={14} />} label="Operator ID" value={member.operator_id} />
                  <InfoRow icon={<Calendar size={14} />} label="Enrolled On" value={formatDate(member.enrolled_at)} />
                  <InfoRow icon={<User size={14} />} label="Enrolled By" value={member.enrolled_by || 'System'} />
                  <InfoRow icon={<Clock size={14} />} label="Last Active" value={formatDate(member.last_active)} />
                </div>
              </div>
            </div>
          )}

          {/* Permissions Tab */}
          {activeTab === 'permissions' && (
            <div className="space-y-5">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Role & Access Level</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-700 mb-2">Current Role: <span className={`inline-block px-2 py-1 rounded text-xs font-medium ml-1 ${getRoleBadgeColor(member.role)}`}>{member.role}</span></p>
                    <p className="text-xs text-gray-500">Role determines base permissions and access levels</p>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Assigned Pages/Sections:</p>
                    <div className="flex flex-wrap gap-2">
                      {member.assigned_pages?.length ? (
                        member.assigned_pages.map(page => (
                          <span key={page} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600">
                            {page}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">No custom page assignments</span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Detailed Permissions:</p>
                    <ul className="space-y-2">
                      {member.permissions?.map(perm => (
                        <li key={perm} className="flex items-center gap-2 text-xs text-gray-600">
                          <CheckCircle size={12} className="text-emerald-500" />
                          {perm}
                        </li>
                      )) || (
                        <li className="text-xs text-gray-400">Default role-based permissions apply</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-5">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Recent Activity</h3>
                <div className="space-y-3">
                  <ActivityItem 
                    action="Login"
                    timestamp="2024-03-15 14:30"
                    status="success"
                  />
                  <ActivityItem 
                    action="Profile Update"
                    timestamp="2024-03-14 09:15"
                    status="success"
                  />
                  <ActivityItem 
                    action="Password Change"
                    timestamp="2024-03-10 11:20"
                    status="success"
                  />
                  <ActivityItem 
                    action="Failed Login Attempt"
                    timestamp="2024-03-09 22:45"
                    status="failed"
                  />
                  <button className="text-xs text-rose-600 hover:text-rose-700 mt-2">
                    View Full Audit Log →
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Session Information</h3>
                <div className="space-y-2">
                  <InfoRow label="Current Sessions" value="1 active session" />
                  <InfoRow label="Last IP Address" value="192.168.1.100" />
                  <InfoRow label="Last User Agent" value="Chrome 122 / macOS" />
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Authentication</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Multi-Factor Authentication</p>
                      <p className="text-xs text-gray-500">Security via authenticator app</p>
                    </div>
                    <div>
                      {member.mfa_enabled ? (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium flex items-center gap-1">
                          <CheckCircle size={12} /> Enabled
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium flex items-center gap-1">
                          <XCircle size={12} /> Disabled
                        </span>
                      )}
                    </div>
                  </div>

                  {member.mfa_enabled && (
                    <button
                      onClick={handleResetMFA}
                      disabled={resettingMFA}
                      className="flex items-center gap-2 text-xs text-amber-600 hover:text-amber-700 disabled:opacity-50"
                    >
                      {resettingMFA ? <RefreshCw size={12} className="animate-spin" /> : <Key size={12} />}
                      Reset MFA Configuration
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Account Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Account Active</p>
                      <p className="text-xs text-gray-500">User can access the system</p>
                    </div>
                    <div>
                      {!member.is_suspended ? (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Active</span>
                      ) : (
                        <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-medium">Suspended</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email Verified</p>
                      <p className="text-xs text-gray-500">User has confirmed email</p>
                    </div>
                    <div>
                      {member.is_verified ? (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Verified</span>
                      ) : (
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Pending</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-100 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={16} className="text-rose-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-rose-900">Danger Zone</p>
                    <p className="text-xs text-rose-700 mb-3">Actions here are irreversible</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSuspend}
                        className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition-colors"
                      >
                        {member.is_suspended ? 'Reactivate Account' : 'Suspend Account'}
                      </button>
                      <button className="px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg text-xs font-medium hover:bg-rose-50 transition-colors">
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          {isEditing ? (
            <>
              <button
                onClick={cancelEditing}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={startEditing}
                className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-colors flex items-center gap-2"
              >
                <Edit2 size={14} />
                Edit Member
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Tab Button Component
function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`pb-2 px-1 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
        active
          ? 'border-rose-500 text-rose-600'
          : 'border-transparent text-gray-400 hover:text-gray-600'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// Info Row Component
function InfoRow({ icon, label, value }: any) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-4 h-4 mt-0.5 text-gray-400">{icon}</div>
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-900">{value}</p>
      </div>
    </div>
  );
}

// Activity Item Component
function ActivityItem({ action, timestamp, status }: any) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
      <div>
        <p className="text-sm text-gray-700">{action}</p>
        <p className="text-xs text-gray-400">{timestamp}</p>
      </div>
      <span className={`text-xs px-2 py-1 rounded ${
        status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
      }`}>
        {status}
      </span>
    </div>
  );
}