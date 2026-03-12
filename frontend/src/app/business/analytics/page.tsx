'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowUpRight, ArrowDownRight, Globe, Zap, ShieldCheck, 
  Download, RefreshCw, Activity, AlertCircle, BarChart3
} from 'lucide-react';

interface AnalyticsData {
  throughput: number;
  escrow: number;
  latency: string;
  volumeHistory: number[];
  regionalData: Array<{ label: string; value: number; users: string; color: string }>;
}

export default function AnalyticsHub() {
  const KES_TO_USD = 0.0076;
  const [activeTab, setActiveTab] = useState('1M');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [mounted, setMounted] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    setMounted(true);
  }, []);

  const getAuthToken = () => {
    if (typeof document === 'undefined') return null;
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
    };
    return getCookie('geon_token') || localStorage.getItem('auth_token');
  };

  const fetchMetrics = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/v1/business/analytics/overview?period=${activeTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        throw new Error("Session expired. Please login again.");
      }

      if (!response.ok) throw new Error("Analytics sync failed");
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Network topology unreachable.");
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  }, [activeTab, API_URL]);

  useEffect(() => { 
    if (mounted) {
      fetchMetrics(); 
    }
  }, [mounted, fetchMetrics]);

  // Export function - downloads analytics data as CSV
  const exportAnalytics = () => {
    if (!data) {
      alert("No data available to export");
      return;
    }

    setExporting(true);

    try {
      // Format current date for filename
      const date = new Date();
      const dateStr = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
      
      // Create CSV content
      let csvContent = "Aethel Analytics Report\n";
      csvContent += `Generated: ${date.toLocaleString()}\n`;
      csvContent += `Period: ${activeTab}\n\n`;
      
      // Summary Section
      csvContent += "SUMMARY METRICS\n";
      csvContent += `Total Throughput (KES),${data.throughput}\n`;
      csvContent += `Active Escrow (KES),${data.escrow}\n`;
      csvContent += `System Latency,${data.latency}\n`;
      csvContent += `USD Rate,${KES_TO_USD}\n\n`;
      
      // Regional Data
      csvContent += "REGIONAL DISTRIBUTION\n";
      csvContent += "Region,Percentage,Transactions\n";
      data.regionalData.forEach(region => {
        csvContent += `${region.label},${region.value}%,${region.users}\n`;
      });
      csvContent += "\n";
      
      // Volume History
      csvContent += "VOLUME HISTORY\n";
      csvContent += "Period,Value (KES)\n";
      data.volumeHistory.forEach((value, index) => {
        const period = index + 1;
        csvContent += `${period},${value}\n`;
      });
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.href = url;
      link.setAttribute('download', `geon-analytics-${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const stats = data ? [
    { label: "Total Throughput", value: data.throughput, trend: "+12.5%", pos: true, icon: Activity },
    { label: "Active Escrow", value: data.escrow, trend: "+3.1%", pos: true, icon: ShieldCheck },
    { label: "System Latency", value: data.latency, trend: "-2.4%", pos: true, icon: Zap },
  ] : [];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-sm">
              <BarChart3 size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
              <p className="text-sm text-gray-500">Real-time performance and capital velocity metrics.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={fetchMetrics}
              disabled={loading}
              className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              title="Refresh data"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin text-rose-500' : 'text-gray-600'} />
            </button>
            <button 
              onClick={exportAnalytics}
              disabled={loading || exporting || !data}
              className="flex items-center gap-2 bg-rose-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {exporting ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {exporting ? 'Exporting...' : 'Export Report'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-700 text-sm">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading && !data ? Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <div className="animate-pulse">
                <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
                <div className="h-8 w-32 bg-gray-200 rounded" />
              </div>
            </div>
          )) : stats.map((stat, i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <stat.icon size={20} className="text-gray-600" />
                </div>
                <div className={`flex items-center text-xs font-medium ${
                  stat.pos ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {stat.pos ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {stat.trend}
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <h2 className="text-2xl font-semibold text-gray-900">
                {typeof stat.value === 'number' ? `KES ${stat.value.toLocaleString()}` : stat.value}
              </h2>
            </div>
          ))}
        </div>

        {/* Charts & Regional Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Chart Card */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-gray-400" />
                <h3 className="font-medium text-gray-900">Volume Distribution</h3>
              </div>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                {['1W', '1M', '1Y'].map(t => (
                  <button 
                    key={t} 
                    onClick={() => setActiveTab(t)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                      activeTab === t 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-64 flex items-end gap-2 px-2">
              {(loading ? Array(12).fill(20) : (data?.volumeHistory || [])).map((h, i) => {
                const maxValue = Math.max(...(data?.volumeHistory || [1]), 1);
                const height = maxValue > 0 ? (h / maxValue) * 100 : 5;
                return (
                  <div key={i} className="flex-1 group relative">
                    <div 
                      className={`w-full bg-rose-100 rounded-t-sm hover:bg-rose-500 transition-colors ${loading ? 'animate-pulse' : ''}`}
                      style={{ height: `${Math.max(height, 5)}%` }}
                    />
                    {!loading && data && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                        KES {h.toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-[10px] text-gray-400 uppercase tracking-widest">
              <span>Historical Flow</span>
              <span>Live Node Feed</span>
            </div>
          </div>

          {/* Regional Info Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Globe size={18} className="text-gray-400" />
              <h3 className="font-medium text-gray-900">Regional Distribution</h3>
            </div>
            
            <div className="space-y-6">
              {loading ? Array(3).fill(0).map((_, i) => (
                 <div key={i} className="space-y-2 animate-pulse">
                    <div className="h-3 w-20 bg-gray-200 rounded" />
                    <div className="h-2 w-full bg-gray-200 rounded" />
                 </div>
              )) : data?.regionalData.map((region, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-700">{region.label}</span>
                    <span className="text-gray-900">{region.value}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${region.color} rounded-full transition-all duration-1000`} 
                      style={{ width: `${region.value}%` }} 
                    />
                  </div>
                  <p className="text-xs text-gray-400">{region.users}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 text-gray-900 mb-2">
                <ShieldCheck size={14} className="text-gray-600" />
                <span className="text-xs font-medium uppercase tracking-widest">Compliance</span>
              </div>
              <p className="text-xs leading-relaxed text-gray-500 font-medium">
                Node traffic is currently compliant with ISO-20022 and regional financial data standards.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}