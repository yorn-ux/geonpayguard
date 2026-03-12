'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Shield, Zap, Link as LinkIcon, CheckCircle2, 
  Loader2, Sparkles, ArrowRight, Upload, FileText,
  Instagram, Youtube, Video, Share2,  Image,
   Calendar,  DollarSign, Users,
  Globe, Hash, Star,
   ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: any;
  mode?: 'apply' | 'create' | 'view';
  userRole?: 'influencer' | 'business' | 'admin';
}

interface Question {
  id: string;
  question: string;
  type: 'text' | 'file' | 'multiple-choice' | 'rating' | 'yes-no';
  options?: string[];
  required: boolean;
  answer?: any;
}

interface Deliverable {
  platform: string;
  type: string;
  quantity: number;
  videoLength?: string;
  requirements: string[];
}

export default function CampaignModal({ isOpen, onClose, campaign, mode = 'apply', userRole = 'influencer' }: CampaignModalProps) {
  const { showToast } = useNotificationStore();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab] = useState<'apply' | 'create' | 'view'>(mode);
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  // ==================== APPLICATION FORM STATE ====================
  const [applicationData, setApplicationData] = useState({
    // Basic Info
    pitch: '',
    portfolio: '',
    socialHandle: '',
    platform: 'instagram',
    deliveryDays: '3',
    
    // Media & Assets
    mediaKit: null as File | null,
    previousWork: [] as string[],
    newWorkLink: '',
    
    // Creative Samples
    creativeSamples: [] as File[],
    moodBoard: null as File | null,
    
    // Rates & Availability
    proposedRate: 0,
    currency: 'KES',
    availableFrom: '',
    availableUntil: '',
    
    // Questions
    answers: {} as Record<string, any>,
    
    // Additional
    notes: '',
    terms: false
  });

  // ==================== CAMPAIGN CREATION STATE ====================
  const [campaignData, setCampaignData] = useState({
    // Basic Info
    title: '',
    description: '',
    category: 'beauty',
    goal: 'brand_awareness',
    coverImage: null as File | null,
    galleryImages: [] as File[],
    campaignVideo: null as File | null,
    
    // Timeline
    applicationDeadline: '',
    contentDeadline: '',
    campaignStart: '',
    campaignEnd: '',
    draftDeadline: '',
    
    // Targeting
    locations: [] as string[],
    minFollowers: 1000,
    minEngagement: 2.0,
    ageRange: ['18-34'],
    gender: 'any',
    languages: [] as string[],
    niches: [] as string[],
    
    // Budget & Compensation
    totalBudget: 0,
    currency: 'KES',
    compensationType: 'fixed',
    fixedRate: 0,
    creatorCount: 1,
    performanceCommission: 0,
    productGifting: false,
    productValue: 0,
    productDetails: '',
    allowNegotiation: false,
    
    // Deliverables
    deliverables: [] as Deliverable[],
    
    // Creative Assets
    moodBoard: null as File | null,
    productImages: [] as File[],
    brandGuidelines: null as File | null,
    musicFiles: [] as File[],
    shotList: null as File | null,
    
    // Legal
    usageRights: 'perpetual' as 'perpetual' | 'limited' | 'exclusive',
    exclusivityMonths: 0,
    disclosureRequired: true,
    customTerms: '',
    requireContract: true,
    contractFile: null as File | null,
    
    // Questions for Creators
    customQuestions: [] as Question[],
    
    // Additional
    tags: [] as string[],
    visibility: 'public' as 'public' | 'private' | 'unlisted',
    allowApplications: true,
    autoApprove: false,
    
    // Vault Settings
    requireVault: true,
    disputeWindow: 7,
    releaseRule: 'multi-sig'
  });

  const [currentDeliverable, setCurrentDeliverable] = useState<Deliverable>({
    platform: 'instagram',
    type: 'post',
    quantity: 1,
    videoLength: '15-30',
    requirements: []
  });

  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: crypto.randomUUID?.() || Date.now().toString(),
    question: '',
    type: 'text',
    options: [''],
    required: true
  });

  const getAuthToken = () => {
    if (typeof document === 'undefined') return null;
    const localStorageToken = localStorage.getItem('auth_token');
    if (localStorageToken) return localStorageToken;

    const value = `; ${document.cookie}`;
    const parts = value.split(`; geon_token=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        resetForms();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const resetForms = () => {
    setSubmitted(false);
    setCurrentStep(1);
    
    // Reset application form
    setApplicationData({
      pitch: '',
      portfolio: '',
      socialHandle: '',
      platform: 'instagram',
      deliveryDays: '3',
      mediaKit: null,
      previousWork: [],
      newWorkLink: '',
      creativeSamples: [],
      moodBoard: null,
      proposedRate: 0,
      currency: 'KES',
      availableFrom: '',
      availableUntil: '',
      answers: {},
      notes: '',
      terms: false
    });
    
    // Reset campaign creation form
    setCampaignData({
      title: '',
      description: '',
      category: 'beauty',
      goal: 'brand_awareness',
      coverImage: null,
      galleryImages: [],
      campaignVideo: null,
      applicationDeadline: '',
      contentDeadline: '',
      campaignStart: '',
      campaignEnd: '',
      draftDeadline: '',
      locations: [],
      minFollowers: 1000,
      minEngagement: 2.0,
      ageRange: ['18-34'],
      gender: 'any',
      languages: [],
      niches: [],
      totalBudget: 0,
      currency: 'KES',
      compensationType: 'fixed',
      fixedRate: 0,
      creatorCount: 1,
      performanceCommission: 0,
      productGifting: false,
      productValue: 0,
      productDetails: '',
      allowNegotiation: false,
      deliverables: [],
      moodBoard: null,
      productImages: [],
      brandGuidelines: null,
      musicFiles: [],
      shotList: null,
      usageRights: 'perpetual',
      exclusivityMonths: 0,
      disclosureRequired: true,
      customTerms: '',
      requireContract: true,
      contractFile: null,
      customQuestions: [],
      tags: [],
      visibility: 'public',
      allowApplications: true,
      autoApprove: false,
      requireVault: true,
      disputeWindow: 7,
      releaseRule: 'multi-sig'
    });
  };

  // ==================== APPLICATION VALIDATION ====================
  const validateApplication = () => {
    const errors: Record<string, string> = {};
    
    if (!applicationData.socialHandle.trim()) {
      errors.socialHandle = 'Social handle is required';
    }
    
    if (!applicationData.portfolio.trim()) {
      errors.portfolio = 'Portfolio link is required';
    } else {
      try {
        new URL(applicationData.portfolio);
      } catch {
        errors.portfolio = 'Please enter a valid URL';
      }
    }
    
    if (!applicationData.pitch.trim()) {
      errors.pitch = 'Campaign strategy is required';
    } else if (applicationData.pitch.length < 50) {
      errors.pitch = 'Pitch must be at least 50 characters';
    }
    
    if (!applicationData.terms) {
      errors.terms = 'You must accept the terms';
    }
    
    return errors;
  };

  // ==================== CAMPAIGN CREATION VALIDATION ====================
  const validateCampaign = (step: number) => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 1: // Basic Info
        if (!campaignData.title.trim()) errors.title = 'Campaign title is required';
        if (!campaignData.description.trim()) errors.description = 'Description is required';
        break;
        
      case 2: // Timeline
        if (!campaignData.applicationDeadline) errors.applicationDeadline = 'Application deadline is required';
        break;
        
      case 3: // Budget
        if (campaignData.totalBudget <= 0) errors.totalBudget = 'Budget must be greater than 0';
        if (campaignData.compensationType === 'fixed' && campaignData.fixedRate <= 0) {
          errors.fixedRate = 'Fixed rate is required';
        }
        break;
        
      case 4: // Deliverables
        if (campaignData.deliverables.length === 0) {
          errors.deliverables = 'At least one deliverable is required';
        }
        break;
        
      case 5: // Review
        if (!campaignData.requireContract) {
          // Optional validation
        }
        break;
    }

    return errors;
  };

  // ==================== HANDLERS ====================
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateApplication();
    if (Object.keys(errors).length > 0) {
      Object.values(errors).forEach(err => showToast(err, "error"));
      return;
    }

    const token = getAuthToken();
    if (!token) {
      showToast("Session expired. Please log in to apply.", "error");
      return;
    }

    setSubmitting(true);

    try {
      const storedUser = JSON.parse(localStorage.getItem('geon_user') || '{}');
      
      const formData = new FormData();
      
      // Append all application data
      Object.entries(applicationData).forEach(([key, value]) => {
        if (key === 'mediaKit' && value instanceof File) {
          formData.append('media_kit', value);
        } else if (key === 'creativeSamples' && Array.isArray(value)) {
          const files = value as unknown as File[];
          files.forEach((file: File) => {
            formData.append('creative_samples', file);
          });
        } else if (key === 'moodBoard' && value instanceof File) {
          formData.append('mood_board', value);
        } else if (key === 'answers' && value !== null) {
          formData.append('answers', JSON.stringify(value));
        } else if (key !== 'mediaKit' && key !== 'creativeSamples' && key !== 'moodBoard' && key !== 'newWorkLink' && value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });
      
      formData.append('operator_id', storedUser.operator_id || 'GUEST');
      formData.append('previous_work', JSON.stringify(applicationData.previousWork));
      formData.append('timestamp', new Date().toISOString());

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/campaigns/${campaign.id}/apply`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Application failed to send.");
      }

      setSubmitted(true);
      showToast("Application sent successfully!", "success");
      
      setTimeout(onClose, 2500);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateCampaign(currentStep);
    if (Object.keys(errors).length > 0) {
      Object.values(errors).forEach(err => showToast(err, "error"));
      return;
    }

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      showToast("Session expired. Please log in.", "error");
      return;
    }

    setSubmitting(true);

    try {
      const storedUser = JSON.parse(localStorage.getItem('geon_user') || '{}');
      
      const formData = new FormData();
      
      // Append all campaign data
      Object.entries(campaignData).forEach(([key, value]) => {
        if (key === 'coverImage' && value instanceof File) {
          formData.append('cover_image', value);
        } else if (key === 'galleryImages' && Array.isArray(value)) {
          const files = value as unknown as File[];
          files.forEach((file: File) => {
            formData.append('gallery_images', file);
          });
        } else if (key === 'campaignVideo' && value instanceof File) {
          formData.append('campaign_video', value);
        } else if (key === 'moodBoard' && value instanceof File) {
          formData.append('mood_board', value);
        } else if (key === 'productImages' && Array.isArray(value)) {
          const files = value as unknown as File[];
          files.forEach((file: File) => {
            formData.append('product_images', file);
          });
        } else if (key === 'brandGuidelines' && value instanceof File) {
          formData.append('brand_guidelines', value);
        } else if (key === 'musicFiles' && Array.isArray(value)) {
          const files = value as unknown as File[];
          files.forEach((file: File) => {
            formData.append('music_files', file);
          });
        } else if (key === 'shotList' && value instanceof File) {
          formData.append('shot_list', value);
        } else if (key === 'contractFile' && value instanceof File) {
          formData.append('contract', value);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof File)) {
          formData.append(key, JSON.stringify(value));
        } else if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });
      
      formData.append('operator_id', storedUser.operator_id || 'GUEST');
      formData.append('created_by', userRole);
      formData.append('timestamp', new Date().toISOString());

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/campaigns/create`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Campaign creation failed.");
      }

      const result = await response.json();
      setSubmitted(true);
      showToast("Campaign created successfully! Now fund your vault.", "success");
      
      // Redirect to vault funding
      setTimeout(() => {
        window.location.href = `/vaults/new?campaign=${result.id}`;
      }, 2000);
      
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const addDeliverable = () => {
    setCampaignData(prev => ({
      ...prev,
      deliverables: [...prev.deliverables, { ...currentDeliverable }]
    }));
    setCurrentDeliverable({
      platform: 'instagram',
      type: 'post',
      quantity: 1,
      videoLength: '15-30',
      requirements: []
    });
  };

  const removeDeliverable = (index: number) => {
    setCampaignData(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index)
    }));
  };

  const addQuestion = () => {
    setCampaignData(prev => ({
      ...prev,
      customQuestions: [...prev.customQuestions, { ...currentQuestion, id: crypto.randomUUID?.() || Date.now().toString() }]
    }));
    setCurrentQuestion({
      id: crypto.randomUUID?.() || Date.now().toString(),
      question: '',
      type: 'text',
      options: [''],
      required: true
    });
  };

  const removeQuestion = (index: number) => {
    setCampaignData(prev => ({
      ...prev,
      customQuestions: prev.customQuestions.filter((_, i) => i !== index)
    }));
  };

  const addLocation = (location: string) => {
    if (!campaignData.locations.includes(location)) {
      setCampaignData(prev => ({
        ...prev,
        locations: [...prev.locations, location]
      }));
    }
  };

  const removeLocation = (location: string) => {
    setCampaignData(prev => ({
      ...prev,
      locations: prev.locations.filter(l => l !== location)
    }));
  };

  const addTag = (tag: string) => {
    if (tag && !campaignData.tags.includes(tag)) {
      setCampaignData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTag = (tag: string) => {
    setCampaignData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const addLanguage = (language: string) => {
    if (!campaignData.languages.includes(language)) {
      setCampaignData(prev => ({
        ...prev,
        languages: [...prev.languages, language]
      }));
    }
  };

  const removeLanguage = (language: string) => {
    setCampaignData(prev => ({
      ...prev,
      languages: prev.languages.filter(l => l !== language)
    }));
  };

  const addNiche = (niche: string) => {
    if (!campaignData.niches.includes(niche)) {
      setCampaignData(prev => ({
        ...prev,
        niches: [...prev.niches, niche]
      }));
    }
  };

  const removeNiche = (niche: string) => {
    setCampaignData(prev => ({
      ...prev,
      niches: prev.niches.filter(n => n !== niche)
    }));
  };

  const addPreviousWorkLink = () => {
    if (applicationData.newWorkLink && applicationData.newWorkLink.trim()) {
      setApplicationData(prev => ({
        ...prev,
        previousWork: [...prev.previousWork, prev.newWorkLink],
        newWorkLink: ''
      }));
    }
  };

  const removePreviousWorkLink = (index: number) => {
    setApplicationData(prev => ({
      ...prev,
      previousWork: prev.previousWork.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string, _isMultiple: boolean = false) => {
    const files = e.target.files;
    if (!files) return;

    if (field === 'coverImage') {
      setCampaignData(prev => ({ ...prev, coverImage: files[0] }));
    } else if (field === 'galleryImages') {
      setCampaignData(prev => ({ 
        ...prev, 
        galleryImages: [...prev.galleryImages, ...Array.from(files)]
      }));
    } else if (field === 'campaignVideo') {
      setCampaignData(prev => ({ ...prev, campaignVideo: files[0] }));
    } else if (field === 'moodBoard') {
      if (mode === 'apply') {
        setApplicationData(prev => ({ ...prev, moodBoard: files[0] }));
      } else {
        setCampaignData(prev => ({ ...prev, moodBoard: files[0] }));
      }
    } else if (field === 'productImages') {
      setCampaignData(prev => ({ 
        ...prev, 
        productImages: [...prev.productImages, ...Array.from(files)]
      }));
    } else if (field === 'brandGuidelines') {
      setCampaignData(prev => ({ ...prev, brandGuidelines: files[0] }));
    } else if (field === 'musicFiles') {
      setCampaignData(prev => ({ 
        ...prev, 
        musicFiles: [...prev.musicFiles, ...Array.from(files)]
      }));
    } else if (field === 'shotList') {
      setCampaignData(prev => ({ ...prev, shotList: files[0] }));
    } else if (field === 'contractFile') {
      setCampaignData(prev => ({ ...prev, contractFile: files[0] }));
    } else if (field === 'mediaKit') {
      setApplicationData(prev => ({ ...prev, mediaKit: files[0] }));
    } else if (field === 'creativeSamples') {
      setApplicationData(prev => ({ 
        ...prev, 
        creativeSamples: [...prev.creativeSamples, ...Array.from(files)]
      }));
    }

    // Simulate upload progress
    Array.from(files).forEach((_file, index) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(prev => ({ ...prev, [`${field}-${index}`]: progress }));
        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setUploadProgress(prev => {
              const newProgress = { ...prev };
              delete newProgress[`${field}-${index}`];
              return newProgress;
            });
          }, 1000);
        }
      }, 100);
    });
  };

  const removeFile = (field: string, index?: number) => {
    if (field === 'galleryImages' && index !== undefined) {
      setCampaignData(prev => ({
        ...prev,
        galleryImages: prev.galleryImages.filter((_, i) => i !== index)
      }));
    } else if (field === 'productImages' && index !== undefined) {
      setCampaignData(prev => ({
        ...prev,
        productImages: prev.productImages.filter((_, i) => i !== index)
      }));
    } else if (field === 'musicFiles' && index !== undefined) {
      setCampaignData(prev => ({
        ...prev,
        musicFiles: prev.musicFiles.filter((_, i) => i !== index)
      }));
    } else if (field === 'creativeSamples' && index !== undefined) {
      setApplicationData(prev => ({
        ...prev,
        creativeSamples: prev.creativeSamples.filter((_, i) => i !== index)
      }));
    } else {
      if (mode === 'apply') {
        setApplicationData(prev => ({ ...prev, [field]: null }));
      } else {
        setCampaignData(prev => ({ ...prev, [field]: null }));
      }
    }
  };

  const getPlatformIcon = (platformName: string) => {
    switch (platformName) {
      case 'youtube': return <Youtube size={16} className="text-red-600" />;
      case 'tiktok': return <Video size={16} />;
      case 'twitter': return <Share2 size={16} className="text-sky-500" />;
      case 'instagram': return <Instagram size={16} className="text-pink-600" />;
      default: return <Globe size={16} className="text-gray-600" />;
    }
  };

  if (!isOpen) return null;

  const renderApplicationForm = () => (
    <div className="p-6 overflow-y-auto">
      {/* Campaign Summary */}
      {campaign && (
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-800">Applying to:</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{campaign.title}</p>
              <div className="flex flex-wrap gap-3 mt-2">
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <DollarSign size={10} /> Budget: {campaignData.currency} {campaign.budget?.toLocaleString()}
                </p>
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <Calendar size={10} /> Deadline: {campaign.applicationDeadline}
                </p>
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <Users size={10} /> {campaign.applications || 0} applicants
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleApply} className="space-y-5">
        
        {/* Platform & Handle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Platform</label>
            <select 
              value={applicationData.platform}
              onChange={(e) => setApplicationData({...applicationData, platform: e.target.value})}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="twitter">X (Twitter)</option>
              <option value="linkedin">LinkedIn</option>
              <option value="twitch">Twitch</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Social Handle <span className="text-rose-500">*</span></label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                {getPlatformIcon(applicationData.platform)}
              </div>
              <input 
                required
                type="text"
                value={applicationData.socialHandle}
                onChange={(e) => setApplicationData({...applicationData, socialHandle: e.target.value})}
                placeholder="@username"
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Portfolio & Delivery */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Portfolio Link <span className="text-rose-500">*</span></label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="url"
                required
                value={applicationData.portfolio}
                onChange={(e) => setApplicationData({...applicationData, portfolio: e.target.value})}
                placeholder="https://..."
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Delivery Time</label>
            <select 
              value={applicationData.deliveryDays}
              onChange={(e) => setApplicationData({...applicationData, deliveryDays: e.target.value})}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            >
              <option value="1">Express (24h)</option>
              <option value="3">Standard (3 Days)</option>
              <option value="7">1 Week</option>
              <option value="14">2 Weeks</option>
              <option value="30">1 Month</option>
            </select>
          </div>
        </div>

        {/* Proposed Rate (Optional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Your Rate (Optional)</label>
            <div className="flex gap-2">
              <input 
                type="number"
                value={applicationData.proposedRate || ''}
                onChange={(e) => setApplicationData({...applicationData, proposedRate: Number(e.target.value)})}
                placeholder="0"
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400"
              />
              <select
                value={applicationData.currency}
                onChange={(e) => setApplicationData({...applicationData, currency: e.target.value})}
                className="w-20 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
              >
                <option value="KES">KES</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Availability</label>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="date"
                value={applicationData.availableFrom}
                onChange={(e) => setApplicationData({...applicationData, availableFrom: e.target.value})}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400"
                placeholder="From"
              />
              <input 
                type="date"
                value={applicationData.availableUntil}
                onChange={(e) => setApplicationData({...applicationData, availableUntil: e.target.value})}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400"
                placeholder="To"
              />
            </div>
          </div>
        </div>

        {/* Media Kit Upload */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Media Kit (PDF)</label>
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-rose-300 transition-colors">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileUpload(e, 'mediaKit')}
              className="hidden"
              id="mediaKit"
            />
            <label htmlFor="mediaKit" className="cursor-pointer">
              {applicationData.mediaKit ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                  <FileText size={16} />
                  <span className="text-sm">{applicationData.mediaKit.name}</span>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      removeFile('mediaKit');
                    }}
                    className="text-gray-400 hover:text-rose-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload size={20} className="text-gray-400" />
                  <p className="text-xs text-gray-500">Click to upload your media kit (optional)</p>
                  <p className="text-[10px] text-gray-400">PDF only, max 10MB</p>
                </div>
              )}
            </label>
          </div>
          {uploadProgress['mediaKit-0'] && (
            <div className="mt-2">
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-500 transition-all duration-300"
                  style={{ width: `${uploadProgress['mediaKit-0']}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Creative Samples */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Creative Samples</label>
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-rose-300 transition-colors">
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => handleFileUpload(e, 'creativeSamples', true)}
              className="hidden"
              id="creativeSamples"
            />
            <label htmlFor="creativeSamples" className="cursor-pointer">
              <div className="flex flex-col items-center gap-1">
                <Image size={20} className="text-gray-400" />
                <p className="text-xs text-gray-500">Upload examples of your work</p>
                <p className="text-[10px] text-gray-400">Images or videos, max 5 files</p>
              </div>
            </label>
          </div>
          
          {/* Creative Samples List */}
          {applicationData.creativeSamples.length > 0 && (
            <div className="mt-2 space-y-1">
              {applicationData.creativeSamples.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    {file.type.startsWith('image/') ? <Image size={12} /> : <Video size={12} />}
                    <span className="text-xs truncate max-w-[200px]">{file.name}</span>
                  </div>
                  <button onClick={() => removeFile('creativeSamples', index)} className="text-gray-400 hover:text-rose-500">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Previous Work Links */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Previous Work Examples</label>
          <div className="space-y-2">
            {applicationData.previousWork.map((link, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                <LinkIcon size={12} className="text-gray-400" />
                <span className="text-xs text-gray-600 flex-1 truncate">{link}</span>
                <button 
                  type="button"
                  onClick={() => removePreviousWorkLink(index)}
                  className="text-gray-400 hover:text-rose-500"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="url"
                value={applicationData.newWorkLink}
                onChange={(e) => setApplicationData({...applicationData, newWorkLink: e.target.value})}
                placeholder="https://..."
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400"
              />
              <button
                type="button"
                onClick={addPreviousWorkLink}
                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Pitch */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Campaign Strategy <span className="text-rose-500">*</span></label>
          <textarea 
            required
            value={applicationData.pitch}
            onChange={(e) => setApplicationData({...applicationData, pitch: e.target.value})}
            placeholder="Describe your creative concept, execution plan, and why you're the perfect fit for this campaign..."
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none resize-none min-h-[150px] focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-400">
              Minimum 50 characters • {applicationData.pitch.length}/1000
            </p>
          </div>
        </div>

        {/* Additional Notes */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Additional Notes (Optional)</label>
          <textarea 
            value={applicationData.notes}
            onChange={(e) => setApplicationData({...applicationData, notes: e.target.value})}
            placeholder="Any other information you'd like to share..."
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none resize-none min-h-[80px] focus:border-rose-400"
          />
        </div>

        {/* Terms */}
        <div className="flex items-start gap-2">
          <input 
            type="checkbox"
            id="terms"
            checked={applicationData.terms}
            onChange={(e) => setApplicationData({...applicationData, terms: e.target.checked})}
            className="mt-1 rounded border-gray-300"
          />
          <label htmlFor="terms" className="text-xs text-gray-600">
            I confirm that all information provided is accurate and I agree to the 
            <button type="button" className="text-rose-500 hover:underline mx-1">Terms of Service</button>
            and
            <button type="button" className="text-rose-500 hover:underline mx-1">Privacy Policy</button>
          </label>
        </div>

        {/* Submit Button */}
        <button 
          type="submit"
          disabled={submitting || !applicationData.terms}
          className="w-full py-3 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <>
              Submit Application <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Protection Notice */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
            <Shield size={14} className="text-emerald-600" />
          </div>
          <p className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">Vault protected:</span> Funds are secured by GeonPayGuard and released automatically upon brand approval. Your application is encrypted and secure.
          </p>
        </div>
      </div>
    </div>
  );

  const renderCampaignCreationForm = () => {
    const steps = [
      { number: 1, label: 'Basic Info', icon: FileText },
      { number: 2, label: 'Timeline', icon: Calendar },
      { number: 3, label: 'Budget', icon: DollarSign },
      { number: 4, label: 'Deliverables', icon: Video },
      { number: 5, label: 'Review', icon: Shield }
    ];

    return (
      <div className="p-6 overflow-y-auto">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6 px-2 relative">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-100 -z-10" />
          <div 
            className="absolute top-4 left-0 h-0.5 bg-rose-500 transition-all duration-500 -z-10"
            style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
          />
          
          {steps.map((s) => {
            const StepIcon = s.icon;
            const isActive = currentStep >= s.number;
            const isCompleted = currentStep > s.number;
            
            return (
              <div key={s.number} className="flex flex-col items-center gap-1 flex-1 relative">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all cursor-pointer
                    ${isActive 
                      ? 'bg-rose-500 border-rose-500 text-white' 
                      : 'bg-white border-gray-200 text-gray-300 hover:border-rose-300'
                    }`}
                  onClick={() => s.number < currentStep && setCurrentStep(s.number)}
                >
                  {isCompleted ? <CheckCircle2 size={14} /> : <StepIcon size={14} />}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-gray-900' : 'text-gray-300'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleCreateCampaign} className="space-y-6">
          
          {/* ===== STEP 1: BASIC INFO ===== */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Basic Information</h3>
              
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Campaign Title <span className="text-rose-500">*</span></label>
                <input 
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400"
                  placeholder="e.g. Summer Collection Launch 2025"
                  value={campaignData.title}
                  onChange={(e) => setCampaignData({...campaignData, title: e.target.value})}
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">Description <span className="text-rose-500">*</span></label>
                <textarea 
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none min-h-[120px] focus:border-rose-400"
                  placeholder="Describe your campaign, goals, target audience, and what you're looking for in creators..."
                  value={campaignData.description}
                  onChange={(e) => setCampaignData({...campaignData, description: e.target.value})}
                  maxLength={2000}
                />
                <p className="text-xs text-gray-400 mt-1">{campaignData.description.length}/2000</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Category</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    value={campaignData.category}
                    onChange={(e) => setCampaignData({...campaignData, category: e.target.value})}
                  >
                    <option value="beauty">Beauty</option>
                    <option value="fashion">Fashion</option>
                    <option value="tech">Technology</option>
                    <option value="travel">Travel</option>
                    <option value="food">Food & Beverage</option>
                    <option value="fitness">Fitness</option>
                    <option value="gaming">Gaming</option>
                    <option value="lifestyle">Lifestyle</option>
                    <option value="finance">Finance</option>
                    <option value="education">Education</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Campaign Goal</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    value={campaignData.goal}
                    onChange={(e) => setCampaignData({...campaignData, goal: e.target.value})}
                  >
                    <option value="brand_awareness">Brand Awareness</option>
                    <option value="product_launch">Product Launch</option>
                    <option value="sales">Sales/Conversions</option>
                    <option value="engagement">Engagement</option>
                    <option value="traffic">Website Traffic</option>
                    <option value="content">User Generated Content</option>
                  </select>
                </div>
              </div>

              {/* Cover Image */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Cover Image</label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-rose-300 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'coverImage')}
                    className="hidden"
                    id="coverImage"
                  />
                  <label htmlFor="coverImage" className="cursor-pointer">
                    {campaignData.coverImage ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-600">
                        <Image size={16} />
                        <span className="text-sm">{campaignData.coverImage.name}</span>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            removeFile('coverImage');
                          }}
                          className="text-gray-400 hover:text-rose-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload size={20} className="text-gray-400" />
                        <p className="text-xs text-gray-500">Upload a cover image for your campaign</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Gallery Images */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Gallery Images</label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-rose-300 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileUpload(e, 'galleryImages', true)}
                    className="hidden"
                    id="galleryImages"
                  />
                  <label htmlFor="galleryImages" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-1">
                      <Upload size={20} className="text-gray-400" />
                      <p className="text-xs text-gray-500">Upload up to 5 gallery images</p>
                    </div>
                  </label>
                </div>
                
                {/* Gallery List */}
                {campaignData.galleryImages.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {campaignData.galleryImages.map((file, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={`Gallery ${index}`}
                          className="w-full h-20 object-cover rounded-lg"
                        />
                        <button 
                          onClick={() => removeFile('galleryImages', index)}
                          className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {campaignData.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 rounded-full text-xs flex items-center gap-1">
                      <Hash size={10} />
                      {tag}
                      <button onClick={() => removeTag(tag)} className="text-gray-400 hover:text-rose-500">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add tag and press Enter"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                      addTag(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* ===== STEP 2: TIMELINE & TARGETING ===== */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Timeline & Targeting</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Application Deadline <span className="text-rose-500">*</span></label>
                  <input 
                    type="date"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    value={campaignData.applicationDeadline}
                    onChange={(e) => setCampaignData({...campaignData, applicationDeadline: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Draft Deadline</label>
                  <input 
                    type="date"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    value={campaignData.draftDeadline}
                    onChange={(e) => setCampaignData({...campaignData, draftDeadline: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Content Deadline</label>
                  <input 
                    type="date"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    value={campaignData.contentDeadline}
                    onChange={(e) => setCampaignData({...campaignData, contentDeadline: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Campaign End Date</label>
                  <input 
                    type="date"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    value={campaignData.campaignEnd}
                    onChange={(e) => setCampaignData({...campaignData, campaignEnd: e.target.value})}
                  />
                </div>
              </div>

              {/* Locations */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Target Locations</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {campaignData.locations.map(loc => (
                    <span key={loc} className="px-2 py-1 bg-gray-100 rounded-full text-xs flex items-center gap-1">
                      <Globe size={10} />
                      {loc}
                      <button onClick={() => removeLocation(loc)} className="text-gray-400 hover:text-rose-500">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <select 
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  onChange={(e) => {
                    if (e.target.value) addLocation(e.target.value);
                    e.target.value = '';
                  }}
                >
                  <option value="">Add location...</option>
                  <option value="USA">USA</option>
                  <option value="UK">UK</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  <option value="Kenya">Kenya</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="South Africa">South Africa</option>
                  <option value="Europe">Europe</option>
                  <option value="Asia">Asia</option>
                </select>
              </div>

              {/* Languages */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Languages</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {campaignData.languages.map(lang => (
                    <span key={lang} className="px-2 py-1 bg-gray-100 rounded-full text-xs flex items-center gap-1">
                      <Globe size={10} />
                      {lang}
                      <button onClick={() => removeLanguage(lang)} className="text-gray-400 hover:text-rose-500">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <select 
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  onChange={(e) => {
                    if (e.target.value) addLanguage(e.target.value);
                    e.target.value = '';
                  }}
                >
                  <option value="">Add language...</option>
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="Swahili">Swahili</option>
                  <option value="Arabic">Arabic</option>
                  <option value="Chinese">Chinese</option>
                </select>
              </div>

              {/* Niches */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Content Niches</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {campaignData.niches.map(niche => (
                    <span key={niche} className="px-2 py-1 bg-gray-100 rounded-full text-xs flex items-center gap-1">
                      <Star size={10} />
                      {niche}
                      <button onClick={() => removeNiche(niche)} className="text-gray-400 hover:text-rose-500">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <select 
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  onChange={(e) => {
                    if (e.target.value) addNiche(e.target.value);
                    e.target.value = '';
                  }}
                >
                  <option value="">Add niche...</option>
                  <option value="Beauty">Beauty</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Tech">Tech</option>
                  <option value="Travel">Travel</option>
                  <option value="Food">Food</option>
                  <option value="Fitness">Fitness</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Lifestyle">Lifestyle</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Min Followers</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    value={campaignData.minFollowers}
                    onChange={(e) => setCampaignData({...campaignData, minFollowers: Number(e.target.value)})}
                  />
                </div>
                
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Min Engagement (%)</label>
                  <input 
                    type="number"
                    step="0.1"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    value={campaignData.minEngagement}
                    onChange={(e) => setCampaignData({...campaignData, minEngagement: Number(e.target.value)})}
                  />
                </div>
                
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Age Range</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    value={campaignData.ageRange[0]}
                    onChange={(e) => setCampaignData({...campaignData, ageRange: [e.target.value]})}
                  >
                    <option value="18-24">18-24</option>
                    <option value="25-34">25-34</option>
                    <option value="35-44">35-44</option>
                    <option value="45+">45+</option>
                    <option value="18-34">18-34</option>
                    <option value="25-44">25-44</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">Gender</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio"
                      name="gender"
                      value="any"
                      checked={campaignData.gender === 'any'}
                      onChange={(e) => setCampaignData({...campaignData, gender: e.target.value})}
                      className="text-rose-500"
                    />
                    <span className="text-xs">Any</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio"
                      name="gender"
                      value="female"
                      checked={campaignData.gender === 'female'}
                      onChange={(e) => setCampaignData({...campaignData, gender: e.target.value})}
                      className="text-rose-500"
                    />
                    <span className="text-xs">Female</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio"
                      name="gender"
                      value="male"
                      checked={campaignData.gender === 'male'}
                      onChange={(e) => setCampaignData({...campaignData, gender: e.target.value})}
                      className="text-rose-500"
                    />
                    <span className="text-xs">Male</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ===== STEP 3: BUDGET ===== */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Budget & Compensation</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Total Budget <span className="text-rose-500">*</span></label>
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      value={campaignData.totalBudget}
                      onChange={(e) => setCampaignData({...campaignData, totalBudget: Number(e.target.value)})}
                    />
                    <select
                      value={campaignData.currency}
                      onChange={(e) => setCampaignData({...campaignData, currency: e.target.value})}
                      className="w-20 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="KES">KES</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Number of Creators</label>
                  <input 
                    type="number"
                    min="1"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    value={campaignData.creatorCount}
                    onChange={(e) => setCampaignData({...campaignData, creatorCount: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">Compensation Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCampaignData({...campaignData, compensationType: 'fixed'})}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      campaignData.compensationType === 'fixed'
                        ? 'border-rose-500 bg-rose-50'
                        : 'border-gray-200 hover:border-rose-200'
                    }`}
                  >
                    <p className="text-sm font-medium">Fixed Rate</p>
                    <p className="text-xs text-gray-500">Set amount per creator</p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setCampaignData({...campaignData, compensationType: 'performance'})}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      campaignData.compensationType === 'performance'
                        ? 'border-rose-500 bg-rose-50'
                        : 'border-gray-200 hover:border-rose-200'
                    }`}
                  >
                    <p className="text-sm font-medium">Performance</p>
                    <p className="text-xs text-gray-500">Commission based</p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setCampaignData({...campaignData, compensationType: 'mixed'})}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      campaignData.compensationType === 'mixed'
                        ? 'border-rose-500 bg-rose-50'
                        : 'border-gray-200 hover:border-rose-200'
                    }`}
                  >
                    <p className="text-sm font-medium">Mixed</p>
                    <p className="text-xs text-gray-500">Fixed + Commission</p>
                  </button>
                </div>
              </div>

              {campaignData.compensationType === 'fixed' && (
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Fixed Rate per Creator</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    value={campaignData.fixedRate}
                    onChange={(e) => setCampaignData({...campaignData, fixedRate: Number(e.target.value)})}
                  />
                </div>
              )}

              {campaignData.compensationType === 'performance' && (
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Commission Rate (%)</label>
                  <input 
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    value={campaignData.performanceCommission}
                    onChange={(e) => setCampaignData({...campaignData, performanceCommission: Number(e.target.value)})}
                  />
                </div>
              )}

              {/* Product Gifting */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <input 
                    type="checkbox"
                    id="productGifting"
                    className="rounded border-gray-300"
                    checked={campaignData.productGifting}
                    onChange={(e) => setCampaignData({...campaignData, productGifting: e.target.checked})}
                  />
                  <label htmlFor="productGifting" className="text-xs font-medium text-gray-700">
                    Include Product Gifting
                  </label>
                </div>

                {campaignData.productGifting && (
                  <div className="space-y-3 pl-6">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Product Value per Creator</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        value={campaignData.productValue}
                        onChange={(e) => setCampaignData({...campaignData, productValue: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Product Details</label>
                      <textarea 
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm min-h-[80px]"
                        placeholder="Describe the products, quantities, and any restrictions..."
                        value={campaignData.productDetails}
                        onChange={(e) => setCampaignData({...campaignData, productDetails: e.target.value})}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Allow Negotiation */}
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="allowNegotiation"
                  className="rounded border-gray-300"
                  checked={campaignData.allowNegotiation}
                  onChange={(e) => setCampaignData({...campaignData, allowNegotiation: e.target.checked})}
                />
                <label htmlFor="allowNegotiation" className="text-xs text-gray-600">
                  Allow creators to negotiate rates
                </label>
              </div>
            </div>
          )}

          {/* ===== STEP 4: DELIVERABLES ===== */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Content Deliverables</h3>
              
              {/* Add Deliverable Form */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-xs font-medium mb-3">Add Deliverable</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <select
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                    value={currentDeliverable.platform}
                    onChange={(e) => setCurrentDeliverable({...currentDeliverable, platform: e.target.value})}
                  >
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="twitter">Twitter/X</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                  
                  <select
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                    value={currentDeliverable.type}
                    onChange={(e) => setCurrentDeliverable({...currentDeliverable, type: e.target.value})}
                  >
                    <option value="post">Post</option>
                    <option value="reel">Reel</option>
                    <option value="story">Story</option>
                    <option value="video">Video</option>
                    <option value="live">Live Stream</option>
                    <option value="blog">Blog</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-gray-500">Quantity</label>
                    <input 
                      type="number"
                      min="1"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                      value={currentDeliverable.quantity}
                      onChange={(e) => setCurrentDeliverable({...currentDeliverable, quantity: Number(e.target.value)})}
                    />
                  </div>
                  
                  {['reel', 'video'].includes(currentDeliverable.type) && (
                    <div>
                      <label className="text-xs text-gray-500">Video Length</label>
                      <select
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                        value={currentDeliverable.videoLength}
                        onChange={(e) => setCurrentDeliverable({...currentDeliverable, videoLength: e.target.value})}
                      >
                        <option value="15-30">15-30 seconds</option>
                        <option value="30-60">30-60 seconds</option>
                        <option value="60-120">1-2 minutes</option>
                        <option value="180+">3+ minutes</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="text-xs text-gray-500 mb-1 block">Requirements</label>
                  <textarea
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm min-h-[60px]"
                    placeholder="Specific requirements for this deliverable..."
                    value={currentDeliverable.requirements.join('\n')}
                    onChange={(e) => setCurrentDeliverable({
                      ...currentDeliverable, 
                      requirements: e.target.value.split('\n').filter(r => r.trim())
                    })}
                  />
                </div>

                <button
                  type="button"
                  onClick={addDeliverable}
                  className="w-full py-2 bg-rose-500 text-white rounded-lg text-xs font-medium hover:bg-rose-600"
                >
                  Add Deliverable
                </button>
              </div>

              {/* Deliverables List */}
              {campaignData.deliverables.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium">Added Deliverables ({campaignData.deliverables.length})</h4>
                  {campaignData.deliverables.map((del, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        {getPlatformIcon(del.platform)}
                        <div>
                          <p className="text-sm font-medium">
                            {del.quantity}x {del.type} on {del.platform}
                          </p>
                          {del.videoLength && (
                            <p className="text-xs text-gray-500">{del.videoLength}s videos</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDeliverable(index)}
                        className="text-gray-400 hover:text-rose-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Custom Questions for Creators */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-medium mb-3">Custom Questions for Creators</h4>
                
                {/* Add Question Form */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-3">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Question Text</label>
                      <input 
                        type="text"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                        placeholder="Enter your question..."
                        value={currentQuestion.question}
                        onChange={(e) => setCurrentQuestion({...currentQuestion, question: e.target.value})}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Answer Type</label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                          value={currentQuestion.type}
                          onChange={(e) => setCurrentQuestion({...currentQuestion, type: e.target.value as any})}
                        >
                          <option value="text">Text</option>
                          <option value="multiple-choice">Multiple Choice</option>
                          <option value="yes-no">Yes/No</option>
                          <option value="rating">Rating</option>
                          <option value="file">File Upload</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center gap-2 pt-5">
                        <input 
                          type="checkbox"
                          id="questionRequired"
                          className="rounded border-gray-300"
                          checked={currentQuestion.required}
                          onChange={(e) => setCurrentQuestion({...currentQuestion, required: e.target.checked})}
                        />
                        <label htmlFor="questionRequired" className="text-xs text-gray-600">
                          Required
                        </label>
                      </div>
                    </div>
                    
                    {currentQuestion.type === 'multiple-choice' && (
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Options (one per line)</label>
                        <textarea
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                          placeholder="Option 1\nOption 2\nOption 3"
                          value={currentQuestion.options?.join('\n') || ''}
                          onChange={(e) => setCurrentQuestion({
                            ...currentQuestion, 
                            options: e.target.value.split('\n').filter(o => o.trim())
                          })}
                        />
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={addQuestion}
                      disabled={!currentQuestion.question.trim()}
                      className="w-full py-2 bg-rose-500 text-white rounded-lg text-xs font-medium hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Question
                    </button>
                  </div>
                </div>
                
                {/* Added Questions List */}
                {campaignData.customQuestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium">Added Questions ({campaignData.customQuestions.length})</h4>
                    {campaignData.customQuestions.map((q, index) => (
                      <div key={q.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{q.question}</p>
                          <p className="text-xs text-gray-500">
                            Type: {q.type} {q.required && '• Required'}
                            {q.options && q.options.length > 0 && ` • Options: ${q.options.join(', ')}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeQuestion(index)}
                          className="text-gray-400 hover:text-rose-500 ml-2"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Creative Assets */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-medium mb-3">Creative Assets (Optional)</h4>
                
                {/* Mood Board */}
                <div className="mb-3">
                  <label className="text-xs text-gray-500 mb-1 block">Mood Board / Inspiration</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'moodBoard')}
                      className="hidden"
                      id="moodBoard"
                    />
                    <label htmlFor="moodBoard" className="cursor-pointer">
                      {campaignData.moodBoard ? (
                        <div className="flex items-center justify-center gap-2 text-emerald-600">
                          <Image size={14} />
                          <span className="text-xs">{campaignData.moodBoard.name}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Click to upload mood board</p>
                      )}
                    </label>
                  </div>
                </div>

                {/* Brand Guidelines */}
                <div className="mb-3">
                  <label className="text-xs text-gray-500 mb-1 block">Brand Guidelines (PDF)</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileUpload(e, 'brandGuidelines')}
                      className="hidden"
                      id="brandGuidelines"
                    />
                    <label htmlFor="brandGuidelines" className="cursor-pointer">
                      {campaignData.brandGuidelines ? (
                        <div className="flex items-center justify-center gap-2 text-emerald-600">
                          <FileText size={14} />
                          <span className="text-xs">{campaignData.brandGuidelines.name}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Click to upload brand guidelines</p>
                      )}
                    </label>
                  </div>
                </div>

                {/* Shot List */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Shot List / Requirements (PDF)</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileUpload(e, 'shotList')}
                      className="hidden"
                      id="shotList"
                    />
                    <label htmlFor="shotList" className="cursor-pointer">
                      {campaignData.shotList ? (
                        <div className="flex items-center justify-center gap-2 text-emerald-600">
                          <FileText size={14} />
                          <span className="text-xs">{campaignData.shotList.name}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Click to upload shot list</p>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== STEP 5: REVIEW & LEGAL ===== */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Review & Legal</h3>
              
              {/* Campaign Summary */}
              <div className="bg-gray-900 rounded-lg p-4 text-white">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Campaign</p>
                    <p className="text-sm font-semibold">{campaignData.title || 'Untitled'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1">Budget</p>
                    <p className="text-sm font-semibold text-emerald-400">
                      {campaignData.currency} {campaignData.totalBudget.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400">Type</p>
                    <p className="capitalize">{campaignData.compensationType}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Creators</p>
                    <p>{campaignData.creatorCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Deadline</p>
                    <p>{campaignData.applicationDeadline || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Deliverables</p>
                    <p>{campaignData.deliverables.length}</p>
                  </div>
                </div>
              </div>

              {/* Usage Rights */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Usage Rights</label>
                <select 
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  value={campaignData.usageRights}
                  onChange={(e) => setCampaignData({...campaignData, usageRights: e.target.value as any})}
                >
                  <option value="perpetual">Perpetual (unlimited use)</option>
                  <option value="limited">Limited time (6 months)</option>
                  <option value="exclusive">Exclusive to brand</option>
                </select>
              </div>

              {campaignData.usageRights === 'limited' && (
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Exclusivity Period (months)</label>
                  <input 
                    type="number"
                    min="1"
                    max="24"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    value={campaignData.exclusivityMonths}
                    onChange={(e) => setCampaignData({...campaignData, exclusivityMonths: Number(e.target.value)})}
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="disclosureRequired"
                  className="rounded border-gray-300"
                  checked={campaignData.disclosureRequired}
                  onChange={(e) => setCampaignData({...campaignData, disclosureRequired: e.target.checked})}
                />
                <label htmlFor="disclosureRequired" className="text-xs text-gray-600">
                  Require #ad or #sponsored disclosure in all posts
                </label>
              </div>

              {/* Contract Upload */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Campaign Contract (Optional)</label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileUpload(e, 'contractFile')}
                    className="hidden"
                    id="contractFile"
                  />
                  <label htmlFor="contractFile" className="cursor-pointer">
                    {campaignData.contractFile ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-600">
                        <FileText size={14} />
                        <span className="text-xs">{campaignData.contractFile.name}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">Click to upload contract (optional)</p>
                    )}
                  </label>
                </div>
              </div>

              {/* Custom Terms */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Custom Terms (Optional)</label>
                <textarea 
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm min-h-[100px]"
                  placeholder="Add any additional terms, conditions, or requirements..."
                  value={campaignData.customTerms}
                  onChange={(e) => setCampaignData({...campaignData, customTerms: e.target.value})}
                />
              </div>

              {/* Vault Settings */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-medium mb-3">Vault Settings</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="requireVault"
                      className="rounded border-gray-300"
                      checked={campaignData.requireVault}
                      onChange={(e) => setCampaignData({...campaignData, requireVault: e.target.checked})}
                    />
                    <label htmlFor="requireVault" className="text-xs text-gray-600">
                      Require vault for payment security (recommended)
                    </label>
                  </div>

                  {campaignData.requireVault && (
                    <>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Dispute Window (days)</label>
                        <select 
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                          value={campaignData.disputeWindow}
                          onChange={(e) => setCampaignData({...campaignData, disputeWindow: Number(e.target.value)})}
                        >
                          <option value="3">3 days</option>
                          <option value="7">7 days</option>
                          <option value="14">14 days</option>
                          <option value="30">30 days</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Release Rule</label>
                        <select 
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                          value={campaignData.releaseRule}
                          onChange={(e) => setCampaignData({...campaignData, releaseRule: e.target.value})}
                        >
                          <option value="multi-sig">Multi-signature (Both parties)</option>
                          <option value="auto">Automatic (Time-based)</option>
                          <option value="oracle">Oracle-based (3rd party)</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Visibility */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Campaign Visibility</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={campaignData.visibility === 'public'}
                      onChange={(e) => setCampaignData({...campaignData, visibility: e.target.value as any})}
                      className="text-rose-500"
                    />
                    <span className="text-xs">Public</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio"
                      name="visibility"
                      value="private"
                      checked={campaignData.visibility === 'private'}
                      onChange={(e) => setCampaignData({...campaignData, visibility: e.target.value as any})}
                      className="text-rose-500"
                    />
                    <span className="text-xs">Private</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="px-4 py-2 text-xs text-gray-400 hover:text-gray-900 disabled:opacity-0"
            >
              <ArrowLeft size={14} className="inline mr-1" /> Back
            </button>
            
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 disabled:opacity-50
                ${currentStep === 5 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : 'bg-rose-500 hover:bg-rose-600 text-white'
                }`}
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={14} />
              ) : currentStep === 5 ? (
                <>Create Campaign & Fund Vault <ArrowRight size={14} /></>
              ) : (
                <>Continue <ChevronRight size={14} /></>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderViewMode = () => (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Campaign Details</h3>
      <p className="text-sm text-gray-500">View mode coming soon...</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-4xl rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 border border-gray-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-rose-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">
              {activeTab === 'apply' && 'Apply to Campaign'}
              {activeTab === 'create' && 'Create New Campaign'}
              {activeTab === 'view' && 'Campaign Details'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            {userRole === 'business' && activeTab === 'view' && (
              <button className="px-3 py-1.5 bg-rose-500 text-white text-xs font-medium rounded-lg hover:bg-rose-600">
                Edit Campaign
              </button>
            )}
            {userRole === 'business' && activeTab === 'create' && (
              <button className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200">
                Save as Draft
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        {submitted ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === 'apply' ? 'Application Submitted!' : 'Campaign Created!'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {activeTab === 'apply' 
                ? `Your pitch has been sent to ${campaign?.company_name || 'the brand'}`
                : 'Your campaign has been created. Now fund your vault to publish it.'}
            </p>
            <button 
              onClick={onClose}
              className="px-6 py-2.5 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'apply' && renderApplicationForm()}
            {activeTab === 'create' && renderCampaignCreationForm()}
            {activeTab === 'view' && renderViewMode()}
          </>
        )}
      </div>
    </div>
  );
}