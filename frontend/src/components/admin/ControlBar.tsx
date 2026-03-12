'use client';

import { Search, UserPlus,  } from 'lucide-react';

// --- TYPES ---
interface Filters {
  status: string;
  role: string;
}

interface ControlBarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filters: Filters;
  setFilters: (filters: any) => void; // Expects a partial update
  onOpenModal: () => void;
  isDark: boolean;
}

export const ControlBar = ({ 
  searchTerm, 
  setSearchTerm, 
  filters, 
  setFilters, 
  onOpenModal, 
  isDark 
}: ControlBarProps) => {

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters({ [key]: value === 'all' ? '' : value });
  };

  const selectClasses = `px-6 py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-wider outline-none transition-all cursor-pointer appearance-none ${
    isDark 
      ? 'bg-[#161618] border-white/5 text-slate-400 focus:border-indigo-500/50' 
      : 'bg-white border-slate-100 text-slate-600 focus:border-indigo-500 shadow-sm'
  }`;

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* SEARCH INPUT */}
      <div className="flex-1 relative group">
        <Search 
          className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" 
          size={18} 
        />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, ID, or email..." 
          className={`w-full pl-14 pr-6 py-4 rounded-3xl border-2 outline-none transition-all font-bold ${
            isDark 
              ? 'bg-[#161618] border-white/5 text-white focus:border-indigo-500' 
              : 'bg-white border-slate-100 focus:border-indigo-500 shadow-sm'
          }`}
        />
      </div>

      <div className="flex flex-wrap md:flex-nowrap gap-3">
        {/* ROLE FILTER */}
        <div className="relative">
          <select 
            value={filters.role || 'all'}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            className={selectClasses}
          >
            <option value="all">All Roles</option>
            <option value="influencer">Influencers</option>
            <option value="business">Businesses</option>
            <option value="operator">Operators</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        {/* STATUS FILTER */}
        <div className="relative">
          <select 
            value={filters.status || 'all'}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className={selectClasses}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* CREATE BUTTON */}
        <button 
          onClick={onOpenModal} 
          className="px-8 py-4 bg-indigo-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-[0.15em] flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
        >
          <UserPlus size={16} /> New Partner
        </button>
      </div>
    </div>
  );
};