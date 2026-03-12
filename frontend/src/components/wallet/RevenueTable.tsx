'use client';

import { ArrowDownLeft, Clock, ArrowUpRight, Inbox, ExternalLink } from 'lucide-react';

interface Transaction {
  id: number;
  vault_id: string;
  amount: number; // USD amount
  fee_amount: number;
  fee_percentage: number;
  timestamp: string;
  status: 'collected' | 'pending' | 'withdrawn';
}

interface RevenueTableProps {
  transactions: Transaction[];
  exchangeRate: number;
  onViewDetails?: (tx: Transaction) => void;
}

export const RevenueTable = ({ transactions, exchangeRate, onViewDetails }: RevenueTableProps) => {
  
  const formatKES = (usd: number = 0) => 
    `KES ${(usd * exchangeRate).toLocaleString(undefined, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })}`;

  const formatSmallUSD = (usd: number = 0) => 
    `$${usd.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;

  const getStatusStyles = (status: string) => {
    switch(status) {
      case 'collected':
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-100',
          icon: 'text-emerald-600'
        };
      case 'pending':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-100',
          icon: 'text-amber-600'
        };
      case 'withdrawn':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-600',
          border: 'border-gray-200',
          icon: 'text-gray-500'
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-600',
          border: 'border-gray-100',
          icon: 'text-gray-400'
        };
    }
  };

  return (
    <div className="w-full bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-xs font-medium text-gray-500">Type</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500">Vault</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500">Gross Amount</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500">Platform Fee</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500">Status</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions && transactions.length > 0 ? (
              transactions.map((tx) => {
                const statusStyles = getStatusStyles(tx.status);
                
                return (
                  <tr 
                    key={tx.id} 
                    onClick={() => onViewDetails?.(tx)}
                    className={`group transition-all ${
                      onViewDetails ? 'cursor-pointer hover:bg-gray-50' : 'hover:bg-gray-50/50'
                    }`}
                  >
                    {/* Type Icon */}
                    <td className="px-5 py-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${statusStyles.bg} ${statusStyles.icon}`}>
                        {tx.status === 'collected' ? <ArrowDownLeft size={16} /> : 
                         tx.status === 'withdrawn' ? <ArrowUpRight size={16} /> : 
                         <Clock size={16} />}
                      </div>
                    </td>
                    
                    {/* Vault Reference */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-gray-900">
                          {tx.vault_id ? `${tx.vault_id.slice(0, 6)}...${tx.vault_id.slice(-4)}` : 'N/A'}
                        </span>
                        {onViewDetails && (
                          <ExternalLink size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </td>

                    {/* Gross Amount */}
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{formatKES(tx.amount)}</p>
                        <p className="text-xs text-gray-400">{formatSmallUSD(tx.amount)}</p>
                      </div>
                    </td>

                    {/* Platform Fee */}
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-rose-600">-{formatKES(tx.fee_amount)}</p>
                        <p className="text-xs text-gray-400">{tx.fee_percentage}% fee</p>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles.bg} ${statusStyles.text} border ${statusStyles.border}`}>
                        {tx.status}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-right">
                      <div>
                        <p className="text-sm text-gray-700">
                          {new Date(tx.timestamp).toLocaleDateString(undefined, { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(tx.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <Inbox size={32} className="text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">No revenue data available</p>
                    <p className="text-xs text-gray-400 mt-1">Transactions will appear here once processed</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};