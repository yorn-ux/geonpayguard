'use client';

import { 
  Mail, CheckCircle, ShieldCheck, 
  UserCog, Eye, ChevronLeft, ChevronRight, 
  ShieldAlert, Trash2, Ban 
} from 'lucide-react';

export interface Operator {
  id: number;
  operator_id: string;
  full_name: string;
  email: string;
  is_verified: boolean;
  is_active?: boolean;
  role: 'admin' | 'business' | 'influencer'; 
}

interface Pagination {
  page: number;
  total: number;
  totalPages: number;
}

interface OperatorTableProps {
  operators: Operator[];
  isDark: boolean;
  pagination: Pagination;
  onPageChange: (page: number) => void;
  onAction: (id: string, action: 'suspend' | 'activate' | 'delete') => void;
  onViewProfile: (operator: Operator) => void;
  onToggleAdmin: (id: string, isPromoting: boolean) => void;
}

export const OperatorTable = ({ 
  operators, 
  isDark, 
  pagination, 
  onPageChange, 
  onAction, 
  onViewProfile,
  onToggleAdmin 
}: OperatorTableProps) => {
  
  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-sm'
    }`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={`${isDark ? 'bg-slate-800/50' : 'bg-gray-50'} text-[11px] font-bold uppercase tracking-wider text-gray-500`}>
              <th className="px-6 py-4">Operator Identity</th>
              <th className="px-6 py-4">Contact Information</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Access Level</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-gray-100'}`}>
            {operators.length > 0 ? (
              operators.map((op, index) => {
                const isAdmin = op.role === 'admin';
                
                return (
                  <tr key={op.operator_id || index} className="hover:bg-gray-50/50 transition-colors group">
                    {/* IDENTITY */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {op.full_name}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400 uppercase">
                          {op.operator_id}
                        </span>
                      </div>
                    </td>

                    {/* CONTACT */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Mail size={14} className="text-gray-400" />
                        <span className="text-xs font-medium">{op.email}</span>
                      </div>
                    </td>

                    {/* VERIFICATION STATUS */}
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                        op.is_verified 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {op.is_verified ? <CheckCircle size={12}/> : <ShieldAlert size={12}/>}
                        {op.is_verified ? 'Verified' : 'Pending'}
                      </div>
                    </td>

                    {/* ROLE / PRIVILEGES */}
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => onToggleAdmin(op.operator_id, !isAdmin)} 
                        className={`flex items-center gap-2 px-3 py-1 rounded-md text-[10px] font-bold uppercase border transition-all ${
                          isAdmin 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {isAdmin ? <ShieldCheck size={12}/> : <UserCog size={12}/>}
                        {op.role}
                      </button>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-1">
                        <button 
                          onClick={() => onViewProfile(op)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                          title="View Profile"
                        >
                          <Eye size={16} />
                        </button>

                        <button 
                          onClick={() => onAction(op.operator_id, 'suspend')}
                          className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          title="Suspend Operator"
                        >
                          <Ban size={16} />
                        </button>

                        <button 
                          onClick={() => onAction(op.operator_id, 'delete')}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Purge Record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium text-xs uppercase tracking-widest">
                  No records found in the current directory
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* PAGINATION */}
      <div className={`px-6 py-4 flex justify-between items-center border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
           Registry v2.0 • {operators.length} Active Records
         </span>
         <div className="flex gap-2">
            <button 
              onClick={() => onPageChange(pagination.page - 1)} 
              disabled={pagination.page <= 1} 
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronLeft size={16} className="text-gray-600"/>
            </button>
            <button 
              onClick={() => onPageChange(pagination.page + 1)} 
              disabled={pagination.page >= pagination.totalPages} 
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronRight size={16} className="text-gray-600"/>
            </button>
         </div>
      </div>
    </div>
  );
};