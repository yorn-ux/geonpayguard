'use client';
import { useState, useEffect } from 'react';
import {
  Building2, Users, Shield, Terminal,
  Lock, CheckCircle2,
  Globe, MapPin, Phone, Mail,
  FileText, Award, Edit2, Save,
  X, AlertCircle, 
  DollarSign, Calendar, Briefcase,
  Hash, MapPinned, 
  Wallet, Settings,
  Home,  LogOut
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import TeamPage from '@/components/business/team';
import ApiRegistry from '@/components/business/api';

export default function BusinessSettings({ data }: any) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('company');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [identity, setIdentity] = useState({ fullName: '', avatar_url: '', email: '', role: '' });
  
  // Edit states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isFreezing, setIsFreezing] = useState(false);

  const freezeAccount = async () => {
    setIsFreezing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_URL}/api/v1/auth/security-lock/self`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.removeItem('auth_token');
        localStorage.removeItem('geon_user');
        document.cookie = 'geon_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        window.location.href = `/auth/locked?token=${data.lock_token}`;
      } else {
        alert('Failed to freeze account. Please try again or contact support.');
      }
    } catch (error) {
      console.error('Freeze account error:', error);
      alert('An error occurred. Please contact support.');
    } finally {
      setIsFreezing(false);
    }
  };

  // Get user identity
  useEffect(() => {
    const storedUser = localStorage.getItem('geon_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setIdentity({ 
          fullName: parsed.full_name || parsed.fullName || 'Business User',
          avatar_url: parsed.avatar_url || '',
          email: parsed.email || '',
          role: parsed.role || 'business'
        });
      } catch (err) {
        console.error("Failed to parse user data:", err);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('geon_user');
    document.cookie = "geon_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    router.push('/auth/login');
  };

  // Backend Data Normalization with comprehensive defaults
  const company = data?.company || {};
  const profile = data?.profile || {};
  const metadata = data?.business_metadata || {};

  // Enhanced company data structure with editable state
  const [companyInfo, setCompanyInfo] = useState({
    // Basic Information
    company_name: company.company_name || profile.business_name || 'Not Set',
    registration_number: company.reg_number || metadata.registration_number || 'Pending Verification',
    tax_id: company.tax_id || metadata.tax_id || 'Not Provided',
    billing_address: company.billing_address || metadata.billing_address || 'No address on file.',
    
    // Contact Information
    business_email: metadata.business_email || profile.email || identity.email || 'Not Provided',
    business_phone: metadata.business_phone || '+254 XXX XXX XXX',
    website: metadata.website || 'https://',
    
    // Location Details
    country: metadata.country || 'Kenya',
    city: metadata.city || 'Nairobi',
    postal_code: metadata.postal_code || '',
    
    // Business Details
    business_type: metadata.business_type || 'Private Limited',
    industry: metadata.industry || 'Financial Services',
    year_established: metadata.year_established || '2024',
    employee_count: metadata.employee_count || '1-10',
    
    // Verification & Compliance
    verified: metadata.verified || false,
    kyc_status: data?.kyc?.kyc_status || 'PENDING',
    compliance_level: metadata.compliance_level || 'Standard',
    
    // Financial Settings
    monthly_budget_limit: company.monthly_budget_limit || 1000000,
    dual_approval_required: company.dual_approval_required ?? true,
    min_payout_threshold: data?.payments?.min_payout_threshold || 5000,
    payout_method: data?.payments?.payout_method || 'M-Pesa',
    
    // Team Information
    team_members: company.team_members || metadata.team_members || [],
    
    // Additional Metadata
    created_at: metadata.created_at || data?.created_at || new Date().toISOString(),
    updated_at: metadata.updated_at || data?.updated_at
  });

  const tabs = [
    { id: 'company', label: 'Company Profile', icon: Building2 },
    { id: 'team', label: 'Team Management', icon: Users },
    { id: 'governance', label: 'Security & Rules', icon: Shield },
    { id: 'api', label: 'Developer Access', icon: Terminal },
  ];

  // Handle inline edit
  const startEditing = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditingValue(currentValue.toString());
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditingValue('');
  };

  const saveEdit = (field: string) => {
    setCompanyInfo({
      ...companyInfo,
      [field]: field.includes('limit') || field.includes('threshold') || field.includes('budget')
        ? parseFloat(editingValue) || 0
        : editingValue
    });
    setEditingField(null);
    setSuccessMessage('Field updated locally. Click Save Changes to persist.');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Save all changes
  const saveAllChanges = async () => {
    setSaving(true);
    setErrorMessage('');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccessMessage('All changes saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Industry options
  const industryOptions = [
    'Financial Services', 'Technology', 'Healthcare', 'Education',
    'Retail', 'Manufacturing', 'Real Estate', 'Transportation',
    'Hospitality', 'Agriculture', 'Energy', 'Media', 'Consulting'
  ];

  // Country options
  const countryOptions = [
    'Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Ethiopia',
    'Nigeria', 'South Africa', 'Ghana', 'Egypt', 'Other'
  ];

  // Payout method options
  const payoutMethodOptions = [
    'M-Pesa', 'Bank Transfer', 'Airtel Money', 'Tigo Pesa',
    'Credit Card', 'Debit Card', 'Cryptocurrency'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Matching Dashboard Style */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo and back button */}
          <div className="flex items-center gap-4">
            <Link 
              href="/business/dashboard" 
              className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <Home size={18} />
              <span className="text-sm hidden sm:inline">Dashboard</span>
            </Link>
            
            <div className="h-4 w-px bg-gray-200 hidden sm:block" />
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center text-white">
                <Settings size={16} />
              </div>
              <h1 className="text-base font-semibold text-gray-900">Settings</h1>
            </div>
          </div>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{identity.fullName}</p>
                <p className="text-xs text-gray-500">{identity.email}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-rose-500 flex items-center justify-center text-white font-medium ring-2 ring-white">
                {identity.fullName.charAt(0)}
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Users size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-100 shadow-lg p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white font-medium">
                  {identity.fullName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{identity.fullName}</p>
                  <p className="text-xs text-gray-500">{identity.email}</p>
                </div>
              </div>
              <Link
                href="/business/dashboard"
                className="flex items-center gap-3 p-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home size={18} />
                <span className="text-sm">Dashboard</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Desktop Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="hidden md:flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-100 w-fit shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-rose-500 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mobile Tab Selector */}
        <div className="md:hidden mb-6">
          <label className="text-xs text-gray-500 mb-2 block">Section</label>
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 outline-none focus:border-rose-400"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
        </div>

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

        {/* Main Content */}
        <div className="animate-in fade-in duration-500">
          {/* COMPANY TAB */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              {/* Entity Header */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                  <Building2 size={18} className="text-rose-500" />
                  <h2 className="text-sm font-medium text-gray-700">Company Information</h2>
                </div>
                
                <EditableHero
                  companyName={companyInfo.company_name}
                  businessType={companyInfo.business_type}
                  industry={companyInfo.industry}
                  onEditCompanyName={() => startEditing('company_name', companyInfo.company_name)}
                  onEditBusinessType={() => startEditing('business_type', companyInfo.business_type)}
                  onEditIndustry={() => startEditing('industry', companyInfo.industry)}
                  isEditing={editingField}
                  editValue={editingValue}
                  onEditChange={setEditingValue}
                  onSave={() => saveEdit(editingField!)}
                  onCancel={cancelEditing}
                />
              </div>

              {/* Registration Details */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-xs font-medium text-gray-500 mb-4">Registration Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField
                    icon={<FileText size={14} />}
                    label="Registration Number"
                    value={companyInfo.registration_number}
                    onEdit={() => startEditing('registration_number', companyInfo.registration_number)}
                    isEditing={editingField === 'registration_number'}
                    editValue={editingValue}
                    onEditChange={setEditingValue}
                    onSave={() => saveEdit('registration_number')}
                    onCancel={cancelEditing}
                  />
                  
                  <EditableField
                    icon={<Hash size={14} />}
                    label="Tax ID / VAT"
                    value={companyInfo.tax_id}
                    onEdit={() => startEditing('tax_id', companyInfo.tax_id)}
                    isEditing={editingField === 'tax_id'}
                    editValue={editingValue}
                    onEditChange={setEditingValue}
                    onSave={() => saveEdit('tax_id')}
                    onCancel={cancelEditing}
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-xs font-medium text-gray-500 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField
                    icon={<Mail size={14} />}
                    label="Business Email"
                    value={companyInfo.business_email}
                    onEdit={() => startEditing('business_email', companyInfo.business_email)}
                    isEditing={editingField === 'business_email'}
                    editValue={editingValue}
                    onEditChange={setEditingValue}
                    onSave={() => saveEdit('business_email')}
                    onCancel={cancelEditing}
                    type="email"
                  />
                  
                  <EditableField
                    icon={<Phone size={14} />}
                    label="Business Phone"
                    value={companyInfo.business_phone}
                    onEdit={() => startEditing('business_phone', companyInfo.business_phone)}
                    isEditing={editingField === 'business_phone'}
                    editValue={editingValue}
                    onEditChange={setEditingValue}
                    onSave={() => saveEdit('business_phone')}
                    onCancel={cancelEditing}
                    type="tel"
                  />
                </div>

                {/* Website */}
                <div className="mt-4">
                  <EditableField
                    icon={<Globe size={14} />}
                    label="Website"
                    value={companyInfo.website}
                    onEdit={() => startEditing('website', companyInfo.website)}
                    isEditing={editingField === 'website'}
                    editValue={editingValue}
                    onEditChange={setEditingValue}
                    onSave={() => saveEdit('website')}
                    onCancel={cancelEditing}
                    type="url"
                  />
                </div>
              </div>

              {/* Address & Location */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-xs font-medium text-gray-500 mb-4">Headquarters</h3>
                
                <EditableTextArea
                  icon={<MapPin size={14} />}
                  label="Billing Address"
                  value={companyInfo.billing_address}
                  onEdit={() => startEditing('billing_address', companyInfo.billing_address)}
                  isEditing={editingField === 'billing_address'}
                  editValue={editingValue}
                  onEditChange={setEditingValue}
                  onSave={() => saveEdit('billing_address')}
                  onCancel={cancelEditing}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <EditableSelect
                    icon={<Globe size={14} />}
                    label="Country"
                    value={companyInfo.country}
                    options={countryOptions}
                    onEdit={() => startEditing('country', companyInfo.country)}
                    isEditing={editingField === 'country'}
                    editValue={editingValue}
                    onEditChange={setEditingValue}
                    onSave={() => saveEdit('country')}
                    onCancel={cancelEditing}
                  />
                  
                  <EditableField
                    icon={<MapPinned size={14} />}
                    label="City"
                    value={companyInfo.city}
                    onEdit={() => startEditing('city', companyInfo.city)}
                    isEditing={editingField === 'city'}
                    editValue={editingValue}
                    onEditChange={setEditingValue}
                    onSave={() => saveEdit('city')}
                    onCancel={cancelEditing}
                  />
                  
                  <EditableField
                    icon={<Hash size={14} />}
                    label="Postal Code"
                    value={companyInfo.postal_code || '—'}
                    onEdit={() => startEditing('postal_code', companyInfo.postal_code)}
                    isEditing={editingField === 'postal_code'}
                    editValue={editingValue}
                    onEditChange={setEditingValue}
                    onSave={() => saveEdit('postal_code')}
                    onCancel={cancelEditing}
                  />
                </div>
              </div>

              {/* Business Details */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-xs font-medium text-gray-500 mb-4">Business Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <EditableSelect
                    icon={<Briefcase size={14} />}
                    label="Industry"
                    value={companyInfo.industry}
                    options={industryOptions}
                    onEdit={() => startEditing('industry', companyInfo.industry)}
                    isEditing={editingField === 'industry'}
                    editValue={editingValue}
                    onEditChange={setEditingValue}
                    onSave={() => saveEdit('industry')}
                    onCancel={cancelEditing}
                  />
                  
                  <EditableField
                    icon={<Calendar size={14} />}
                    label="Established"
                    value={companyInfo.year_established}
                    onEdit={() => startEditing('year_established', companyInfo.year_established)}
                    isEditing={editingField === 'year_established'}
                    editValue={editingValue}
                    onEditChange={setEditingValue}
                    onSave={() => saveEdit('year_established')}
                    onCancel={cancelEditing}
                    type="number"
                    min="1900"
                    max="2024"
                  />
                  
                  <EditableSelect
                    icon={<Users size={14} />}
                    label="Employees"
                    value={companyInfo.employee_count}
                    options={['1-10', '11-50', '51-200', '201-500', '500+']}
                    onEdit={() => startEditing('employee_count', companyInfo.employee_count)}
                    isEditing={editingField === 'employee_count'}
                    editValue={editingValue}
                    onEditChange={setEditingValue}
                    onSave={() => saveEdit('employee_count')}
                    onCancel={cancelEditing}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TEAM TAB */}
          {activeTab === 'team' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <TeamPage />
            </div>
          )}

          {/* GOVERNANCE TAB */}
          {activeTab === 'governance' && (
            <div className="space-y-6">
              {/* Monthly Budget Card */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet size={18} className="text-rose-400" />
                  <h3 className="text-sm font-medium text-gray-300">Financial Controls</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Monthly Budget Ceiling</p>
                    {editingField === 'monthly_budget_limit' ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <div className="flex items-center bg-white/10 rounded-lg border border-white/20">
                          <span className="px-3 text-sm text-gray-300">KES</span>
                          <input
                            type="number"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="bg-transparent border-l border-white/20 px-3 py-2 text-xl font-semibold w-32 text-white outline-none"
                            autoFocus
                            min="0"
                            step="10000"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit('monthly_budget_limit')}
                            className="p-2 bg-rose-500 rounded-lg hover:bg-rose-600"
                          >
                            <Save size={14} />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-2 bg-white/10 rounded-lg hover:bg-white/20"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-semibold">
                          KES {companyInfo.monthly_budget_limit.toLocaleString()}
                        </span>
                        <button
                          onClick={() => startEditing('monthly_budget_limit', companyInfo.monthly_budget_limit)}
                          className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 mb-1">Min Payout Threshold</p>
                    {editingField === 'min_payout_threshold' ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <div className="flex items-center bg-white/10 rounded-lg border border-white/20">
                          <span className="px-3 text-sm text-gray-300">KES</span>
                          <input
                            type="number"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="bg-transparent border-l border-white/20 px-3 py-2 text-base w-28 text-white outline-none"
                            autoFocus
                            min="0"
                            step="1000"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit('min_payout_threshold')}
                            className="p-1.5 bg-rose-500 rounded-lg hover:bg-rose-600"
                          >
                            <Save size={12} />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">
                          KES {companyInfo.min_payout_threshold.toLocaleString()}
                        </span>
                        <button
                          onClick={() => startEditing('min_payout_threshold', companyInfo.min_payout_threshold)}
                          className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dual Approval Toggle */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Lock size={18} className="text-rose-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Dual Approval Required</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Require two administrators to authorize high-value payouts
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCompanyInfo({
                      ...companyInfo,
                      dual_approval_required: !companyInfo.dual_approval_required
                    })}
                    className={`relative w-12 h-6 rounded-full p-1 transition-all duration-300 ${
                      companyInfo.dual_approval_required ? 'bg-rose-500' : 'bg-gray-200'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                      companyInfo.dual_approval_required ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Payout Method */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <EditableSelect
                  icon={<DollarSign size={16} />}
                  label="Default Payout Method"
                  value={companyInfo.payout_method}
                  options={payoutMethodOptions}
                  onEdit={() => startEditing('payout_method', companyInfo.payout_method)}
                  isEditing={editingField === 'payout_method'}
                  editValue={editingValue}
                  onEditChange={setEditingValue}
                  onSave={() => saveEdit('payout_method')}
                  onCancel={cancelEditing}
                />
              </div>

              {/* Freeze Account - Danger Zone */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-5 mt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Lock className="text-red-600" size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-900">Freeze Account</h3>
                    <p className="text-xs text-red-700 mt-1">
                      Temporarily lock your account. You can unlock it by contacting support.
                    </p>
                    <button 
                      onClick={() => {
                        if (confirm('Are you sure you want to freeze your account? You will be logged out and need to contact support to unlock it.')) {
                          freezeAccount();
                        }
                      }}
                      className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Freeze My Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API TAB */}
          {activeTab === 'api' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <ApiRegistry />
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-8">
          <button
            onClick={saveAllChanges}
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save All Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Editable Field Component
const EditableField = ({ 
  icon, label, value, onEdit, isEditing, editValue, onEditChange, onSave, onCancel, type = 'text', min, max, step 
}: any) => (
  <div className="space-y-1.5">
    <label className="text-xs text-gray-500 flex items-center gap-1">
      {icon} {label}
    </label>
    {isEditing ? (
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type={type}
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-rose-400"
          autoFocus
          min={min}
          max={max}
          step={step}
        />
        <div className="flex gap-2">
          <button
            onClick={onSave}
            className="px-3 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm flex items-center gap-2"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm flex items-center gap-2"
          >
            <X size={14} />
            Cancel
          </button>
        </div>
      </div>
    ) : (
      <div 
        onClick={onEdit}
        className="group p-3 bg-gray-50 rounded-lg border border-gray-100 text-gray-900 hover:border-rose-200 hover:bg-rose-50/30 transition-all cursor-pointer flex items-center justify-between"
      >
        <span className="text-sm">{value}</span>
        <Edit2 size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    )}
  </div>
);

// Editable TextArea Component
const EditableTextArea = ({ icon, label, value, onEdit, isEditing, editValue, onEditChange, onSave, onCancel }: any) => (
  <div className="space-y-1.5">
    <label className="text-xs text-gray-500 flex items-center gap-1">
      {icon} {label}
    </label>
    {isEditing ? (
      <div className="space-y-2">
        <textarea
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-rose-400 min-h-[80px]"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={onSave}
            className="px-3 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm flex items-center gap-2"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm flex items-center gap-2"
          >
            <X size={14} />
            Cancel
          </button>
        </div>
      </div>
    ) : (
      <div 
        onClick={onEdit}
        className="group p-3 bg-gray-50 rounded-lg border border-gray-100 text-gray-900 hover:border-rose-200 hover:bg-rose-50/30 transition-all cursor-pointer"
      >
        <div className="flex items-start justify-between">
          <span className="text-sm whitespace-pre-wrap">{value}</span>
          <Edit2 size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0" />
        </div>
      </div>
    )}
  </div>
);

// Editable Select Component
const EditableSelect = ({ icon, label, value, options, onEdit, isEditing, editValue, onEditChange, onSave, onCancel }: any) => (
  <div className="space-y-1.5">
    <label className="text-xs text-gray-500 flex items-center gap-1">
      {icon} {label}
    </label>
    {isEditing ? (
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-rose-400"
          autoFocus
        >
          {options.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={onSave}
            className="px-3 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm flex items-center gap-2"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm flex items-center gap-2"
          >
            <X size={14} />
            Cancel
          </button>
        </div>
      </div>
    ) : (
      <div 
        onClick={onEdit}
        className="group p-3 bg-gray-50 rounded-lg border border-gray-100 text-gray-900 hover:border-rose-200 hover:bg-rose-50/30 transition-all cursor-pointer flex items-center justify-between"
      >
        <span className="text-sm">{value}</span>
        <Edit2 size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    )}
  </div>
);

// Editable Hero Component
const EditableHero = ({ 
  companyName, businessType, industry, 
  onEditCompanyName, onEditBusinessType, onEditIndustry,
  isEditing, editValue, onEditChange, onSave, onCancel 
}: any) => (
  <div>
    <div className="flex items-center gap-2 mb-3">
      {isEditing === 'company_name' ? (
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xl font-semibold text-gray-900 outline-none focus:border-rose-400"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={onSave}
              className="px-3 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 flex items-center gap-2"
            >
              <Save size={16} />
              Save
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 group w-full">
          <h2 className="text-xl font-semibold text-gray-900">{companyName}</h2>
          <button
            onClick={onEditCompanyName}
            className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Edit2 size={14} />
          </button>
        </div>
      )}
    </div>

    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm text-gray-500">
      <div className="flex items-center gap-1">
        <Award size={14} className="text-gray-400" />
        {isEditing === 'business_type' ? (
          <span className="flex items-center gap-1">
            <input
              type="text"
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm w-32 text-gray-900 outline-none"
              onBlur={onSave}
              onKeyPress={(e) => e.key === 'Enter' && onSave()}
              autoFocus
            />
            <button onClick={onSave} className="p-1 text-rose-500 hover:text-rose-600">
              <CheckCircle2 size={14} />
            </button>
            <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-500">
              <X size={14} />
            </button>
          </span>
        ) : (
          <span onClick={onEditBusinessType} className="cursor-pointer hover:text-rose-600 flex items-center gap-1">
            {businessType}
            <Edit2 size={12} className="opacity-0 group-hover:opacity-100" />
          </span>
        )}
      </div>
      <span className="hidden sm:inline text-gray-300">•</span>
      <div className="flex items-center gap-1">
        <Briefcase size={14} className="text-gray-400" />
        {isEditing === 'industry' ? (
          <span className="flex items-center gap-1">
            <input
              type="text"
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm w-32 text-gray-900 outline-none"
              onBlur={onSave}
              onKeyPress={(e) => e.key === 'Enter' && onSave()}
              autoFocus
            />
            <button onClick={onSave} className="p-1 text-rose-500 hover:text-rose-600">
              <CheckCircle2 size={14} />
            </button>
            <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-500">
              <X size={14} />
            </button>
          </span>
        ) : (
          <span onClick={onEditIndustry} className="cursor-pointer hover:text-rose-600 flex items-center gap-1">
            {industry}
            <Edit2 size={12} className="opacity-0 group-hover:opacity-100" />
          </span>
        )}
      </div>
    </div>
  </div>
);