'use client';

// --- TYPES ---
interface Stats {
  total: number;
  active: number;
  inactive: number;
  admins: number;
}

interface StatGridProps {
  stats: Stats;
  isDark: boolean;
}

export const StatGrid = ({ stats, isDark }: StatGridProps) => {
  // Mapping to PayGuard Institutional Palette
  const items = [
    { 
      label: 'Total Partners', 
      value: stats.total, 
      textColor: 'text-[#1A1C21]', 
      accentColor: 'bg-[#1A1C21]',
      subLabel: 'Registered Entities' 
    },
    { 
      label: 'Active Sync', 
      value: stats.active, 
      textColor: 'text-emerald-500', 
      accentColor: 'bg-emerald-500',
      subLabel: 'Verified Online' 
    },
    { 
      label: 'Suspended', 
      value: stats.inactive, 
      textColor: 'text-rose-600', 
      accentColor: 'bg-rose-600',
      subLabel: 'Clearance Revoked' 
    },
    { 
      label: 'System Admins', 
      value: stats.admins, 
      textColor: 'text-rose-600', 
      accentColor: 'bg-rose-600',
      subLabel: 'Root Access' 
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((s) => (
        <div 
          key={s.label} 
          className={`group p-8 rounded-[40px] border-2 transition-all duration-500 hover:-translate-y-1 ${
            isDark 
              ? 'bg-[#111214] border-white/5 shadow-2xl' 
              : 'bg-white border-slate-50 shadow-sm hover:shadow-xl hover:shadow-slate-200/50'
          }`}
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-rose-600 transition-colors">
                {s.label}
              </p>
              <div className={`w-1.5 h-1.5 rounded-full ${s.accentColor} ${s.value > 0 ? 'animate-pulse shadow-[0_0_8px_currentColor]' : 'opacity-20'}`} />
            </div>
            
            <div className="flex items-baseline gap-2">
              <p className={`text-5xl font-black italic tracking-tighter leading-none ${isDark && s.textColor === 'text-[#1A1C21]' ? 'text-white' : s.textColor}`}>
                {s.value.toLocaleString()}
              </p>
            </div>
            
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {s.subLabel}
            </p>
          </div>
          
          {/* PayGuard Forensic Progress Bar */}
          <div className="mt-8 relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${s.accentColor}`} 
              style={{ 
                width: stats.total > 0 ? `${(s.value / stats.total) * 100}%` : '0%',
                opacity: stats.total > 0 ? 1 : 0.1
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};