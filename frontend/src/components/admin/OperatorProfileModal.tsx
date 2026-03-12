'use client';

import { 
  X, Mail, Calendar, 
  Zap, History, 
  UserCheck, 
   TrendingUp, 
  Clock, CheckCircle, XCircle,
   Globe, Phone, 
} from 'lucide-react';

interface OperatorProfileProps {
  isOpen: boolean;
  onClose: () => void;
  operator: any;
}

export const OperatorProfileModal = ({ isOpen, onClose, operator }: OperatorProfileProps) => {
  if (!isOpen || !operator) return null;

  const joinDate = operator.created_at 
    ? new Date(operator.created_at).toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })
    : 'Not Recorded';

  const lastLogin = operator.last_login 
    ? new Date(operator.last_login).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Never';

  const getRoleColor = (role: string) => {
    switch(role?.toLowerCase()) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'operator': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'business': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'influencer': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-xl shadow-xl border border-gray-100 flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white text-xl font-semibold shadow-sm">
              {operator.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{operator.full_name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-500 font-mono">
                  {operator.operator_id?.slice(0, 8)}...{operator.operator_id?.slice(-4)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleColor(operator.role)}`}>
                  {operator.role || 'user'}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Profile Info */}
          <div className="space-y-4">
            {/* Status Card */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <h4 className="text-xs font-medium text-gray-500 mb-3 flex items-center gap-2">
                <UserCheck size={14} /> Account Status
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${operator.is_active !== false ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    <span className="text-sm font-medium text-gray-900">
                      {operator.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Verification</span>
                  <div className="flex items-center gap-1">
                    {operator.is_verified ? (
                      <CheckCircle size={14} className="text-emerald-500" />
                    ) : (
                      <XCircle size={14} className="text-gray-300" />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {operator.is_verified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">KYC</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    operator.kyc_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
                    operator.kyc_status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {operator.kyc_status || 'PENDING'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <h4 className="text-xs font-medium text-gray-500 mb-3 flex items-center gap-2">
                <Mail size={14} /> Contact Information
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Mail size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-600">{operator.email}</span>
                </div>
                {operator.phone && (
                  <div className="flex items-center gap-3">
                    <Phone size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600">{operator.phone}</span>
                  </div>
                )}
                {operator.profile?.country && (
                  <div className="flex items-center gap-3">
                    <Globe size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600">{operator.profile.country}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <h4 className="text-xs font-medium text-gray-500 mb-3 flex items-center gap-2">
                <Calendar size={14} /> Timeline
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Joined</span>
                  <span className="text-sm text-gray-900">{joinDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Last Login</span>
                  <span className="text-sm text-gray-900">{lastLogin}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Stats & Activity */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Financial Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-4 text-white">
                <p className="text-xs text-purple-200 mb-1">Wallet Balance</p>
                <p className="text-2xl font-semibold">${(operator.balance || 0).toLocaleString()}</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-purple-200">
                  <TrendingUp size={12} /> +12.5% this month
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${(operator.revenue || 0).toLocaleString()}
                </p>
                <div className="mt-2 flex items-center gap-1 text-xs text-purple-600">
                  <Zap size={12} /> Lifetime earnings
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                <h4 className="text-sm font-medium text-gray-700">Recent Activity</h4>
                <History size={16} className="text-gray-400" />
              </div>
              
              <div className="divide-y divide-gray-100">
                {operator.logs && operator.logs.length > 0 ? (
                  operator.logs.slice(0, 5).map((log: any, i: number) => (
                    <div key={i} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{log.action}</p>
                          <p className="text-xs text-gray-500">{log.details || 'System action'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center">
                    <Clock size={24} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400">No recent activity</p>
                  </div>
                )}
              </div>
            </div>

            {/* Security Badges */}
            <div className="grid grid-cols-2 gap-3">
              <SecurityBadge 
                label="2FA" 
                active={operator.two_factor_enabled} 
                activeLabel="Enabled"
                inactiveLabel="Disabled"
              />
              <SecurityBadge 
                label="Email Verified" 
                active={operator.is_verified} 
                activeLabel="Verified"
                inactiveLabel="Pending"
              />
              <SecurityBadge 
                label="KYC Status" 
                active={operator.kyc_status === 'VERIFIED'} 
                activeLabel="Verified"
                inactiveLabel={operator.kyc_status || 'Pending'}
              />
              <SecurityBadge 
                label="Account" 
                active={operator.is_active !== false} 
                activeLabel="Active"
                inactiveLabel="Inactive"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components

function SecurityBadge({ label, active, activeLabel, inactiveLabel }: any) {
  return (
    <div className={`p-3 rounded-lg border ${
      active 
        ? 'bg-emerald-50 border-emerald-200' 
        : 'bg-gray-50 border-gray-200'
    }`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
        <span className={`text-sm font-medium ${active ? 'text-emerald-700' : 'text-gray-500'}`}>
          {active ? activeLabel : inactiveLabel}
        </span>
      </div>
    </div>
  );
}