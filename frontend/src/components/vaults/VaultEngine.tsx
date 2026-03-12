'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Shield, Zap, ArrowLeft, Loader2, ArrowUpRight, Wallet, 
  Clock, AlertTriangle, ChevronRight, Activity, Plus, Trash2, CheckCircle2,
  DollarSign, AlertCircle, FileText, RefreshCw, CheckCircle,
  Upload, Image, Music,  Copy,
   Settings, 
  X,
  Hash
} from 'lucide-react';

// Types
interface Milestone {
  id: string;
  title: string;
  amount: number;
  deadline: string;
  description: string;
  deliverables?: string[];
  status?: 'pending' | 'completed' | 'disputed' | 'approved';
  approvedBy?: 'creator' | 'business' | 'both';
  completedAt?: string;
  feedback?: string;
}

interface VaultConfig {
  // Basic Info
  title: string;
  description: string;
  vaultType: 'fixed' | 'milestone' | 'hybrid' | 'subscription';
  
  // Counterparty
  counterpartyHandle: string;
  counterpartyAddress?: string;
  counterpartyEmail?: string;
  counterpartyName?: string;
  
  // Platform
  socialPlatform: 'instagram' | 'tiktok' | 'twitter' | 'youtube' | 'linkedin' | 'twitch';
  
  // Financial
  amount: number;
  currency: 'KES' | 'USD' | 'EUR' | 'GBP';
  fundingParty: 'creator' | 'business' | 'split';
  splitRatio?: number; // For split funding
  
  // Release Rules
  releaseRule: 'multi-sig' | 'auto' | 'oracle' | 'hybrid';
  disputeWindow: number;
  autoReleaseDays?: number;
  requiresApproval: boolean;
  
  // Milestones
  milestones: Milestone[];
  
  // Legal
  agreed: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  
  // Tags & Visibility
  tags: string[];
  visibility: 'public' | 'private' | 'unlisted' | 'invite-only';
  
  // Expiry
  expiryDate?: string;
  
  // Additional Features
  allowNegotiation: boolean;
  negotiationDeadline?: string;
  allowPartialRelease: boolean;
  requireBid: boolean;
  bidDeadline?: string;
  
  // Attachments
  attachments: {
    id: string;
    name: string;
    url: string;
    type: 'image' | 'pdf' | 'video' | 'audio';
    uploadedAt: string;
  }[];
  
  // Comments/Notes
  notes?: string;
  
  // Smart Contract Options
  contractAddress?: string;
  chainId?: number;
  gasPreference?: 'standard' | 'fast' | 'instant';
}

interface ValidationErrors {
  [key: string]: string;
}

interface VaultEngineProps {
  vaultId?: string;
  userRole: 'influencer' | 'business' | 'admin';
  onStateChange?: () => void;
  onDeploy?: (vaultData: any) => void;
  initialData?: Partial<VaultConfig>;
  templateId?: string; // For using templates
}

const PLATFORM_FEE = 0.05; // 5%
const MINIMUM_AMOUNT = 1000; // KES
const MAX_MILESTONES = 20;
const DISPUTE_WINDOW_OPTIONS = [1, 3, 7, 14, 30, 60];
const SUPPORTED_CURRENCIES = ['KES', 'USD', 'EUR', 'GBP'];

