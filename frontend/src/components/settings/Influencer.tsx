'use client';
import { useState } from 'react';
import { 
  User, Shield, Zap, Loader2, 
  HardDrive, Smartphone, Globe, 
  CheckCircle2, Lock,  Instagram, Youtube,
  Settings, Bell,  Twitter,
  Camera, Mail, Phone, MapPin,
   ChevronRight, AlertCircle, Edit2,
  Save, X
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function InfluencerSettings({ data: initialData }: { data: any }) {
  const router = useRouter();
  const [tab, setTab] = useState('profile');
  const [data, setData] = useState(initialData || {
    profile: {
      name: '',
      username: '',
      email: '',
      phone: '',
      location: '',
      bio: '',
      is_public: true,
      avatar: '',
      social: {
        instagram: '',
        twitter: '',
        youtube: '',
        tiktok: ''
      }
    },
    payments: {
      mpesa_number: '',
      auto_withdraw: false,
      min_threshold: 1000
    },
    vault: {
      auto_release_days: 7,
      require_contract: false,
      email_notifications: true,
      sms_alerts: false
    },
    notifications: {
      email: true,
      sms: false,
      push: true,
      vault_updates: true,
      payments: true,
      security: true
    }
  });
  
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>('');

  const updateSetting = async (path: string, value: any) => {
    setIsUpdating(path);
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      // Simulate API call - replace with actual fetch
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update local state dynamically
      const keys = path.split('.');
      const newData = { ...data };
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      setData(newData);
      
      setSuccessMessage("Setting updated successfully");
      setTimeout(() => setSuccessMessage(''), 3000);
      setEditingField(null);
    } catch (err) {
      setErrorMessage("Failed to update. Please try again.");
    } finally {
      setIsUpdating(null);
    }
  };

  const startEditing = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'payments', label: 'Payments', icon: Zap },
    { id: 'vault_prefs', label: 'Vault Settings', icon: HardDrive },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('geon_user');
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Settings size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-500">Manage your account preferences</p>
            </div>
          </div>
          
          <Link href="/client/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
        {/* Success/Error Messages */}
        <div className="mb-6">
          {successMessage && (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-lg text-sm border border-emerald-100">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-3 rounded-lg text-sm border border-rose-100">
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <aside className="lg:w-72 shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm sticky top-24">
              {/* User Info Card */}
              <div className="p-4 bg-gray-50 rounded-lg mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center text-white font-medium text-lg">
                      {data?.profile?.name?.charAt(0) || 'U'}
                    </div>
                    <button className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200">
                      <Camera size={10} className="text-gray-500" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{data?.profile?.name || 'Your Name'}</p>
                    <p className="text-xs text-gray-500 truncate">@{data?.profile?.username || 'username'}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Trust Score</span>
                    <span className="font-semibold text-emerald-600">98%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1">
                    <div className="w-[98%] h-1.5 bg-emerald-500 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <nav className="space-y-1">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      tab === t.id 
                        ? 'bg-rose-500 text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <t.icon size={18} />
                    {t.label}
                    {tab === t.id && <ChevronRight size={16} className="ml-auto" />}
                  </button>
                ))}
              </nav>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full mt-4 pt-4 border-t border-gray-100 flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              
              {/* Profile Tab */}
              {tab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage your public profile and social connections</p>
                  </div>

                  {/* Avatar Upload */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                        {data?.profile?.avatar ? (
                          <img src={data.profile.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <User size={32} className="text-gray-400" />
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-white hover:bg-rose-600 transition-colors shadow-sm cursor-pointer">
                        <Camera size={14} />
                        <input type="file" className="hidden" accept="image/*" />
                      </label>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Profile Photo</p>
                      <p className="text-xs text-gray-500">JPG, PNG or GIF. Max 2MB.</p>
                    </div>
                  </div>

                  {/* Basic Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <EditableField
                      label="Full Name"
                      value={data?.profile?.name}
                      path="profile.name"
                      onSave={updateSetting}
                      isEditing={editingField === 'profile.name'}
                      editValue={editValue}
                      onStartEdit={() => startEditing('profile.name', data?.profile?.name)}
                      onCancelEdit={cancelEditing}
                      onEditChange={setEditValue}
                      loading={isUpdating === 'profile.name'}
                      icon={<User size={16} />}
                    />
                    
                    <EditableField
                      label="Username"
                      value={data?.profile?.username}
                      path="profile.username"
                      onSave={updateSetting}
                      isEditing={editingField === 'profile.username'}
                      editValue={editValue}
                      onStartEdit={() => startEditing('profile.username', data?.profile?.username)}
                      onCancelEdit={cancelEditing}
                      onEditChange={setEditValue}
                      loading={isUpdating === 'profile.username'}
                      icon={<At size={16} />}
                    />

                    <EditableField
                      label="Email"
                      value={data?.profile?.email}
                      path="profile.email"
                      onSave={updateSetting}
                      isEditing={editingField === 'profile.email'}
                      editValue={editValue}
                      onStartEdit={() => startEditing('profile.email', data?.profile?.email)}
                      onCancelEdit={cancelEditing}
                      onEditChange={setEditValue}
                      loading={isUpdating === 'profile.email'}
                      type="email"
                      icon={<Mail size={16} />}
                    />

                    <EditableField
                      label="Phone"
                      value={data?.profile?.phone}
                      path="profile.phone"
                      onSave={updateSetting}
                      isEditing={editingField === 'profile.phone'}
                      editValue={editValue}
                      onStartEdit={() => startEditing('profile.phone', data?.profile?.phone)}
                      onCancelEdit={cancelEditing}
                      onEditChange={setEditValue}
                      loading={isUpdating === 'profile.phone'}
                      type="tel"
                      icon={<Phone size={16} />}
                    />

                    <EditableField
                      label="Location"
                      value={data?.profile?.location}
                      path="profile.location"
                      onSave={updateSetting}
                      isEditing={editingField === 'profile.location'}
                      editValue={editValue}
                      onStartEdit={() => startEditing('profile.location', data?.profile?.location)}
                      onCancelEdit={cancelEditing}
                      onEditChange={setEditValue}
                      loading={isUpdating === 'profile.location'}
                      icon={<MapPin size={16} />}
                      className="md:col-span-2"
                    />
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <label className="text-sm text-gray-600">Bio</label>
                    {editingField === 'profile.bio' ? (
                      <div className="space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          rows={4}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all resize-none"
                          placeholder="Tell your story..."
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateSetting('profile.bio', editValue)}
                            disabled={isUpdating === 'profile.bio'}
                            className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50 flex items-center gap-2"
                          >
                            {isUpdating === 'profile.bio' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 flex items-center gap-2"
                          >
                            <X size={14} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => startEditing('profile.bio', data?.profile?.bio)}
                        className="group relative p-4 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer hover:border-rose-200 hover:bg-rose-50/30 transition-all"
                      >
                        <p className="text-sm text-gray-700 pr-8">
                          {data?.profile?.bio || <span className="text-gray-400">Add a bio to tell your story...</span>}
                        </p>
                        <Edit2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>

                  {/* Social Links */}
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Social Profiles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <EditableSocial
                        platform="Instagram"
                        icon={<Instagram size={16} />}
                        value={data?.profile?.social?.instagram}
                        path="profile.social.instagram"
                        onSave={updateSetting}
                        isEditing={editingField === 'profile.social.instagram'}
                        editValue={editValue}
                        onStartEdit={() => startEditing('profile.social.instagram', data?.profile?.social?.instagram)}
                        onCancelEdit={cancelEditing}
                        onEditChange={setEditValue}
                        loading={isUpdating === 'profile.social.instagram'}
                        color="text-pink-600"
                        placeholder="username"
                      />
                      <EditableSocial
                        platform="Twitter"
                        icon={<Twitter size={16} />}
                        value={data?.profile?.social?.twitter}
                        path="profile.social.twitter"
                        onSave={updateSetting}
                        isEditing={editingField === 'profile.social.twitter'}
                        editValue={editValue}
                        onStartEdit={() => startEditing('profile.social.twitter', data?.profile?.social?.twitter)}
                        onCancelEdit={cancelEditing}
                        onEditChange={setEditValue}
                        loading={isUpdating === 'profile.social.twitter'}
                        color="text-sky-500"
                        placeholder="username"
                      />
                      <EditableSocial
                        platform="YouTube"
                        icon={<Youtube size={16} />}
                        value={data?.profile?.social?.youtube}
                        path="profile.social.youtube"
                        onSave={updateSetting}
                        isEditing={editingField === 'profile.social.youtube'}
                        editValue={editValue}
                        onStartEdit={() => startEditing('profile.social.youtube', data?.profile?.social?.youtube)}
                        onCancelEdit={cancelEditing}
                        onEditChange={setEditValue}
                        loading={isUpdating === 'profile.social.youtube'}
                        color="text-red-600"
                        placeholder="channel"
                      />
                      <EditableSocial
                        platform="TikTok"
                        icon={<Zap size={16} />}
                        value={data?.profile?.social?.tiktok}
                        path="profile.social.tiktok"
                        onSave={updateSetting}
                        isEditing={editingField === 'profile.social.tiktok'}
                        editValue={editValue}
                        onStartEdit={() => startEditing('profile.social.tiktok', data?.profile?.social?.tiktok)}
                        onCancelEdit={cancelEditing}
                        onEditChange={setEditValue}
                        loading={isUpdating === 'profile.social.tiktok'}
                        color="text-black"
                        placeholder="@username"
                      />
                    </div>
                  </div>

                  {/* Profile Visibility */}
                  <div className="pt-4 border-t border-gray-100">
                    <ToggleSwitch
                      label="Public Profile"
                      description="Allow brands to discover your profile"
                      enabled={data?.profile?.is_public}
                      onToggle={() => updateSetting('profile.is_public', !data?.profile?.is_public)}
                      loading={isUpdating === 'profile.is_public'}
                    />
                  </div>
                </div>
              )}

              {/* Payments Tab */}
              {tab === 'payments' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Payment Settings</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage your payout methods</p>
                  </div>

                  {/* M-Pesa Section */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Smartphone size={18} className="text-emerald-600" />
                      <h3 className="text-sm font-medium text-gray-900">M-PESA</h3>
                      <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full ml-2">Primary</span>
                    </div>
                    
                    <EditableField
                      label="Phone Number"
                      value={data?.payments?.mpesa_number}
                      path="payments.mpesa_number"
                      onSave={updateSetting}
                      isEditing={editingField === 'payments.mpesa_number'}
                      editValue={editValue}
                      onStartEdit={() => startEditing('payments.mpesa_number', data?.payments?.mpesa_number)}
                      onCancelEdit={cancelEditing}
                      onEditChange={setEditValue}
                      loading={isUpdating === 'payments.mpesa_number'}
                      icon={<Phone size={16} />}
                      placeholder="0712 345 678"
                    />
                  </div>

                  {/* Bank Section - Disabled */}
                  <div className="bg-gray-50 rounded-lg p-5 opacity-60">
                    <div className="flex items-center gap-2 mb-4">
                      <Globe size={18} className="text-gray-400" />
                      <h3 className="text-sm font-medium text-gray-500">Bank Transfer</h3>
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full ml-2">Coming Soon</span>
                    </div>
                    <p className="text-xs text-gray-400">Bank transfers will be available soon</p>
                  </div>

                  {/* Auto-withdrawal Toggle */}
                  <div className="pt-4 border-t border-gray-100">
                    <ToggleSwitch
                      label="Auto-withdrawal"
                      description="Automatically withdraw funds when balance exceeds threshold"
                      enabled={data?.payments?.auto_withdraw}
                      onToggle={() => updateSetting('payments.auto_withdraw', !data?.payments?.auto_withdraw)}
                      loading={isUpdating === 'payments.auto_withdraw'}
                    />
                  </div>

                  {/* Withdrawal Threshold */}
                  {data?.payments?.auto_withdraw && (
                    <div className="pl-6">
                      <EditableField
                        label="Minimum Threshold (KES)"
                        value={data?.payments?.min_threshold}
                        path="payments.min_threshold"
                        onSave={updateSetting}
                        isEditing={editingField === 'payments.min_threshold'}
                        editValue={editValue}
                        onStartEdit={() => startEditing('payments.min_threshold', data?.payments?.min_threshold)}
                        onCancelEdit={cancelEditing}
                        onEditChange={setEditValue}
                        loading={isUpdating === 'payments.min_threshold'}
                        type="number"
                        icon={<Lock size={16} />}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Vault Settings Tab */}
              {tab === 'vault_prefs' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Vault Preferences</h2>
                    <p className="text-sm text-gray-500 mt-1">Configure your vault and escrow settings</p>
                  </div>

                  {/* Auto-release Days */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-gray-600">Auto-release Period</label>
                      <span className="text-sm font-medium text-gray-900">{data?.vault?.auto_release_days || 7} days</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="30" 
                      value={data?.vault?.auto_release_days || 7}
                      onChange={(e) => updateSetting('vault.auto_release_days', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>1 day</span>
                      <span>30 days</span>
                    </div>
                  </div>

                  {/* Contract Requirement Toggle */}
                  <div className="pt-4 border-t border-gray-100">
                    <ToggleSwitch
                      label="Require Contract"
                      description="Require signed agreement before vault funds are released"
                      enabled={data?.vault?.require_contract}
                      onToggle={() => updateSetting('vault.require_contract', !data?.vault?.require_contract)}
                      loading={isUpdating === 'vault.require_contract'}
                    />
                  </div>

                  {/* Notification Preferences */}
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Vault Notifications</h3>
                    <div className="space-y-3">
                      <ToggleSwitch
                        label="Email notifications"
                        description="Receive email updates about vault activity"
                        enabled={data?.vault?.email_notifications}
                        onToggle={() => updateSetting('vault.email_notifications', !data?.vault?.email_notifications)}
                        loading={isUpdating === 'vault.email_notifications'}
                        small
                      />
                      <ToggleSwitch
                        label="SMS alerts"
                        description="Get text messages for important events"
                        enabled={data?.vault?.sms_alerts}
                        onToggle={() => updateSetting('vault.sms_alerts', !data?.vault?.sms_alerts)}
                        loading={isUpdating === 'vault.sms_alerts'}
                        small
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {tab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage your account security</p>
                  </div>

                  {/* Password Change */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Change Password</h3>
                    <div className="space-y-3">
                      <input
                        type="password"
                        placeholder="Current password"
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400"
                      />
                      <input
                        type="password"
                        placeholder="New password"
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400"
                      />
                      <input
                        type="password"
                        placeholder="Confirm new password"
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400"
                      />
                      <button className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-colors">
                        Update Password
                      </button>
                    </div>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
                        <p className="text-xs text-gray-500 mt-1">Add an extra layer of security to your account</p>
                      </div>
                      <button className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                        Enable
                      </button>
                    </div>
                  </div>

                  {/* Active Sessions */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Active Sessions</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Globe size={16} className="text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-900">Current Session</p>
                            <p className="text-xs text-gray-500">Chrome on Windows • Nairobi, Kenya</p>
                          </div>
                        </div>
                        <span className="text-xs text-emerald-600">Active</span>
                      </div>
                      <button className="text-xs text-rose-600 hover:text-rose-700">
                        Revoke all other sessions
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {tab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
                    <p className="text-sm text-gray-500 mt-1">Choose how you want to be notified</p>
                  </div>

                  <div className="space-y-4">
                    <ToggleSwitch
                      label="Email Notifications"
                      description="Receive updates via email"
                      enabled={data?.notifications?.email}
                      onToggle={() => updateSetting('notifications.email', !data?.notifications?.email)}
                      loading={isUpdating === 'notifications.email'}
                    />
                    
                    <ToggleSwitch
                      label="SMS Notifications"
                      description="Get text message alerts"
                      enabled={data?.notifications?.sms}
                      onToggle={() => updateSetting('notifications.sms', !data?.notifications?.sms)}
                      loading={isUpdating === 'notifications.sms'}
                    />

                    <ToggleSwitch
                      label="Push Notifications"
                      description="Browser push notifications"
                      enabled={data?.notifications?.push}
                      onToggle={() => updateSetting('notifications.push', !data?.notifications?.push)}
                      loading={isUpdating === 'notifications.push'}
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Notification Types</h3>
                    <div className="space-y-3">
                      <ToggleSwitch
                        label="Vault Updates"
                        description="When vaults are created, funded, or released"
                        enabled={data?.notifications?.vault_updates}
                        onToggle={() => updateSetting('notifications.vault_updates', !data?.notifications?.vault_updates)}
                        small
                      />
                      <ToggleSwitch
                        label="Payment Confirmations"
                        description="When payments are received or sent"
                        enabled={data?.notifications?.payments}
                        onToggle={() => updateSetting('notifications.payments', !data?.notifications?.payments)}
                        small
                      />
                      <ToggleSwitch
                        label="Security Alerts"
                        description="Important security notifications"
                        enabled={data?.notifications?.security}
                        onToggle={() => updateSetting('notifications.security', !data?.notifications?.security)}
                        small
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// Editable Field Component
const EditableField = ({ 
  label, value, path, onSave, isEditing, editValue, onStartEdit, onCancelEdit, onEditChange, loading, type = 'text', icon, placeholder, className = ''
}: any) => {
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-500">{label}</label>
      </div>
      
      {isEditing ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
            <input
              type={type}
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-rose-400`}
              placeholder={placeholder}
              autoFocus
            />
          </div>
          <button
            onClick={() => onSave(path, editValue)}
            disabled={loading}
            className="px-3 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50 flex items-center gap-1"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
          <button
            onClick={onCancelEdit}
            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 flex items-center gap-1"
          >
            <X size={14} />
            Cancel
          </button>
        </div>
      ) : (
        <div 
          onClick={onStartEdit}
          className="group relative p-2 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer hover:border-rose-200 hover:bg-rose-50/30 transition-all min-h-[40px] flex items-center"
        >
          {icon && <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
          <span className={`${icon ? 'pl-8' : 'pl-2'} text-sm text-gray-900`}>
            {value || <span className="text-gray-400">Not set</span>}
          </span>
          <Edit2 size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  );
};

// Editable Social Component
const EditableSocial = ({ 
  icon, value, path, onSave, isEditing, editValue, onStartEdit, onCancelEdit, onEditChange, loading, color, placeholder
}: any) => {
  return (
    <div>
      {isEditing ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className={color}>{icon}</span>
              <span className="text-xs text-gray-300">/</span>
            </div>
            <input
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              className="w-full pl-16 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400"
              placeholder={placeholder}
              autoFocus
            />
          </div>
          <button
            onClick={() => onSave(path, editValue)}
            disabled={loading}
            className="px-3 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
          </button>
          <button
            onClick={onCancelEdit}
            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div 
          onClick={onStartEdit}
          className="group relative p-2 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer hover:border-rose-200 hover:bg-rose-50/30 transition-all min-h-[40px] flex items-center"
        >
          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className={color}>{icon}</span>
            <span className="text-xs text-gray-300">/</span>
          </div>
          <span className="pl-16 text-sm text-gray-900">
            {value || <span className="text-gray-400">Not connected</span>}
          </span>
          <Edit2 size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  );
};

// Toggle Switch Component
const ToggleSwitch = ({ label, description, enabled, onToggle, loading, small }: any) => (
  <div className="flex items-start justify-between">
    <div className="flex-1 pr-4">
      <p className={`text-gray-900 ${small ? 'text-sm' : 'font-medium'}`}>{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
    </div>
    <button
      onClick={onToggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-rose-500' : 'bg-gray-200'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

// At icon component
const At = ({ size }: any) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4"/>
    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>
  </svg>
);