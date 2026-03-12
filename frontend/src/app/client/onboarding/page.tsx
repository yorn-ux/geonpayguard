'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ShieldCheck, FileText, CheckCircle2, Loader2, 
  Lock, MapPin, UploadCloud, ArrowLeft,
  UserCheck, ChevronRight, Briefcase,
  AlertCircle, Clock, XCircle, RotateCcw
} from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';

export default function OnboardingKYC() {
  const { showToast } = useNotificationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [kycStep, setKycStep] = useState(1);
  const [isSyncing, setIsSyncing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [mounted, setMounted] = useState(false);
  const [operatorId, setOperatorId] = useState('...');
  const [kycStatus, setKycStatus] = useState('UNVERIFIED');
  const [kycNotes, setKycNotes] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const syncIdentity = useCallback(async (opId: string) => {
    const token = localStorage.getItem('auth_token');
    
    if (!API_URL || opId === 'N/A' || !token) {
      setIsSyncing(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/me?operator_id=${opId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!res.ok) throw new Error("Identity sync rejected by protocol");
      
      const data = await res.json();
      
      const status = data.kyc_status || 'UNVERIFIED';
      setKycStatus(status);
      setKycNotes(data.kyc_notes || "Your documentation is currently in the verification queue.");
      
      if (status === 'VERIFIED') setKycStep(5);
      else if (status === 'UNDER_REVIEW' || status === 'PENDING') setKycStep(4);
      else if (status === 'REJECTED') setKycStep(6);
      else setKycStep(1);

    } catch (err) {
      console.error("Identity sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [API_URL]);

  useEffect(() => {
    setMounted(true);
    const storedUser = localStorage.getItem('geon_user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        const opId = userData.operator_id || userData.id || 'N/A';
        setOperatorId(opId);
        syncIdentity(opId);
      } catch (error) {
        setIsSyncing(false);
      }
    } else {
      setIsSyncing(false);
    }
  }, [syncIdentity]);

  if (!mounted) return null;

  if (isSyncing) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-gray-500 font-medium italic">Handshaking with Sovereign Node...</p>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        showToast("File size exceeds 15MB limit", "error");
        return;
      }
      setIdFile(file);
    }
  };

  const submitKYC = async () => {
    if (!idFile || !operatorId || !selectedDocType) {
      showToast("Please complete all fields", "error");
      return;
    }
    
    setIsProcessing(true);
    
    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('document', idFile);
    formData.append('operator_id', operatorId);
    formData.append('doc_type', selectedDocType);

    try {
      // UPDATED: Using the exact route from your backend
      const response = await fetch(`${API_URL}/api/v1/auth/verify`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
          // Note: Don't set Content-Type header when sending FormData
          // The browser will automatically set it with the correct boundary
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Transmission Error");
      }

      showToast(data.detail || "Documentation submitted successfully", "success");
      
      // Update local state with the response
      setKycStatus(data.kyc_status || 'UNDER_REVIEW');
      setKycStep(4);
      
      // Optionally update stored user data
      const storedUser = localStorage.getItem('geon_user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        userData.kyc_status = data.kyc_status || 'UNDER_REVIEW';
        localStorage.setItem('geon_user', JSON.stringify(userData));
      }
      
    } catch (error: any) {
      console.error("KYC submission error:", error);
      showToast(error.message || "Submission failed", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Identity Verification</h1>
        <p className="text-gray-500 text-sm mt-1">Verify your node ownership to enable withdrawals.</p>
        
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-100 text-[11px] font-bold bg-gray-50 text-gray-500 shadow-sm">
          <Briefcase size={12} className="text-blue-500" /> 
          PROTOCOL ID: <span className="text-gray-900">{operatorId}</span> 
          <span className="text-gray-300 mx-1">|</span>
          STATUS: <span className={`uppercase ${
            kycStatus === 'VERIFIED' ? 'text-green-600' : 
            kycStatus === 'REJECTED' ? 'text-red-600' :
            kycStatus === 'UNDER_REVIEW' ? 'text-amber-600' : 'text-gray-600'
          }`}>
            {kycStatus.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-100 overflow-hidden">
        
        {/* STEP 1: DOCUMENT SELECT */}
        {kycStep === 1 && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Select Government Document</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'ID_CARD', label: 'National ID / IPRS Card', icon: FileText, desc: 'Kenya National Identity Card' },
                { id: 'PASSPORT', label: 'International Passport', icon: ShieldCheck, desc: 'Valid e-Passport Book' }
              ].map((doc) => (
                <button 
                  key={doc.id}
                  onClick={() => { setSelectedDocType(doc.id); setKycStep(2); }}
                  className="w-full p-4 flex items-center justify-between border border-gray-100 rounded-xl hover:bg-blue-50/50 hover:border-blue-200 transition-all group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-white transition-colors">
                      <doc.icon className="text-blue-600" size={20} />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800 text-sm">{doc.label}</p>
                        <p className="text-[11px] text-gray-400">{doc.desc}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-600 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: UPLOAD */}
        {kycStep === 2 && (
          <div className="p-6">
            <button onClick={() => setKycStep(1)} className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-blue-600 mb-6 transition-colors uppercase tracking-widest">
              <ArrowLeft size={14} /> Back to selection
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-1">Upload {selectedDocType.replace('_', ' ')}</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">Please upload a high-resolution scan or photo. All details must be legible without glare.</p>
            
            <input type="file" accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl py-14 flex flex-col items-center justify-center cursor-pointer transition-all ${
                idFile ? 'border-green-400 bg-green-50/30' : 'border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/30'
              }`}
            >
              {idFile ? (
                <>
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="text-sm font-bold text-gray-800">{idFile.name}</p>
                  <p className="text-[11px] text-green-600 font-bold mt-1 uppercase">Ready for transmission</p>
                </>
              ) : (
                <>
                  <UploadCloud size={40} className="text-gray-300 mb-3" />
                  <p className="text-sm font-bold text-gray-600">Click to select document</p>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tighter">MAX SIZE: 15MB • PDF, PNG, JPG</p>
                </>
              )}
            </div>

            <button 
              onClick={() => setKycStep(3)}
              disabled={!idFile}
              className="w-full mt-8 bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-100"
            >
              Continue to Encryption
            </button>
          </div>
        )}

        {/* STEP 3: CONFIRM */}
        {kycStep === 3 && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
              <Lock size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Final Security Check</h3>
            <p className="text-sm text-gray-500 mt-3 mb-10 px-6 leading-relaxed">
                By proceeding, your document will be encrypted using <strong>AES-256 GCM</strong> before being transmitted to the compliance node.
            </p>
            <div className="space-y-3">
                <button 
                onClick={submitKYC}
                disabled={isProcessing}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-3 shadow-xl shadow-blue-100 transition-all active:scale-[0.98]"
                >
                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <UserCheck size={20} />}
                {isProcessing ? "Processing..." : "Initiate Verification"}
                </button>
                <button 
                onClick={() => setKycStep(2)}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest py-2"
                >
                Re-check document
                </button>
            </div>
          </div>
        )}

        {/* STEP 4: PENDING */}
        {kycStep === 4 && (
          <div className="p-12 text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
                <Clock size={80} className="text-amber-100 absolute inset-0" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={32} className="text-amber-500 animate-spin" />
                </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Manual Review in Progress</h3>
            <p className="text-sm text-gray-500 mt-3 max-w-xs mx-auto leading-relaxed">
                Our compliance team is verifying your credentials. You will receive a notification once the review is complete.
            </p>
            <div className="mt-8 pt-8 border-t border-gray-50">
                <button onClick={() => window.location.reload()} className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center justify-center gap-2 mx-auto">
                    <RotateCcw size={14} /> Refresh Status
                </button>
            </div>
          </div>
        )}

        {/* STEP 5: SUCCESS */}
        {kycStep === 5 && (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Protocol Verified</h3>
            <p className="text-sm text-gray-500 mt-3 mb-10 leading-relaxed">
                Your identity has been authenticated. All withdrawal limits and business features have been unlocked.
            </p>
            <button 
                onClick={() => window.location.href = '/dashboard'} 
                className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-all shadow-xl shadow-gray-200"
            >
              Enter Dashboard
            </button>
          </div>
        )}

        {/* STEP 6: REJECTED */}
        {kycStep === 6 && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Verification Rejected</h3>
            <div className="bg-red-50/50 text-red-700 text-xs p-5 rounded-xl my-8 text-left border border-red-100/50 leading-relaxed">
              <div className="flex gap-2 items-center font-black mb-2 uppercase tracking-tighter">
                <AlertCircle size={14} /> Compliance Feedback:
              </div>
              {kycNotes || "The submitted documentation could not be verified. Please ensure all details are legible and try again."}
            </div>
            <button 
                onClick={() => setKycStep(1)} 
                className="w-full bg-red-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-red-700 shadow-xl shadow-red-100 transition-all"
            >
              <RotateCcw size={18} /> Restart Submission
            </button>
          </div>
        )}

        {/* FOOTER */}
        <div className="bg-gray-50/50 px-6 py-4 border-t border-gray-100 flex items-center justify-between text-gray-400">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest font-black">
            <Lock size={12} className="text-gray-300" /> End-to-End Encrypted
          </div>
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest font-black">
            <MapPin size={12} className="text-gray-300" /> Sovereign Node Synced
          </div>
        </div>
      </div>
    </div>
  );
}