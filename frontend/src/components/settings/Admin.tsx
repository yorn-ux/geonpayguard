'use client';
import { useState, useEffect } from 'react';
import { 
  Settings, ShieldAlert,
  Zap,  Save, RefreshCw,
  Radio, Ban, 
   Plus, Trash2, CheckCircle, AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Types
interface PlatformSettings {
  globalPlatformFee: number;
  highValueThreshold: number;
  escalationDelay: string;
  disputeAutoResolution: string;
  payoutCycle: string;
}

interface RiskSettings {
  autoFlagNodeThreshold: number;
  hardFreezeVaultThreshold: number;
  enforceBiometricForAdmins: boolean;
  globalBlacklist: string[];
  freezeWebsite: boolean;
  freezeMessage?: string;
}

interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  active: boolean;
  createdAt: string;
  expiresAt?: string;
}

export default function AdminSettings() {
  const router = useRouter();
  const [tab, setTab] = useState('platform');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    globalPlatformFee: 5.0,
    highValueThreshold: 250000,
    escalationDelay: '24 Hours',
    disputeAutoResolution: '14 Days',
    payoutCycle: 'Real-time (STK)'
  });

  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    autoFlagNodeThreshold: 3,
    hardFreezeVaultThreshold: 500000,
    enforceBiometricForAdmins: false,
    globalBlacklist: [],
    freezeWebsite: false,
    freezeMessage: 'System maintenance in progress. Please check back later.'
  });

  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [blacklistInput, setBlacklistInput] = useState('');
  
  // Broadcast form state
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'critical',
    expiresAt: ''
  });
  const [showBroadcastForm, setShowBroadcastForm] = useState(false);
  const [freezeConfirmation, setFreezeConfirmation] = useState('');

  // Helper function to get token
  const getToken = (): string | null => {
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
  };

  // Helper function to get auth headers
  const getAuthHeaders = (): Record<string, string> => {
    const token = getToken();
    if (!token) {
      router.push('/auth/login');
      throw new Error('No authentication token found');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Check authentication on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/auth/login');
    }
  }, [router]);

  // API Base URL from environment
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Fetch all admin data
  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = getAuthHeaders();
      
      const [platformRes, riskRes, broadcastsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/admin/platform-settings`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/admin/risk-settings`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/admin/broadcasts`, { headers })
      ]);

      if (platformRes.status === 401 || riskRes.status === 401 || broadcastsRes.status === 401) {
        localStorage.removeItem('auth_token');
        document.cookie = 'geon_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        router.push('/auth/login');
        throw new Error('Session expired. Please login again.');
      }

      if (!platformRes.ok || !riskRes.ok || !broadcastsRes.ok) {
        throw new Error('Failed to fetch admin data');
      }

      const platformData = await platformRes.json();
      const riskData = await riskRes.json();
      const broadcastsData = await broadcastsRes.json();

      setPlatformSettings(platformData);
      setRiskSettings(riskData);
      setBroadcasts(broadcastsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  // Save platform settings
  const savePlatformSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/platform-settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(platformSettings)
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/auth/login');
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        throw new Error('Failed to save platform settings');
      }

      setSuccessMessage('Platform settings updated successfully');
      await fetchAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Save risk settings
  const saveRiskSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/risk-settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(riskSettings)
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/auth/login');
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        throw new Error('Failed to save risk settings');
      }

      setSuccessMessage('Risk settings updated successfully');
      await fetchAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Toggle website freeze
  const toggleWebsiteFreeze = async () => {
    if (!riskSettings.freezeWebsite && freezeConfirmation !== 'FREEZE') {
      setError('Please type "FREEZE" to confirm website freeze');
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/risk-settings/freeze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          freeze: !riskSettings.freezeWebsite,
          message: riskSettings.freezeMessage 
        })
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/auth/login');
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        throw new Error('Failed to update freeze status');
      }

      setRiskSettings({
        ...riskSettings,
        freezeWebsite: !riskSettings.freezeWebsite
      });
      
      setFreezeConfirmation('');
      setSuccessMessage(riskSettings.freezeWebsite ? 'Website unfrozen' : 'Website frozen successfully');
      await fetchAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update freeze status');
    } finally {
      setSaving(false);
    }
  };

  // Add to blacklist
  const addToBlacklist = async () => {
    if (!blacklistInput.trim()) return;

    setSaving(true);
    setError(null);
    
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/risk-settings/blacklist`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ entry: blacklistInput })
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/auth/login');
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        throw new Error('Failed to add to blacklist');
      }

      setBlacklistInput('');
      setSuccessMessage('Entry added to blacklist');
      await fetchAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to blacklist');
    } finally {
      setSaving(false);
    }
  };

  // Remove from blacklist
  const removeFromBlacklist = async (entry: string) => {
    setSaving(true);
    setError(null);
    
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/risk-settings/blacklist`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ entry })
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/auth/login');
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        throw new Error('Failed to remove from blacklist');
      }

      setSuccessMessage('Entry removed from blacklist');
      await fetchAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove from blacklist');
    } finally {
      setSaving(false);
    }
  };

  // Create broadcast
  const createBroadcast = async () => {
    if (!broadcastForm.title || !broadcastForm.message) {
      setError('Title and message are required');
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/broadcasts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(broadcastForm)
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/auth/login');
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        throw new Error('Failed to create broadcast');
      }

      setBroadcastForm({ title: '', message: '', type: 'info', expiresAt: '' });
      setShowBroadcastForm(false);
      setSuccessMessage('Broadcast created successfully');
      await fetchAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create broadcast');
    } finally {
      setSaving(false);
    }
  };

  // Toggle broadcast active status
  const toggleBroadcast = async (id: string, active: boolean) => {
    setSaving(true);
    
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/broadcasts/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ active: !active })
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/auth/login');
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        throw new Error('Failed to update broadcast');
      }

      setSuccessMessage(`Broadcast ${!active ? 'activated' : 'deactivated'}`);
      await fetchAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update broadcast');
    } finally {
      setSaving(false);
    }
  };

  // Delete broadcast
  const deleteBroadcast = async (id: string) => {
    if (!confirm('Are you sure you want to delete this broadcast?')) return;

    setSaving(true);
    
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/broadcasts/${id}`, {
        method: 'DELETE',
        headers
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/auth/login');
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        throw new Error('Failed to delete broadcast');
      }

      setSuccessMessage('Broadcast deleted');
      await fetchAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete broadcast');
    } finally {
      setSaving(false);
    }
  };

  const adminTabs = [
    { id: 'platform', label: 'Platform Settings', icon: Settings },
    { id: 'risk', label: 'Risk Management', icon: ShieldAlert },
    { id: 'broadcast', label: 'Broadcasts', icon: Radio }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-400">Loading admin controls...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Settings size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Admin Settings</h1>
              <p className="text-sm text-gray-500">Configure platform parameters and security controls</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 text-rose-700">
            <AlertCircle size={18} className="shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-emerald-700">
            <CheckCircle size={18} className="shrink-0" />
            <span className="text-sm">{successMessage}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 bg-white p-1 rounded-lg border border-gray-100 w-fit">
          {adminTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          
          {/* Platform Settings */}
          {tab === 'platform' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Platform Settings</h2>
                  <p className="text-sm text-gray-500 mt-1">Configure global platform parameters</p>
                </div>
                <button
                  onClick={savePlatformSettings}
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-5 rounded-lg">
                  <label className="text-xs text-gray-500 mb-1 block">Global Platform Fee (%)</label>
                  <input 
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-lg font-semibold text-gray-900 outline-none focus:border-purple-400"
                    value={platformSettings.globalPlatformFee}
                    onChange={(e) => setPlatformSettings({
                      ...platformSettings,
                      globalPlatformFee: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>

                <div className="bg-gray-50 p-5 rounded-lg">
                  <label className="text-xs text-gray-500 mb-1 block">High-Value Threshold (KES)</label>
                  <input 
                    type="number"
                    step="1000"
                    min="0"
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-lg font-semibold text-gray-900 outline-none focus:border-purple-400"
                    value={platformSettings.highValueThreshold}
                    onChange={(e) => setPlatformSettings({
                      ...platformSettings,
                      highValueThreshold: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-xs text-gray-500 mb-1 block">Escalation Delay</label>
                  <select
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400"
                    value={platformSettings.escalationDelay}
                    onChange={(e) => setPlatformSettings({...platformSettings, escalationDelay: e.target.value})}
                  >
                    <option>12 Hours</option>
                    <option>24 Hours</option>
                    <option>48 Hours</option>
                    <option>72 Hours</option>
                  </select>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-xs text-gray-500 mb-1 block">Dispute Resolution</label>
                  <select
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400"
                    value={platformSettings.disputeAutoResolution}
                    onChange={(e) => setPlatformSettings({...platformSettings, disputeAutoResolution: e.target.value})}
                  >
                    <option>7 Days</option>
                    <option>14 Days</option>
                    <option>21 Days</option>
                    <option>30 Days</option>
                  </select>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-xs text-gray-500 mb-1 block">Payout Cycle</label>
                  <select
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400"
                    value={platformSettings.payoutCycle}
                    onChange={(e) => setPlatformSettings({...platformSettings, payoutCycle: e.target.value})}
                  >
                    <option>Real-time (STK)</option>
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Risk Settings */}
          {tab === 'risk' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Risk Management</h2>
                  <p className="text-sm text-gray-500 mt-1">Configure security thresholds and blacklist</p>
                </div>
                <button
                  onClick={saveRiskSettings}
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              {/* Website Freeze */}
              <div className={`p-5 rounded-lg border ${
                riskSettings.freezeWebsite ? 'bg-rose-50 border-rose-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      riskSettings.freezeWebsite ? 'bg-rose-200' : 'bg-white'
                    }`}>
                      <Ban size={16} className={riskSettings.freezeWebsite ? 'text-rose-600' : 'text-gray-400'} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Website Freeze</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {riskSettings.freezeWebsite 
                          ? 'Website is currently frozen. All user access is blocked.'
                          : 'Website is active and accessible to all users.'}
                      </p>
                    </div>
                  </div>
                  
                  {!riskSettings.freezeWebsite && (
                    <input
                      type="text"
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm w-32"
                      value={freezeConfirmation}
                      onChange={(e) => setFreezeConfirmation(e.target.value)}
                      placeholder="FREEZE"
                    />
                  )}
                </div>

                {riskSettings.freezeWebsite && (
                  <div className="mt-4">
                    <label className="text-xs text-gray-500 mb-1 block">Freeze Message</label>
                    <textarea
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400"
                      rows={3}
                      value={riskSettings.freezeMessage}
                      onChange={(e) => setRiskSettings({
                        ...riskSettings,
                        freezeMessage: e.target.value
                      })}
                    />
                  </div>
                )}

                <button
                  onClick={toggleWebsiteFreeze}
                  disabled={saving || (!riskSettings.freezeWebsite && freezeConfirmation !== 'FREEZE')}
                  className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                    riskSettings.freezeWebsite
                      ? 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50'
                      : 'bg-rose-600 text-white hover:bg-rose-700'
                  }`}
                >
                  {riskSettings.freezeWebsite ? 'Unfreeze Website' : 'Freeze Website'}
                </button>
              </div>

              {/* Risk Thresholds */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-5 rounded-lg">
                  <label className="text-xs text-gray-500 mb-1 block">Auto-Flag Node Threshold</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range"
                      min="0"
                      max="10"
                      value={riskSettings.autoFlagNodeThreshold}
                      onChange={(e) => setRiskSettings({
                        ...riskSettings,
                        autoFlagNodeThreshold: parseInt(e.target.value)
                      })}
                      className="flex-1"
                    />
                    <span className="text-sm font-semibold text-gray-900 min-w-[3rem]">
                      {riskSettings.autoFlagNodeThreshold}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Auto-flag after X disputes</p>
                </div>

                <div className="bg-gray-50 p-5 rounded-lg">
                  <label className="text-xs text-gray-500 mb-1 block">Hard-Freeze Vault Threshold</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">KES</span>
                    <input 
                      type="number"
                      step="10000"
                      min="0"
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400"
                      value={riskSettings.hardFreezeVaultThreshold}
                      onChange={(e) => setRiskSettings({
                        ...riskSettings,
                        hardFreezeVaultThreshold: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Biometric Toggle */}
              <div className="bg-gray-50 p-5 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Enforce Biometric for Admins</p>
                    <p className="text-xs text-gray-500 mt-1">Require 2FA for all admin accounts</p>
                  </div>
                  <button
                    onClick={() => setRiskSettings({
                      ...riskSettings,
                      enforceBiometricForAdmins: !riskSettings.enforceBiometricForAdmins
                    })}
                    className={`relative w-12 h-6 rounded-full p-1 transition-all ${
                      riskSettings.enforceBiometricForAdmins ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                      riskSettings.enforceBiometricForAdmins ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Blacklist */}
              <div className="bg-gray-50 p-5 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Global Blacklist</h3>
                
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400"
                    placeholder="Enter domain, IP, or wallet address..."
                    value={blacklistInput}
                    onChange={(e) => setBlacklistInput(e.target.value)}
                  />
                  <button
                    onClick={addToBlacklist}
                    disabled={saving || !blacklistInput.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>

                {riskSettings.globalBlacklist.length > 0 ? (
                  <div className="space-y-2">
                    {riskSettings.globalBlacklist.map((entry, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200">
                        <span className="text-sm font-mono text-gray-600">{entry}</span>
                        <button
                          onClick={() => removeFromBlacklist(entry)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">No entries in blacklist</p>
                )}
              </div>
            </div>
          )}

          {/* Broadcasts */}
          {tab === 'broadcast' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Global Broadcasts</h2>
                  <p className="text-sm text-gray-500 mt-1">Send announcements to all users</p>
                </div>
                <button
                  onClick={() => setShowBroadcastForm(!showBroadcastForm)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-all flex items-center gap-2"
                >
                  <Radio size={14} />
                  New Broadcast
                </button>
              </div>

              {/* Broadcast Form */}
              {showBroadcastForm && (
                <div className="bg-purple-50 p-5 rounded-lg border border-purple-200 space-y-4">
                  <h3 className="text-sm font-medium text-purple-900">Create New Broadcast</h3>
                  
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Title</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400"
                      value={broadcastForm.title}
                      onChange={(e) => setBroadcastForm({...broadcastForm, title: e.target.value})}
                      placeholder="Emergency Maintenance"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Message</label>
                    <textarea
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400"
                      rows={4}
                      value={broadcastForm.message}
                      onChange={(e) => setBroadcastForm({...broadcastForm, message: e.target.value})}
                      placeholder="We will be performing scheduled maintenance..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Type</label>
                      <select
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400"
                        value={broadcastForm.type}
                        onChange={(e) => setBroadcastForm({...broadcastForm, type: e.target.value as any})}
                      >
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Expires At</label>
                      <input
                        type="datetime-local"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400"
                        value={broadcastForm.expiresAt}
                        onChange={(e) => setBroadcastForm({...broadcastForm, expiresAt: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={createBroadcast}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-all disabled:opacity-50"
                    >
                      {saving ? 'Sending...' : 'Send Broadcast'}
                    </button>
                    <button
                      onClick={() => setShowBroadcastForm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-300 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Broadcast List */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">
                  Active Broadcasts ({broadcasts.filter(b => b.active).length})
                </h3>

                {broadcasts.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <Radio size={32} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">No broadcasts yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {broadcasts.map((broadcast) => (
                      <div
                        key={broadcast.id}
                        className={`p-4 rounded-lg border ${
                          broadcast.type === 'critical' 
                            ? 'bg-rose-50 border-rose-200' 
                            : broadcast.type === 'warning'
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-blue-50 border-blue-200'
                        } ${!broadcast.active && 'opacity-50'}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              broadcast.type === 'critical'
                                ? 'bg-rose-200 text-rose-700'
                                : broadcast.type === 'warning'
                                ? 'bg-amber-200 text-amber-700'
                                : 'bg-blue-200 text-blue-700'
                            }`}>
                              {broadcast.type}
                            </span>
                            <h4 className="text-sm font-semibold text-gray-900">{broadcast.title}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleBroadcast(broadcast.id, broadcast.active)}
                              className={`p-1.5 rounded ${
                                broadcast.active
                                  ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                            >
                              <Zap size={14} />
                            </button>
                            <button
                              onClick={() => deleteBroadcast(broadcast.id)}
                              className="p-1.5 bg-rose-100 text-rose-600 rounded hover:bg-rose-200"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">{broadcast.message}</p>

                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span>Created: {new Date(broadcast.createdAt).toLocaleDateString()}</span>
                          {broadcast.expiresAt && (
                            <span>Expires: {new Date(broadcast.expiresAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}