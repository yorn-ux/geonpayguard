'use client';

import { useState } from 'react';
import { 
  Lock, Eye, EyeOff, 
  Fingerprint, Copy, Check, 
  ShieldAlert,
  Database
} from 'lucide-react';

export const SecuritySection = ({ isDark, userData }: any) => {
  const [showPass, setShowPass] = useState({ current: false, new: false });
  const [] = useState({ current: '', new: '' });
  const [] = useState(false);
  const [showSeed, setShowSeed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Theme Styles
  const cardBg = isDark ? 'bg-[#161618] border-[#27272a]' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-[#1c1c1f] border-[#27272a] text-white' : 'bg-slate-50 border-slate-200 text-slate-900';
  const labelColor = isDark ? 'text-slate-500' : 'text-slate-400';

  const handleCopy = () => {
    navigator.clipboard.writeText(userData.recovery_phrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* COLUMN 1: IDENTITY DATA */}
      <div className="lg:col-span-1 space-y-8">
        <section className={`${cardBg} p-8 rounded-[2.5rem] border shadow-xl`}>
          <h2 className="text-[10px] font-black uppercase tracking-widest mb-8 flex items-center gap-2 dark:text-white">
            <Fingerprint size={14} className="text-blue-500" /> Identity Ledger
          </h2>
          
          <div className="space-y-6">
            <IdentityItem 
              label="Operator" 
              value={userData.full_name || 'Root Admin'} 
              isDark={isDark} 
            />
            <IdentityItem 
              label="Node ID" 
              value={userData.operator_id} 
              isDark={isDark} 
              mono 
            />
            
            <div className={`mt-6 p-4 rounded-2xl border ${isDark ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Database size={12} className="text-blue-500" />
                <p className="text-[9px] font-black uppercase text-blue-500">Recovery Status</p>
              </div>
              <p className="text-[11px] font-bold dark:text-blue-200">
                {userData.recovery_phrase ? 'Vault Key Generated' : 'Key Generation Required'}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* COLUMN 2: SECURITY PROTOCOLS */}
      <div className="lg:col-span-2 space-y-8">
        
        {/* PASSWORD CHANGE CARD */}
        <section className={`${cardBg} p-8 md:p-10 rounded-[2.5rem] border shadow-xl`}>
          <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-8 dark:text-white">
            <Lock size={16} className="text-blue-500" /> Master Access Key
          </h2>

          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase ml-1 ${labelColor}`}>Current Key</label>
                <div className="relative">
                  <input 
                    type={showPass.current ? "text" : "password"} 
                    className={`w-full p-4 pr-12 rounded-2xl border font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all ${inputBg}`}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPass({...showPass, current: !showPass.current})} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40">
                    {showPass.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase ml-1 ${labelColor}`}>New Access Key</label>
                <div className="relative">
                  <input 
                    type={showPass.new ? "text" : "password"} 
                    className={`w-full p-4 pr-12 rounded-2xl border font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all ${inputBg}`}
                    placeholder="Min 8 Characters"
                  />
                  <button type="button" onClick={() => setShowPass({...showPass, new: !showPass.new})} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40">
                    {showPass.new ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
            
            <button className="px-10 py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg hover:bg-blue-700 transition-all">
              Rotate Access Keys
            </button>
          </form>
        </section>

        {/* RECOVERY PHRASE CARD */}
        <section className={`${isDark ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'} p-8 rounded-[2.5rem] border`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <h3 className="text-indigo-600 dark:text-indigo-400 font-black uppercase text-sm flex items-center gap-2">
                <ShieldAlert size={18} /> Recovery Phrase
              </h3>
              <p className={`text-[10px] font-bold uppercase ${isDark ? 'text-indigo-300/60' : 'text-indigo-800/60'}`}>
                Sensitive hardware-level recovery seed. Do not share.
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowSeed(!showSeed)}
                className="px-6 py-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase rounded-xl transition-all"
              >
                {showSeed ? 'Obscure Seed' : 'Reveal Seed'}
              </button>
              
              {showSeed && (
                <button onClick={handleCopy} className="p-3 bg-indigo-600 text-white rounded-xl">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              )}
            </div>
          </div>

          {showSeed && (
            <div className={`mt-6 p-6 rounded-3xl border-2 border-dashed font-mono text-sm break-all leading-loose text-center ${isDark ? 'bg-slate-950 border-indigo-500/30 text-indigo-300' : 'bg-white border-indigo-200 text-indigo-600'}`}>
              {userData.recovery_phrase || 'PROTOCOL_SEED_NOT_LOADED'}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

// Internal Helper
const IdentityItem = ({ label, value, isDark, mono }: any) => (
  <div>
    <p className={`text-[9px] font-black uppercase mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
    <p className={`text-xs font-black dark:text-white ${mono ? 'font-mono tracking-tighter' : ''}`}>{value || 'N/A'}</p>
  </div>
);