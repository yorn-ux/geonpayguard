'use client';

import { Megaphone, Building2, Check, Sparkles, Info } from 'lucide-react';

export type UserRole = 'INFLUENCER' | 'BUSINESS';

interface PartnerTypeSelectorProps {
  selectedRole: UserRole;
  onChange: (role: UserRole) => void;
}

const roles: { id: UserRole; label: string; icon: any; description: string; tag?: string; tagColor?: string }[] = [
  { 
    id: 'INFLUENCER', 
    label: 'Influencer / Individual', // Updated to include normal users
    icon: Megaphone, 
    description: 'Personal vaults for creators, talent, and standard individual accounts.',
    tag: 'Creator Protocol',
    tagColor: 'bg-rose-100 text-rose-600'
  },
  { 
    id: 'BUSINESS', 
    label: 'Business', 
    icon: Building2, 
    description: 'Enterprise-grade accounts for brands, agencies, and corporations.',
    tag: 'Enterprise Protocol',
    tagColor: 'bg-slate-100 text-slate-500' 
  },
];

export function PartnerTypeSelector({ selectedRole, onChange }: PartnerTypeSelectorProps) {
  return (
    <div className="space-y-6 mb-10">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
          Select Account Protocol
        </label>
        <span className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter flex items-center gap-1">
          <Sparkles size={10} /> Identity Verification Required
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role) => {
          const Icon = role.icon;
          const isActive = selectedRole === role.id;
          
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onChange(role.id)}
              className={`flex flex-col p-6 rounded-[32px] border-2 transition-all text-left relative overflow-hidden group active:scale-[0.97] ${
                isActive 
                  ? 'border-[#1A1C21] bg-[#1A1C21]/[0.02] shadow-xl shadow-slate-200/50' 
                  : 'border-slate-100 bg-white hover:border-rose-100 hover:shadow-lg hover:shadow-slate-100'
              }`}
            >
              <div className="flex justify-between items-start mb-8 w-full">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                  isActive 
                    ? 'bg-[#1A1C21] text-white' 
                    : 'bg-slate-50 text-slate-400 group-hover:text-rose-600 group-hover:bg-rose-50'
                }`}>
                  <Icon size={22} />
                </div>

                {isActive ? (
                  <div className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center animate-in zoom-in duration-300">
                    <Check className="text-white" size={14} strokeWidth={4} />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-slate-100 group-hover:border-rose-200 transition-colors" />
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <p className={`text-[13px] font-black uppercase tracking-widest ${
                    isActive ? 'text-[#1A1C21]' : 'text-slate-600'
                  }`}>
                    {role.label}
                  </p>
                  {role.tag && (
                    <span className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-widest rounded transition-all ${
                      isActive ? 'bg-[#1A1C21] text-white' : role.tagColor
                    }`}>
                      {role.tag}
                    </span>
                  )}
                </div>
                <p className={`text-[11px] leading-relaxed font-medium ${
                  isActive ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {role.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Protocol Comparison Sub-component */}
      <div className="mt-8 rounded-[24px] border border-slate-100 bg-slate-50/50 overflow-hidden">
        <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-2">
           <Info size={14} className="text-slate-400" />
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocol Comparison</span>
        </div>
        <table className="w-full text-[10px] text-left border-collapse">
          <thead>
            <tr className="text-slate-400 font-bold uppercase tracking-tighter">
              <th className="p-3 pl-5">Feature</th>
              <th className="p-3 text-rose-600">Influencer</th>
              <th className="p-3">Business</th>
            </tr>
          </thead>
          <tbody className="text-slate-600 font-medium">
            <tr className="border-t border-slate-100">
              <td className="p-3 pl-5 text-slate-400 font-bold">Best For</td>
              <td className="p-3">Individuals & Creators</td>
              <td className="p-3">Agencies & Brands</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="p-3 pl-5 text-slate-400 font-bold">Payments</td>
              <td className="p-3">Receive & Withdraw</td>
              <td className="p-3">Mass Payroll & Escrow</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}