'use client';

import { useState } from 'react';
import { 
  Loader2, CheckCircle2, 
  UserPlus,  AlertCircle, ArrowLeft, Link2
} from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InviteMemberModal({ isOpen, onClose, onSuccess }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('OPERATOR');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedPhrase, setGeneratedPhrase] = useState<string | null>(null);
  const [isAdoption, setIsAdoption] = useState(false); // New state to track if user was linked vs created

  if (!isOpen) return null;

  const getAuthToken = () => {
    return localStorage.getItem('enclave_token') || localStorage.getItem('access_token');
  };

  const handleSendInvite = async () => {
    if (!email || !fullName) {
      setErrorMessage("Identity details required.");
      return;
    }
    
    setIsSending(true);
    setErrorMessage(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const token = getAuthToken();

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          email: email.toLowerCase().trim(), 
          full_name: fullName,
          password: `TempPass!${Math.floor(Math.random() * 1000)}`,
          role: role.toLowerCase() 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Registration Protocol Rejected.");
      }

      // Check if this was an 'Adoption' of an existing user
      if (data.detail.includes("linked")) {
        setIsAdoption(true);
        setGeneratedPhrase(null); // No phrase for existing users
      } else {
        setIsAdoption(false);
        setGeneratedPhrase(data.recovery_phrase);
      }

      setSent(true);
      onSuccess(); 

    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1A1C21]/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden relative border border-slate-100">
        <div className={`h-2 w-full ${sent && isAdoption ? 'bg-blue-500' : 'bg-gradient-to-r from-rose-500 via-[#1A1C21] to-emerald-500'}`} />

        <div className="p-10 md:p-12">
          {!sent ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                 <button onClick={onClose} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#1A1C21]">
                    <ArrowLeft size={14} /> <span>Cancel Deployment</span>
                 </button>
              </div>

              <div className="space-y-2">
                <div className="w-12 h-12 bg-[#1A1C21] rounded-2xl flex items-center justify-center text-white mb-4">
                  <UserPlus size={20} />
                </div>
                <h2 className="text-2xl font-black text-[#1A1C21] tracking-tight">Provision Identity.</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  The system will either create a new operator or <span className="text-blue-600">adopt</span> an existing unattached identity.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Legal Full Name</label>
                  <input 
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-[#1A1C21]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-[#1A1C21]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Assigned Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['ADMIN', 'FINANCE', 'OPERATOR'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                          role === r ? 'bg-[#1A1C21] text-white shadow-md' : 'bg-white text-slate-400 border-slate-100'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600">
                  <AlertCircle size={16} />
                  <p className="text-[10px] font-black uppercase">{errorMessage}</p>
                </div>
              )}

              <button 
                onClick={handleSendInvite}
                disabled={isSending || !email || !fullName}
                className="w-full py-5 bg-[#1A1C21] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-600 transition-all flex items-center justify-center gap-3 shadow-xl"
              >
                {isSending ? <Loader2 size={16} className="animate-spin" /> : 'Execute Synchronization'}
              </button>
            </div>
          ) : (
            /* Success View */
            <div className="py-6 text-center space-y-6 animate-in zoom-in-95">
              <div className={`w-20 h-20 ${isAdoption ? 'bg-blue-500' : 'bg-emerald-500'} rounded-[32px] flex items-center justify-center mx-auto shadow-2xl`}>
                {isAdoption ? <Link2 size={36} className="text-white" /> : <CheckCircle2 size={36} className="text-white" />}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-[#1A1C21]">
                  {isAdoption ? 'Identity Linked.' : 'Personnel Created.'}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-8">
                  {isAdoption 
                    ? `Existing operator ${email} has been integrated into your Enclave.`
                    : `A new identity has been provisioned for ${email}.`}
                </p>
              </div>

              {!isAdoption && generatedPhrase && (
                <div className="bg-slate-50 p-6 rounded-[32px] border border-dashed border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest">Emergency Recovery Phrase</p>
                  <p className="text-xs font-mono font-bold text-[#1A1C21] leading-relaxed p-2 bg-white rounded-xl shadow-sm">
                    {generatedPhrase}
                  </p>
                  <p className="mt-4 text-[8px] font-bold text-rose-500 uppercase">Warning: Only visible once.</p>
                </div>
              )}

              {isAdoption && (
                <div className="p-4 bg-blue-50 rounded-2xl text-blue-700 text-[10px] font-bold uppercase tracking-widest">
                  User retains their original security credentials.
                </div>
              )}
              
              <button onClick={onClose} className="w-full py-4 text-[10px] font-black uppercase text-slate-400 hover:text-[#1A1C21] transition-colors">
                Return to Ledger
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}