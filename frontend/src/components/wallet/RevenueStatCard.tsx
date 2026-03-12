'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subValue?: string;
  icon: LucideIcon;
  highlight?: boolean;
  loading?: boolean;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export const RevenueStatCard = ({ 
  label, 
  value, 
  subValue, 
  icon: Icon, 
  highlight = false,
  loading = false,
  trend,
  trendValue,
  className = ''
}: StatCardProps) => {
  
  const getTrendColor = () => {
    if (trend === 'up') return 'text-emerald-600';
    if (trend === 'down') return 'text-rose-600';
    return 'text-gray-400';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  return (
    <div className={`relative p-6 rounded-xl border transition-all duration-200 ${
      highlight 
        ? 'bg-gradient-to-br from-purple-600 to-purple-700 border-purple-600 shadow-sm' 
        : 'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'
    } ${className}`}>
      
      {/* Header with Label and Icon */}
      <div className="flex items-start justify-between mb-3">
        <p className={`text-xs font-medium uppercase tracking-wider ${
          highlight ? 'text-purple-100' : 'text-gray-500'
        }`}>
          {label}
        </p>
        
        <div className={`p-2 rounded-lg ${
          highlight ? 'bg-white/10 text-white' : 'bg-gray-50 text-gray-500'
        }`}>
          {loading ? (
            <div className={`w-4 h-4 rounded-full ${
              highlight ? 'bg-purple-400' : 'bg-gray-200'
            } animate-pulse`} />
          ) : (
            <Icon size={16} strokeWidth={1.5} />
          )}
        </div>
      </div>

      {/* Main Value */}
      <div className="mb-2">
        {loading ? (
          <div className={`h-8 w-32 rounded ${
            highlight ? 'bg-purple-500' : 'bg-gray-200'
          } animate-pulse`} />
        ) : (
          <div className={`text-2xl font-semibold tracking-tight ${
            highlight ? 'text-white' : 'text-gray-900'
          }`}>
            {value}
          </div>
        )}
      </div>

      {/* Sub-value and Trend */}
      <div className="flex items-center gap-3">
        {loading ? (
          <div className={`h-4 w-20 rounded ${
            highlight ? 'bg-purple-500' : 'bg-gray-200'
          } animate-pulse`} />
        ) : subValue && (
          <p className={`text-xs ${
            highlight ? 'text-purple-200' : 'text-gray-500'
          }`}>
            {subValue}
          </p>
        )}

        {trend && trendValue && !loading && (
          <div className={`flex items-center gap-1 text-xs font-medium ${getTrendColor()}`}>
            <span>{getTrendIcon()}</span>
            <span>{trendValue}</span>
          </div>
        )}
      </div>

      {/* Decorative Element for Highlighted Cards */}
      {highlight && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
};