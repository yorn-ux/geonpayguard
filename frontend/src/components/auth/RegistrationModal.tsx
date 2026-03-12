'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, User, Mail, Lock, Loader2, CheckCircle, 
  Users, Briefcase, ShieldCheck, Copy, Check, Fingerprint 
} from 'lucide-react';

export type AccountRole = 'business' | 'influencer' | 'admin';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onRegister: (formData: any) => Promise<any>;
}

export const RegistrationModal = ({ isOpen, onClose, isDark, onRegister }: RegistrationModalProps) => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [successData, setSuccessData] = useState<{phrase: string; id: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'influencer' as AccountRole,
  });

  useEffect(() => {
    if (!isOpen) {
      setSuccessData(null);
      setCopied(false);
      setError(null);
      setFormData({
        full_name: '',
        email: '',
        password: '',
        role: 'influencer',
      });
    }
  }, [isOpen]);

  const handleCopy = () => {
    if (successData?.phrase) {
      navigator.clipboard.writeText(successData.phrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await onRegister(formData);
      if (result && result.recovery_phrase) {
        setSuccessData({
          phrase: result.recovery_phrase,
          id: result.operator_id
        });
      } else {
        setError("System rejected: Recovery phrase not generated");
      }
    } catch (err: any) {
      setError(err.message || "Enrollment failed. Network error.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const styles = {
    overlay: "fixed inset-0 z-[700] flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/60 transition-opacity",
    modal: `w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[95vh] ${
      isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-200'
    }`,
    input: `w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all text-sm ${
      isDark 
        ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500' 
        : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-blue-600'
    }`,
    label: `text-[11px] font-bold uppercase tracking-wider mb-2 ml-1 block ${isDark ? 'text-slate-500' : 'text-gray-500'}`
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        
        {/* HEADER */}
        <div className="p-8 pb-4 flex justify-between items-center border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Fingerprint size={18} className="text-white" />
            </div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {successData ? 'Account Initialized' : 'Enroll New Partner'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-8 overflow-y-auto">
          {!successData ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold uppercase tracking-wide text-center">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className={styles.label}>Legal Name / Entity</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" required placeholder="e.g. John Doe or Acme Corp"
                      className={styles.input} value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className={styles.label}>Identity Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="email" required placeholder="operator@domain.com"
                      className={styles.input} value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className={styles.label}>Initial Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="password" required placeholder="••••••••••••"
                      className={styles.input} value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className={styles.label}>Clearance Level</label>
                <div className="grid grid-cols-2 gap-3">
                  <RoleOption 
                    selected={formData.role === 'influencer'} 
                    onClick={() => setFormData({...formData, role: 'influencer'})}
                    icon={Users} title="Influencer"
                    isDark={isDark}
                  />
                  <RoleOption 
                    selected={formData.role === 'business'} 
                    onClick={() => setFormData({...formData, role: 'business'})}
                    icon={Briefcase} title="Business"
                    isDark={isDark}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gray-900 hover:bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                {loading ? 'Creating Account...' : 'Authorize Registration'}
              </button>
            </form>
          ) : (
            /* SUCCESS VIEW */
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle size={32} />
              </div>
              
              <div>
                <h3 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Record Created Successfully
                </h3>
                <p className="text-xs text-gray-500 font-medium">Clearance ID: {successData.id}</p>
              </div>
              
              <div className={`p-6 rounded-xl border border-dashed relative ${
                isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-300'
              }`}>
                <p className="text-blue-600 font-mono text-sm break-words px-4 font-bold leading-relaxed">
                  {successData.phrase}
                </p>
                <button 
                  onClick={handleCopy}
                  className="absolute -top-3 -right-3 w-10 h-10 rounded-lg flex items-center justify-center bg-gray-900 text-white shadow-lg hover:scale-105 transition-all"
                  title="Copy Phrase"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-[10px] text-amber-800 font-bold uppercase tracking-tight leading-normal">
                  Important: This recovery phrase is non-recoverable. Provide this to the operator securely. If lost, the account access cannot be restored.
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RoleOption = ({ selected, onClick, icon: Icon, title, isDark }: any) => (
  <div 
    onClick={onClick}
    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center gap-2 ${
      selected 
        ? 'border-blue-600 bg-blue-50/50 shadow-sm' 
        : isDark ? 'border-slate-800 bg-slate-900 hover:border-slate-700' : 'border-gray-200 bg-white hover:border-gray-300'
    }`}
  >
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
      selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
    }`}>
      <Icon size={20} />
    </div>
    <p className={`text-[11px] font-bold uppercase tracking-wider ${selected ? 'text-blue-600' : 'text-gray-500'}`}>
      {title}
    </p>
  </div>
);