export default function VaultEngine({ 
  vaultId, 
  userRole, 
  onStateChange, 
  onDeploy,
  initialData,
  templateId 
}: VaultEngineProps) {
  // State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string>('');
  const [deploySuccess, setDeploySuccess] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [] = useState(false);
  const [counterpartyInfo, setCounterpartyInfo] = useState<any>(null);
  const [] = useState(false);
  
  // 🏗️ CONSOLIDATED STATE WITH INITIAL DATA
  const [formData, setFormData] = useState<VaultConfig>({
    // Basic Info
    title: '',
    description: '',
    vaultType: 'fixed',
    
    // Counterparty
    counterpartyHandle: '',
    counterpartyAddress: '',
    counterpartyEmail: '',
    counterpartyName: '',
    
    // Platform
    socialPlatform: 'instagram',
    
    // Financial
    amount: 0,
    currency: 'KES',
    fundingParty: userRole === 'business' ? 'business' : 'creator',
    splitRatio: 50,
    
    // Release Rules
    releaseRule: 'multi-sig',
    disputeWindow: 7,
    autoReleaseDays: 3,
    requiresApproval: true,
    
    // Milestones
    milestones: [],
    
    // Legal
    agreed: false,
    termsAccepted: false,
    privacyAccepted: false,
    
    // Tags & Visibility
    tags: [],
    visibility: 'public',
    
    // Expiry
    expiryDate: '',
    
    // Additional Features
    allowNegotiation: false,
    allowPartialRelease: false,
    requireBid: false,
    
    // Attachments
    attachments: [],
    
    // Notes
    notes: '',
    
    // Smart Contract
    gasPreference: 'standard',
    
    ...initialData
  });

  // --- AUTH & WALLET LOGIC ---
  const getAuthToken = useCallback(() => {
    if (typeof document === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }, []);

  const getWalletAddress = useCallback(() => {
    if (typeof document === 'undefined') return null;
    return localStorage.getItem('wallet_address');
  }, []);

  const fetchBalance = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/v1/wallet/balance`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) throw new Error('Failed to fetch balance');
      
      const data = await res.json();
      setUserBalance(data.available_balance || 0);
    } catch (err) {
      console.error("Balance Sync Error", err);
      if (process.env.NODE_ENV === 'development') {
        setUserBalance(50000);
      }
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  const fetchCounterpartyInfo = useCallback(async (handle: string) => {
    if (!handle) return;
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/v1/users/lookup/${handle}`);
      
      if (res.ok) {
        const data = await res.json();
        setCounterpartyInfo(data);
        setFormData(prev => ({
          ...prev,
          counterpartyAddress: data.wallet_address,
          counterpartyEmail: data.email,
          counterpartyName: data.full_name
        }));
      }
    } catch (err) {
      console.error("Counterparty lookup failed:", err);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Debounced counterparty lookup
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.counterpartyHandle && formData.counterpartyHandle.length > 2) {
        fetchCounterpartyInfo(formData.counterpartyHandle);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.counterpartyHandle, fetchCounterpartyInfo]);

  // Fetch vault data if editing
  useEffect(() => {
    if (vaultId) {
      fetchVaultData();
    } else if (templateId) {
      loadTemplate(templateId);
    }
  }, [vaultId, templateId]);

  const fetchVaultData = async () => {
    const token = getAuthToken();
    if (!token || !vaultId) return;

    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/v1/vaults/${vaultId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to fetch vault');
      
      const data = await res.json();
      setFormData(prev => ({ ...prev, ...data }));
    } catch (err) {
      console.error("Vault Fetch Error", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async (templateId: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/v1/vaults/templates/${templateId}`);
      
      if (res.ok) {
        const template = await res.json();
        setFormData(prev => ({ ...prev, ...template }));
      }
    } catch (err) {
      console.error("Template load failed:", err);
    }
  };

  // 🧮 FINANCIAL CALCULATIONS
  const platformFee = useMemo(() => (formData?.amount || 0) * PLATFORM_FEE, [formData?.amount]);
  const netPayout = useMemo(() => (formData?.amount || 0) - platformFee, [formData?.amount, platformFee]);
  
  const totalMilestoneSum = useMemo(() => 
    (formData?.milestones || []).reduce((sum, m) => sum + Number(m.amount || 0), 0), 
    [formData?.milestones]
  );
  
  const creatorContribution = useMemo(() => {
    if (formData.fundingParty === 'creator') return formData.amount || 0;
    if (formData.fundingParty === 'split') return ((formData.amount || 0) * (formData.splitRatio || 50)) / 100;
    return 0;
  }, [formData.fundingParty, formData.amount, formData.splitRatio]);

  const businessContribution = useMemo(() => {
    if (formData.fundingParty === 'business') return formData.amount || 0;
    if (formData.fundingParty === 'split') return ((formData.amount || 0) * (100 - (formData.splitRatio || 50))) / 100;
    return 0;
  }, [formData.fundingParty, formData.amount, formData.splitRatio]);

  // Business Rules
  const isInsufficientFunds = useMemo(() => 
    (formData.fundingParty === 'creator' || formData.fundingParty === 'split') && 
    userBalance < creatorContribution,
    [formData.fundingParty, userBalance, creatorContribution]
  );

  const isBudgetBalanced = useMemo(() => 
    formData?.vaultType !== 'milestone' || 
    (Math.abs(totalMilestoneSum - (formData?.amount || 0)) < 0.01 && (formData?.amount || 0) > 0),
    [formData?.vaultType, totalMilestoneSum, formData?.amount]
  );

  const completedMilestones = useMemo(() => 
    formData.milestones.filter(m => m.status === 'completed' || m.status === 'approved').length,
    [formData.milestones]
  );

  const progressPercentage = useMemo(() => 
    formData.milestones.length > 0 
      ? (completedMilestones / formData.milestones.length) * 100 
      : 0,
    [completedMilestones, formData.milestones.length]
  );

  // Validation
  const validateStep = useCallback((stepNumber: number): boolean => {
    const errors: ValidationErrors = {};

    switch (stepNumber) {
      case 1: // Basic Details
        if (!formData?.title?.trim()) errors.title = 'Title is required';
        else if ((formData?.title?.length || 0) < 5) errors.title = 'Title must be at least 5 characters';
        
        if (!formData?.description?.trim()) errors.description = 'Description is required';
        else if ((formData?.description?.length || 0) < 20) errors.description = 'Description must be at least 20 characters';
        
        if (!formData?.counterpartyHandle?.trim()) errors.counterpartyHandle = 'Counterparty handle is required';
        break;

      case 2: // Budget
        if (!formData?.amount || formData.amount < MINIMUM_AMOUNT) {
          errors.amount = `Minimum amount is ${formData.currency} ${MINIMUM_AMOUNT.toLocaleString()}`;
        }
        if (isInsufficientFunds) {
          errors.funds = 'Insufficient balance for lock-up';
        }
        break;

      case 3: // Milestones
        if (formData?.vaultType === 'milestone') {
          const milestones = formData?.milestones || [];
          if (milestones.length === 0) {
            errors.milestones = 'At least one milestone is required';
          } else {
            milestones.forEach((milestone, index) => {
              if (!milestone?.title) errors[`milestone_${index}_title`] = 'Title required';
              if (!milestone?.amount || milestone.amount <= 0) {
                errors[`milestone_${index}_amount`] = 'Valid amount required';
              }
              if (!milestone?.deadline) errors[`milestone_${index}_deadline`] = 'Deadline required';
            });
            
            if (!isBudgetBalanced) {
              errors.budget = 'Milestone totals must equal total budget';
            }
          }
        }
        break;

      case 4: // Legal & Review
        if (!formData?.agreed) errors.agreed = 'You must agree to the terms';
        if (!formData?.termsAccepted) errors.termsAccepted = 'Terms must be accepted';
        if (!formData?.privacyAccepted) errors.privacyAccepted = 'Privacy policy must be accepted';
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, isInsufficientFunds, isBudgetBalanced]);

  const handleStepChange = (newStep: number) => {
    if (newStep > step) {
      if (!validateStep(step)) return;
    }
    setStep(newStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- HANDLERS ---
  const addMilestone = () => {
    const currentMilestones = formData?.milestones || [];
    if (currentMilestones.length >= MAX_MILESTONES) {
      alert(`Maximum ${MAX_MILESTONES} milestones allowed`);
      return;
    }

    setFormData({
      ...formData,
      milestones: [...currentMilestones, { 
        id: crypto.randomUUID?.() || Date.now().toString(),
        title: '', 
        amount: 0, 
        deadline: '', 
        description: '',
        deliverables: [],
        status: 'pending'
      }]
    });
  };

  const updateMilestone = (id: string, field: keyof Milestone, value: any) => {
    const currentMilestones = formData?.milestones || [];
    setFormData({
      ...formData,
      milestones: currentMilestones.map(m => 
        m.id === id ? { ...m, [field]: value } : m
      )
    });
  };

  const removeMilestone = (id: string) => {
    const currentMilestones = formData?.milestones || [];
    setFormData({
      ...formData,
      milestones: currentMilestones.filter(m => m.id !== id)
    });
  };

  const handleInputChange = (field: keyof VaultConfig, value: any) => {
    setFormData(prev => ({ ...(prev || {}), [field]: value }));
    setTouched(prev => new Set(prev).add(field));
    
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    
    try {
      const token = getAuthToken();
      const formData = new FormData();
      
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/v1/attachments/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const uploadedFiles = await res.json();
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, ...uploadedFiles]
        }));
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeAttachment = (id: string) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(a => a.id !== id)
    }));
  };

  const handleDeploy = async () => {
    if (!validateStep(4)) return;

    const token = getAuthToken();
    const walletAddress = getWalletAddress();
    
    if (!token) {
      alert("Session expired. Please login again.");
      return;
    }

    if (!walletAddress) {
      alert("Wallet not connected. Please connect your wallet.");
      return;
    }

    if (isInsufficientFunds) {
      alert(`Insufficient balance. Required: ${formData.currency} ${creatorContribution.toLocaleString()}`);
      return;
    }

    setSubmitting(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const payload = {
        ...formData,
        wallet_address: walletAddress,
        platform_fee: platformFee,
        net_payout: netPayout,
        creator_contribution: creatorContribution,
        business_contribution: businessContribution,
        transaction_type: 'vault_lock',
        timestamp: new Date().toISOString(),
        version: '2.0',
        created_by: userRole,
        created_at: new Date().toISOString()
      };

      const response = await fetch(`${API_URL}/api/v1/vaults/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Deployment Failed');
      }

      const result = await response.json();
      setTransactionHash(result.transaction_hash);
      setDeploySuccess(true);
      
      if (onDeploy) onDeploy(result);
      if (onStateChange) onStateChange();
      
    } catch (err: any) {
      console.error("Deployment Error:", err);
      alert(err.message || "Smart contract deployment failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = formData.currency) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast notification here
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="animate-spin text-rose-500 mx-auto mb-4" size={40} />
          <p className="text-sm text-gray-400">Loading vault data...</p>
        </div>
      </div>
    );
  }

  if (deploySuccess) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-6">
        <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-emerald-600" size={28} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Vault Deployed Successfully!</h2>
          <p className="text-sm text-gray-500 mb-4">
            Transaction hash: <span className="font-mono text-xs bg-gray-50 p-1 rounded">{transactionHash}</span>
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => copyToClipboard(transactionHash)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
            >
              <Copy size={14} /> Copy Hash
            </button>
            <button
              onClick={() => window.location.href = `/vaults/${vaultId || transactionHash}`}
              className="px-6 py-2.5 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-all"
            >
              View Vault Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      
      {/* Wallet Tracker */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
            <Activity size={16} className="text-gray-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Network Status</p>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-medium text-emerald-600">GeonPayGuard Mainnet Live</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-lg w-full sm:w-auto">
          <Wallet size={14} className="text-rose-400" />
          <div className="flex-1 sm:text-right">
            <p className="text-[10px] text-gray-400">Available</p>
            <p className="text-sm font-semibold text-white flex items-center gap-1">
              {formatCurrency(userBalance)}
              <button 
                onClick={fetchBalance}
                className="ml-2 p-1 hover:bg-gray-800 rounded transition-colors"
                title="Refresh balance"
              >
                <RefreshCw size={10} className="text-gray-500" />
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8 px-2 relative">
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-100 -z-10" />
        <div 
          className="absolute top-4 left-0 h-0.5 bg-rose-500 transition-all duration-500 -z-10"
          style={{ width: `${((step - 1) / 4) * 100}%` }}
        />
        
        {[
          { label: 'Details', icon: FileText },
          { label: 'Budget', icon: DollarSign },
          { label: 'Milestones', icon: Clock },
          { label: 'Review', icon: Shield }
        ].map((item, i) => {
          const StepIcon = item.icon;
          const isActive = step >= i + 1;
          const isCompleted = step > i + 1;
          
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1 relative">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all cursor-pointer
                  ${isActive 
                    ? 'bg-rose-500 border-rose-500 text-white' 
                    : 'bg-white border-gray-200 text-gray-300 hover:border-rose-300'
                  }`}
                onClick={() => handleStepChange(i + 1)}
              >
                {isCompleted ? <CheckCircle2 size={14} /> : <StepIcon size={14} />}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-gray-900' : 'text-gray-300'}`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        
        {/* Step 1: Details */}
        {step === 1 && (
          <div className="p-5 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Vault Details</h2>
            <p className="text-sm text-gray-500 mb-5">Basic information about your vault</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Title <span className="text-rose-500">*</span></label>
                <input 
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg text-sm outline-none transition-all
                    ${touched.has('title') && validationErrors.title 
                      ? 'border-rose-200 bg-rose-50' 
                      : 'border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100'
                    }`}
                  placeholder="e.g. Summer Campaign Collaboration"
                  value={formData?.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  onBlur={() => setTouched(prev => new Set(prev).add('title'))}
                  maxLength={100}
                />
                {validationErrors.title && (
                  <p className="text-rose-500 text-xs flex items-center gap-1 mt-1">
                    <AlertCircle size={12} /> {validationErrors.title}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">Description <span className="text-rose-500">*</span></label>
                <textarea
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg text-sm outline-none min-h-[100px] transition-all
                    ${touched.has('description') && validationErrors.description 
                      ? 'border-rose-200 bg-rose-50' 
                      : 'border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100'
                    }`}
                  placeholder="Describe the scope of work, deliverables, and any important details..."
                  value={formData?.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  onBlur={() => setTouched(prev => new Set(prev).add('description'))}
                  maxLength={1000}
                />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-gray-400">
                    {formData?.description?.length || 0}/1000
                  </p>
                  {validationErrors.description && (
                    <p className="text-rose-500 text-xs flex items-center gap-1">
                      <AlertCircle size={10} /> {validationErrors.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Platform</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                    value={formData?.socialPlatform || 'instagram'}
                    onChange={(e) => handleInputChange('socialPlatform', e.target.value)}
                  >
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="twitter">Twitter/X</option>
                    <option value="youtube">YouTube</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="twitch">Twitch</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Counterparty Handle <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                    <input 
                      className={`w-full pl-7 pr-4 py-2.5 bg-gray-50 border rounded-lg text-sm outline-none transition-all
                        ${touched.has('counterpartyHandle') && validationErrors.counterpartyHandle 
                          ? 'border-rose-200 bg-rose-50' 
                          : 'border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100'
                        }`}
                      placeholder="username"
                      value={formData?.counterpartyHandle || ''}
                      onChange={(e) => handleInputChange('counterpartyHandle', e.target.value.replace('@', ''))}
                      onBlur={() => setTouched(prev => new Set(prev).add('counterpartyHandle'))}
                    />
                  </div>
                  {counterpartyInfo && (
                    <p className="text-emerald-600 text-xs mt-1 flex items-center gap-1">
                      <CheckCircle2 size={10} /> {counterpartyInfo.full_name} • Verified
                    </p>
                  )}
                  {validationErrors.counterpartyHandle && (
                    <p className="text-rose-500 text-xs flex items-center gap-1 mt-1">
                      <AlertCircle size={12} /> {validationErrors.counterpartyHandle}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">Vault Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => handleInputChange('vaultType', 'fixed')}
                    className={`p-3 rounded-lg border text-left transition-all
                      ${formData?.vaultType === 'fixed' 
                        ? 'border-rose-500 bg-rose-50' 
                        : 'border-gray-200 hover:border-rose-200'
                      }`}
                  >
                    <p className="text-sm font-medium mb-1">Fixed Vault</p>
                    <p className="text-xs text-gray-500">Single payment</p>
                  </button>
                  
                  <button
                    onClick={() => handleInputChange('vaultType', 'milestone')}
                    className={`p-3 rounded-lg border text-left transition-all
                      ${formData?.vaultType === 'milestone' 
                        ? 'border-rose-500 bg-rose-50' 
                        : 'border-gray-200 hover:border-rose-200'
                      }`}
                  >
                    <p className="text-sm font-medium mb-1">Milestone Vault</p>
                    <p className="text-xs text-gray-500">Phased payments</p>
                  </button>

                  <button
                    onClick={() => handleInputChange('vaultType', 'subscription')}
                    className={`p-3 rounded-lg border text-left transition-all
                      ${formData?.vaultType === 'subscription' 
                        ? 'border-rose-500 bg-rose-50' 
                        : 'border-gray-200 hover:border-rose-200'
                      }`}
                  >
                    <p className="text-sm font-medium mb-1">Subscription</p>
                    <p className="text-xs text-gray-500">Recurring payments</p>
                  </button>
                </div>
              </div>

              {/* Visibility Settings */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Visibility</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={formData.visibility === 'public'}
                      onChange={(e) => handleInputChange('visibility', e.target.value)}
                      className="text-rose-500"
                    />
                    <span className="text-xs text-gray-600">Public</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio"
                      name="visibility"
                      value="private"
                      checked={formData.visibility === 'private'}
                      onChange={(e) => handleInputChange('visibility', e.target.value)}
                      className="text-rose-500"
                    />
                    <span className="text-xs text-gray-600">Private</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio"
                      name="visibility"
                      value="invite-only"
                      checked={formData.visibility === 'invite-only'}
                      onChange={(e) => handleInputChange('visibility', e.target.value)}
                      className="text-rose-500"
                    />
                    <span className="text-xs text-gray-600">Invite Only</span>
                  </label>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 rounded-full text-xs flex items-center gap-1">
                      <Hash size={10} />
                      {tag}
                      <button onClick={() => removeTag(tag)} className="text-gray-400 hover:text-rose-500">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add tag..."
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value) {
                        addTag(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>

              {/* Advanced Options Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1"
              >
                <Settings size={12} />
                {showAdvanced ? 'Hide' : 'Show'} Advanced Options
              </button>

              {/* Advanced Options */}
              {showAdvanced && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="allowNegotiation"
                      checked={formData.allowNegotiation}
                      onChange={(e) => handleInputChange('allowNegotiation', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="allowNegotiation" className="text-xs text-gray-600">
                      Allow negotiation on terms and budget
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="allowPartialRelease"
                      checked={formData.allowPartialRelease}
                      onChange={(e) => handleInputChange('allowPartialRelease', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="allowPartialRelease" className="text-xs text-gray-600">
                      Allow partial release of funds
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="requireBid"
                      checked={formData.requireBid}
                      onChange={(e) => handleInputChange('requireBid', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="requireBid" className="text-xs text-gray-600">
                      Require bid/quote from creators
                    </label>
                  </div>

                  {formData.requireBid && (
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Bid Deadline</label>
                      <input 
                        type="date"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        value={formData.bidDeadline || ''}
                        onChange={(e) => handleInputChange('bidDeadline', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Budget */}
        {step === 2 && (
          <div className="p-5 animate-in slide-in-from-right-4">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Budget Setup</h2>
            <p className="text-sm text-gray-500 mb-5">Configure the financial details</p>
            
            <div className="space-y-4">
              {/* Currency and Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-600 mb-1 block">Total Amount <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <input 
                      type="number"
                      min={MINIMUM_AMOUNT}
                      step="100"
                      className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-lg font-semibold outline-none transition-all pr-20
                        ${touched.has('amount') && (validationErrors.amount || isInsufficientFunds) 
                          ? 'border-rose-200 bg-rose-50' 
                          : 'border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100'
                        }`}
                      placeholder="0"
                      value={formData?.amount || ''}
                      onChange={(e) => handleInputChange('amount', Number(e.target.value))}
                      onBlur={() => setTouched(prev => new Set(prev).add('amount'))}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <select
                        value={formData.currency}
                        onChange={(e) => handleInputChange('currency', e.target.value as 'KES' | 'USD' | 'EUR' | 'GBP')}
                        className="bg-transparent text-sm font-medium text-gray-600 outline-none"
                      >
                        {SUPPORTED_CURRENCIES.map((currency) => (
                          <option key={currency} value={currency}>{currency}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {validationErrors.amount && (
                    <p className="text-rose-500 text-xs flex items-center gap-1 mt-1">
                      <AlertCircle size={12} /> {validationErrors.amount}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Funding Party</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    value={formData.fundingParty}
                    onChange={(e) => handleInputChange('fundingParty', e.target.value)}
                  >
                    <option value="business">Business pays</option>
                    <option value="creator">Creator pays</option>
                    <option value="split">Split payment</option>
                  </select>
                </div>
              </div>

              {/* Split Ratio (if split) */}
              {formData.fundingParty === 'split' && (
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Split Ratio (Creator : Business)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={formData.splitRatio || 50}
                      onChange={(e) => handleInputChange('splitRatio', Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium min-w-[80px]">
                      {formData.splitRatio || 50} : {100 - (formData.splitRatio || 50)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Creator: {formatCurrency(creatorContribution)}</span>
                    <span>Business: {formatCurrency(businessContribution)}</span>
                  </div>
                </div>
              )}

              {isInsufficientFunds && (
                <div className="flex items-center gap-2 text-rose-600 text-xs mt-2 bg-rose-50 p-2 rounded-lg">
                  <AlertTriangle size={12} /> 
                  Insufficient balance. Need {formatCurrency(creatorContribution - userBalance)}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Release Rule</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                    value={formData?.releaseRule || 'multi-sig'}
                    onChange={(e) => handleInputChange('releaseRule', e.target.value)}
                  >
                    <option value="multi-sig">Multi-signature (Both parties)</option>
                    <option value="auto">Automatic (Time-based)</option>
                    <option value="oracle">Oracle-based (3rd party)</option>
                    <option value="hybrid">Hybrid (Multi-sig + Time)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Dispute Window</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                    value={formData?.disputeWindow || 7}
                    onChange={(e) => handleInputChange('disputeWindow', Number(e.target.value))}
                  >
                    {DISPUTE_WINDOW_OPTIONS.map(days => (
                      <option key={days} value={days}>{days} days</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.releaseRule === 'auto' && (
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Auto-Release After (Days)</label>
                  <input 
                    type="number"
                    min="1"
                    max="30"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    value={formData.autoReleaseDays}
                    onChange={(e) => handleInputChange('autoReleaseDays', Number(e.target.value))}
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="requiresApproval"
                  checked={formData.requiresApproval}
                  onChange={(e) => handleInputChange('requiresApproval', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="requiresApproval" className="text-xs text-gray-600">
                  Require approval before release
                </label>
              </div>

              {/* Fee Breakdown */}
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                <p className="text-xs font-medium text-emerald-800 mb-3">Payout Summary</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Gross Amount</span>
                    <span className="font-medium">{formatCurrency(formData?.amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Platform Fee (5%)</span>
                    <span className="text-rose-600">-{formatCurrency(platformFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-emerald-200">
                    <span className="font-medium">Net Payout</span>
                    <span className="font-semibold text-emerald-700">{formatCurrency(netPayout)}</span>
                  </div>
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Vault Expiry Date (Optional)</label>
                <input 
                  type="date"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  value={formData.expiryDate || ''}
                  onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">Funds return to funder after this date if unclaimed</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Milestones */}
        {step === 3 && (
          <div className="p-5 animate-in slide-in-from-right-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Milestones</h2>
                <p className="text-sm text-gray-500">Break down deliverables into phases</p>
              </div>
              
              {formData?.vaultType === 'milestone' && (
                <button 
                  onClick={addMilestone} 
                  disabled={(formData?.milestones || []).length >= MAX_MILESTONES}
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Milestone
                </button>
              )}
            </div>

            {formData?.vaultType === 'milestone' ? (
              <div className="space-y-4">
                {(formData?.milestones || []).length === 0 ? (
                  <div className="py-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <Clock className="mx-auto text-gray-300 mb-2" size={32}/>
                    <p className="text-sm text-gray-400">No milestones added yet</p>
                    <button 
                      onClick={addMilestone}
                      className="mt-2 text-xs text-rose-500 hover:underline"
                    >
                      Add your first milestone
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{completedMilestones}/{formData.milestones.length} completed</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-rose-500 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    {formData.milestones.map((milestone, idx) => (
                      <div key={milestone?.id || idx} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-gray-500">Milestone {idx + 1}</span>
                          <div className="flex items-center gap-2">
                            {milestone.status && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                milestone.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                milestone.status === 'disputed' ? 'bg-rose-100 text-rose-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {milestone.status}
                              </span>
                            )}
                            <button 
                              onClick={() => removeMilestone(milestone?.id)} 
                              className="text-gray-300 hover:text-rose-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input 
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400"
                            placeholder="Title"
                            value={milestone?.title || ''} 
                            onChange={e => updateMilestone(milestone?.id, 'title', e.target.value)}
                          />
                          
                          <input 
                            type="number"
                            min="0"
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400"
                            placeholder="Amount"
                            value={milestone?.amount || ''}
                            onChange={e => updateMilestone(milestone?.id, 'amount', Number(e.target.value))}
                          />
                          
                          <input 
                            type="date"
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400"
                            value={milestone?.deadline || ''}
                            onChange={e => updateMilestone(milestone?.id, 'deadline', e.target.value)}
                          />
                          
                          <input 
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400"
                            placeholder="Deliverables (comma separated)"
                            value={milestone?.deliverables?.join(', ') || ''}
                            onChange={e => updateMilestone(milestone?.id, 'deliverables', e.target.value.split(',').map(s => s.trim()))}
                          />
                          
                          <textarea 
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400 sm:col-span-2 min-h-[60px]"
                            placeholder="Description and requirements..."
                            value={milestone?.description || ''}
                            onChange={e => updateMilestone(milestone?.id, 'description', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}

                    {/* Budget Summary */}
                    <div className="mt-4 p-4 bg-gray-900 rounded-lg text-white">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">Total Allocated</span>
                        <span className="text-sm font-semibold">{formatCurrency(totalMilestoneSum)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-400">Total Budget</span>
                        <span className="text-sm font-semibold">{formatCurrency(formData?.amount || 0)}</span>
                      </div>
                      
                      {!isBudgetBalanced && (
                        <div className="mt-3 p-2 bg-rose-500/20 rounded text-xs text-center">
                          <AlertTriangle size={12} className="inline mr-1" />
                          Budget mismatch: Total must equal {formatCurrency(formData?.amount || 0)}
                        </div>
                      )}

                      {isBudgetBalanced && formData.milestones.length > 0 && (
                        <div className="mt-3 p-2 bg-emerald-500/20 rounded text-xs text-center text-emerald-300">
                          <CheckCircle2 size={12} className="inline mr-1" />
                          Budget balanced correctly
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : formData?.vaultType === 'subscription' ? (
              <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <Clock className="mx-auto text-gray-300 mb-2" size={32}/>
                <p className="text-sm text-gray-400">Subscription vault - recurring payments</p>
                <p className="text-xs text-gray-300 mt-2">Configure frequency and duration in advanced settings</p>
              </div>
            ) : (
              <div className="py-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <Zap className="mx-auto text-gray-300 mb-2" size={32}/>
                <p className="text-sm text-gray-400">Fixed vault - single payment upon completion</p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="p-5 animate-in fade-in">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Review & Deploy</h2>
            <p className="text-sm text-gray-500 mb-5">Confirm all details before deploying</p>
            
            <div className="space-y-4">
              {/* Summary Card */}
              <div className="bg-gray-900 rounded-lg p-5 text-white">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Vault</p>
                    <p className="text-base font-semibold">{formData?.title || 'Untitled'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1">Total</p>
                    <p className="text-lg font-semibold text-emerald-400">{formatCurrency(formData?.amount || 0)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 py-3 border-y border-white/10">
                  <div>
                    <p className="text-[10px] text-gray-400">Counterparty</p>
                    <p className="text-sm">@{formData?.counterpartyHandle || 'username'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Platform</p>
                    <p className="text-sm capitalize">{formData?.socialPlatform || 'instagram'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Type</p>
                    <p className="text-sm capitalize">{formData?.vaultType || 'fixed'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Release</p>
                    <p className="text-sm capitalize">{formData?.releaseRule || 'multi-sig'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Funding</p>
                    <p className="text-sm capitalize">{formData?.fundingParty}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Visibility</p>
                    <p className="text-sm capitalize">{formData?.visibility}</p>
                  </div>
                </div>

                {formData?.description && (
                  <p className="mt-3 text-sm text-gray-300">{formData.description}</p>
                )}

                {formData.milestones.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-[10px] text-gray-400 mb-2">Milestones ({formData.milestones.length})</p>
                    <div className="space-y-1">
                      {formData.milestones.map((m, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-gray-300">{m.title}</span>
                          <span className="text-emerald-400">{formatCurrency(m.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-gray-400">Attachments ({formData.attachments.length})</p>
                      <label className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 cursor-pointer transition-colors">
                        <Upload size={10} />
                        <span>Add Files</span>
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                    {formData.attachments.length > 0 && (
                      <div className="space-y-1">
                        {formData.attachments.map((a, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              {a.type === 'image' ? <Image size={10} /> : a.type === 'pdf' ? <FileText size={10} /> : <Music size={10} />}
                              <span className="text-gray-300">{a.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttachment(a.id)}
                              className="text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
              </div>

              {/* Terms Agreement */}
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 space-y-3">
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    id="agree"
                    className="mt-1 w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    checked={formData?.agreed || false}
                    onChange={(e) => handleInputChange('agreed', e.target.checked)}
                  />
                  <label htmlFor="agree" className="text-xs text-amber-800">
                    I confirm that all information is accurate and agree to the terms of the escrow protocol. 
                    Funds will be locked upon deployment.
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    id="terms"
                    className="mt-1 w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    checked={formData?.termsAccepted || false}
                    onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
                  />
                  <label htmlFor="terms" className="text-xs text-amber-800">
                    I have read and accept the GeonPayGuard Terms of Service
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    id="privacy"
                    className="mt-1 w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    checked={formData?.privacyAccepted || false}
                    onChange={(e) => handleInputChange('privacyAccepted', e.target.checked)}
                  />
                  <label htmlFor="privacy" className="text-xs text-amber-800">
                    I understand how my data will be used according to the Privacy Policy
                  </label>
                </div>

                {validationErrors.agreed && (
                  <p className="text-rose-500 text-xs flex items-center gap-1">
                    <AlertCircle size={12} /> {validationErrors.agreed}
                  </p>
                )}
              </div>

              {/* Deployment Summary */}
              <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600">
                <p className="font-medium mb-2">Deployment Summary:</p>
                <ul className="space-y-1 list-disc pl-4">
                  <li>Funds will be locked in GeonPayGuard smart contract</li>
                  <li>Platform fee: {formatCurrency(platformFee)} (5%)</li>
                  <li>Dispute window: {formData.disputeWindow} days</li>
                  <li>Estimated gas: ~0.002 ETH (varies by network)</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-gray-50 p-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <button 
            onClick={() => handleStepChange(step - 1)}
            disabled={step === 1 || submitting}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-900 transition-all disabled:opacity-0 w-full sm:w-auto justify-center"
          >
            <ArrowLeft size={14} /> Back
          </button>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {step < 4 && (
              <>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-gray-400 hover:text-gray-900 transition-all px-3"
                >
                  Preview
                </button>
                <button
                  onClick={() => {/* Save as draft */}}
                  className="text-xs text-gray-400 hover:text-gray-900 transition-all px-3"
                >
                  Save Draft
                </button>
              </>
            )}
            
            <button 
              onClick={() => step < 4 ? handleStepChange(step + 1) : handleDeploy()}
              disabled={
                (step === 1 && (!formData?.title || !formData?.counterpartyHandle || !formData?.description)) || 
                (step === 2 && ((formData?.amount || 0) < MINIMUM_AMOUNT || isInsufficientFunds)) ||
                (step === 3 && formData?.vaultType === 'milestone' && !isBudgetBalanced) ||
                (step === 4 && (!formData?.agreed || !formData?.termsAccepted || !formData?.privacyAccepted || submitting))
              }
              className={`px-6 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 disabled:opacity-50 w-full sm:w-auto justify-center
                ${step === 4 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : 'bg-rose-500 hover:bg-rose-600 text-white'
                }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  Processing...
                </>
              ) : step === 4 ? (
                <>
                  Deploy Vault <ArrowUpRight size={14}/>
                </>
              ) : (
                <>
                  Continue <ChevronRight size={14}/>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && step < 4 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Vault Preview</h3>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 text-white">
              <p className="text-xs text-gray-400 mb-1">Title</p>
              <p className="text-sm font-medium mb-3">{formData?.title || 'Untitled'}</p>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-gray-400">Counterparty</p>
                  <p>@{formData?.counterpartyHandle}</p>
                </div>
                <div>
                  <p className="text-gray-400">Amount</p>
                  <p className="text-emerald-400">{formatCurrency(formData?.amount || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Type</p>
                  <p className="capitalize">{formData?.vaultType}</p>
                </div>
                <div>
                  <p className="text-gray-400">Platform</p>
                  <p className="capitalize">{formData?.socialPlatform}</p>
                </div>
              </div>
            </div>
            
            {formData.description && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-xs text-gray-700">{formData.description.substring(0, 100)}...</p>
              </div>
            )}
            
            <button 
              onClick={() => setShowPreview(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function setUploadingFiles(_arg0: boolean) {
  throw new Error('Function not implemented.');
}
