'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Activity, Server, RefreshCw,
  ShieldAlert, Loader2,  Network, Clock, Terminal, MemoryStick,
  Cpu, HardDrive, Wifi, Globe, CheckCircle, AlertCircle, XCircle,
  Database, HardDrive as Hdd, BarChart
} from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useRouter } from 'next/navigation';

interface SystemHealth {
  api_status: string;
  db_latency_ms: number;
  cpu_load: string;
  storage_usage: string;
  memory_usage: string;
  uptime_hours: number;
  timestamp: string;
  relays: RelayNode[];
  system_info: SystemInfo;
  database_storage?: DatabaseStorage; // New
}

interface RelayNode {
  id: string;
  status: 'active' | 'degraded' | 'offline';
  load: string;
  latency: number;
  connections?: number;
  last_seen?: string;
  region?: string;
}

interface SystemInfo {
  system: string;
  release: string;
  processor: string;
  python_version: string;
  hostname: string;
  cores: number;
  machine?: string;
  architecture?: string;
}

// New interface for database storage
interface DatabaseStorage {
  database: {
    name: string;
    total_size_bytes: number;
    total_size_mb: number;
    total_size_gb: number;
    total_size_pretty: string;
    table_count: number;
  };
  tables: Array<{
    name: string;
    total_size: string;
    table_size: string;
    index_size: string;
  }>;
  statistics?: {
    cache_hit_ratio: number;
    transactions: {
      committed: number;
      rolled_back: number;
      success_rate: number;
    };
  };
}

export default function NodeHealth() {
  const router = useRouter();
  const [data, setData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'system' | 'database'>('system');
  const { showToast } = useNotificationStore();

  const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    
    const localToken = localStorage.getItem('auth_token');
    if (localToken) return localToken;
    
    const getCookie = (name: string): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        const cookieValue = parts.pop();
        return cookieValue ? cookieValue.split(';').shift() || null : null;
      }
      return null;
    };
    
    return getCookie('geon_token');
  };

  const getAuthHeaders = (): Record<string, string> => {
    const token = getToken();
    if (!token) {
      router.push('/auth/login');
      throw new Error('No authentication token found');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const checkAdminAccess = (): boolean => {
    const storedUser = localStorage.getItem('geon_user');
    if (!storedUser) return false;
    
    try {
      const user = JSON.parse(storedUser);
      return user.role === 'admin' || user.role === 'operator';
    } catch {
      return false;
    }
  };

  const fetchHealth = useCallback(async () => {
    try {
      if (!checkAdminAccess()) {
        setError("Access Denied: Admin Privileges Required");
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      const token = getToken();
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const headers = getAuthHeaders();
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const [
        statusRes, 
        systemInfoRes, 
        relayRes, 
        uptimeRes, 
        cpuRes, 
        memoryRes, 
        storageRes, 
        dbPingRes,
        dbStorageRes  // New: database storage endpoint
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/admin/system-status`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/admin/system/info`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/admin/relays/status`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/admin/system/uptime`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/admin/system/cpu`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/admin/system/memory`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/admin/system/storage`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/admin/system/db-ping`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/admin/system/database-storage`, { headers }) // New
      ]);

      if (statusRes.status === 401 || systemInfoRes.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('geon_user');
        document.cookie = 'geon_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        router.push('/auth/login');
        return;
      }

      if (statusRes.status === 403) {
        setError("Access Denied: Admin Privileges Required");
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (!statusRes.ok || !systemInfoRes.ok || !relayRes.ok) {
        throw new Error("Failed to fetch system data");
      }

      const [
        baseData,
        systemInfo,
        relayData,
        uptimeData,
        cpuData,
        memoryData,
        storageData,
        dbPingData,
        dbStorageData  // New
      ] = await Promise.all([
        statusRes.json(),
        systemInfoRes.json(),
        relayRes.json(),
        uptimeRes.ok ? uptimeRes.json() : null,
        cpuRes.ok ? cpuRes.json() : null,
        memoryRes.ok ? memoryRes.json() : null,
        storageRes.ok ? storageRes.json() : null,
        dbPingRes.ok ? dbPingRes.json() : null,
        dbStorageRes.ok ? dbStorageRes.json() : null // New
      ]);

      // Parse storage data properly
      let storageUsage = baseData.storageUsage;
      let memoryUsage = baseData.memoryUsage;
      
      if (storageData) {
        const total = storageData.total?.total_gb || 0;
        const used = storageData.total?.used_gb || 0;
        const percent = storageData.total?.percent || 0;
        storageUsage = `${used}GB / ${total}GB (${percent}%)`;
      }
      
      if (memoryData) {
        memoryUsage = `${memoryData.virtual.used_gb}GB / ${memoryData.virtual.total_gb}GB (${memoryData.virtual.percent}%)`;
      }

      const healthData: SystemHealth = {
        api_status: baseData.apiLatency ? 'operational' : 'degraded',
        db_latency_ms: dbPingData?.latency_ms || baseData.dbLatency,
        cpu_load: cpuData ? `${cpuData.load_percent?.['1s'] || cpuData.load_percent}%` : baseData.cpuLoad,
        storage_usage: storageUsage,
        memory_usage: memoryUsage,
        uptime_hours: uptimeData?.process?.uptime_hours || baseData.uptimeHours,
        timestamp: new Date().toISOString(),
        relays: relayData.relays || [],
        system_info: systemInfo,
        database_storage: dbStorageData // New
      };
      
      setData(healthData);
      setError('');
    } catch (error: any) {
      console.error('Health check failed:', error);
      setError(error.message || "Connection Failure");
      showToast("Sync Failed", "error");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'degraded': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'offline': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'active': return <CheckCircle size={12} className="text-emerald-600" />;
      case 'degraded': return <AlertCircle size={12} className="text-amber-600" />;
      case 'offline': return <XCircle size={12} className="text-rose-600" />;
      default: return <AlertCircle size={12} className="text-gray-400" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-purple-600 mx-auto mb-4" size={32} />
          <p className="text-sm text-gray-400">Loading system telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Server size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">System Infrastructure</h1>
              <p className="text-sm text-gray-500">Real-time node status and resource allocation</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-gray-400">Last Sync</p>
              <p className="text-sm font-mono text-gray-600">
                {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '—'}
              </p>
            </div>
            <button 
              onClick={() => { setIsRefreshing(true); fetchHealth(); }}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-all disabled:opacity-50"
            >
              {isRefreshing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              {isRefreshing ? 'Syncing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'system'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Server size={16} className="inline mr-2" />
            System Metrics
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'database'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Database size={16} className="inline mr-2" />
            Database Storage
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg flex items-center gap-3 text-rose-700">
            <ShieldAlert size={18} className="shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* System Metrics Tab */}
        {activeTab === 'system' && (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard 
                label="API Gateway" 
                value={data?.api_status === 'operational' ? 'Operational' : 'Degraded'} 
                status={data?.api_status === 'operational' ? 'online' : 'offline'} 
                trend={`${data?.relays?.filter(r => r.status === 'active').length || 0} active nodes`}
              />
              <MetricCard 
                label="Database Latency" 
                value={`${data?.db_latency_ms || 0}ms`} 
                trend={data?.db_latency_ms && data.db_latency_ms < 50 ? 'Optimal' : 'Elevated'} 
              />
              <MetricCard 
                label="CPU Utilization" 
                value={data?.cpu_load || '0%'} 
                trend={parseInt(data?.cpu_load || '0') < 70 ? 'Nominal' : 'High Load'} 
              />
              <MetricCard 
                label="Storage" 
                value={data?.storage_usage?.split(' ')[0] || '0GB'} 
                trend="Disk Storage" 
              />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Relay Nodes Table */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Network size={16} className="text-purple-600" /> Active Relay Nodes
                  </h3>
                  <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-full">
                    {data?.relays?.filter(r => r.status === 'active').length || 0} Online
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs text-gray-400">
                      <tr>
                        <th className="px-5 py-3">Node</th>
                        <th className="px-5 py-3">Region</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Load</th>
                        <th className="px-5 py-3 text-right">Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data?.relays && data.relays.length > 0 ? (
                        data.relays.map((relay: RelayNode) => (
                          <tr key={relay.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3">
                              <p className="text-sm font-medium text-gray-900">{relay.id}</p>
                              {relay.connections && (
                                <p className="text-xs text-gray-400">{relay.connections} connections</p>
                              )}
                            </td>
                            <td className="px-5 py-3 text-sm text-gray-500">{relay.region || '—'}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1.5">
                                {getStatusIcon(relay.status)}
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(relay.status)}`}>
                                  {relay.status}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-sm text-gray-500">{relay.load}</td>
                            <td className="px-5 py-3 text-right">
                              <span className={`text-sm font-mono ${
                                relay.latency > 50 ? 'text-amber-600' : 'text-gray-600'
                              }`}>
                                {relay.latency}ms
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                            No relay nodes available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* System Info & Resources */}
              <div className="space-y-6">
                {/* System Information */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                    <Terminal size={16} className="text-purple-600" /> System Environment
                  </h3>
                  <div className="space-y-3">
                    <SpecItem label="OS" value={data?.system_info?.system || '—'} icon={Server} />
                    <SpecItem label="Kernel" value={data?.system_info?.release || '—'} icon={Activity} />
                    <SpecItem label="Processor" value={data?.system_info?.processor || '—'} icon={Cpu} />
                    <SpecItem label="Cores" value={data?.system_info?.cores?.toString() || '—'} icon={MemoryStick} />
                    <SpecItem label="Architecture" value={data?.system_info?.architecture || '—'} icon={Wifi} />
                    <SpecItem label="Hostname" value={data?.system_info?.hostname || '—'} icon={Globe} />
                    <SpecItem label="Python" value={data?.system_info?.python_version || '—'} icon={Terminal} />
                  </div>
                </div>

                {/* Resource Usage */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-300">Resource Usage</h3>
                    <Activity size={16} className="text-purple-400" />
                  </div>
                  
                  <div className="space-y-4">
                    <ResourceBar 
                      label="Memory" 
                      value={data?.memory_usage || '—'} 
                      icon={MemoryStick}
                      percentage={parseInt(data?.memory_usage?.match(/\d+/)?.[0] || '0')}
                    />
                    <ResourceBar 
                      label="CPU" 
                      value={data?.cpu_load || '—'} 
                      icon={Cpu}
                      percentage={parseInt(data?.cpu_load || '0')}
                    />
                    <ResourceBar 
                      label="Storage" 
                      value={data?.storage_usage || '—'} 
                      icon={HardDrive}
                      percentage={parseInt(data?.storage_usage?.match(/\((\d+)%\)/)?.[1] || '0')}
                    />
                    <ResourceBar 
                      label="Uptime" 
                      value={data?.uptime_hours ? `${data.uptime_hours.toFixed(1)} hours` : '—'} 
                      icon={Clock}
                      percentage={100}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Database Storage Tab */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            {/* Database Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard 
                label="Database Name" 
                value={data?.database_storage?.database?.name || '—'} 
                icon={Database}
              />
              <MetricCard 
                label="Total Size" 
                value={data?.database_storage?.database?.total_size_pretty || '0 GB'} 
                icon={Hdd}
              />
              <MetricCard 
                label="Tables" 
                value={data?.database_storage?.database?.table_count?.toString() || '0'} 
                icon={BarChart}
              />
              <MetricCard 
                label="Cache Hit Ratio" 
                value={data?.database_storage?.statistics?.cache_hit_ratio 
                  ? `${data.database_storage.statistics.cache_hit_ratio}%` 
                  : '—'} 
                icon={Activity}
              />
            </div>

            {/* Database Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Largest Tables */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Database size={16} className="text-purple-600" /> Largest Tables
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs text-gray-400">
                      <tr>
                        <th className="px-5 py-3">Table Name</th>
                        <th className="px-5 py-3 text-right">Total Size</th>
                        <th className="px-5 py-3 text-right">Table Size</th>
                        <th className="px-5 py-3 text-right">Index Size</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data?.database_storage?.tables && data.database_storage.tables.length > 0 ? (
                        data.database_storage.tables.slice(0, 10).map((table, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-5 py-3 text-sm font-medium text-gray-900">{table.name}</td>
                            <td className="px-5 py-3 text-right text-sm text-gray-600">{table.total_size}</td>
                            <td className="px-5 py-3 text-right text-sm text-gray-600">{table.table_size}</td>
                            <td className="px-5 py-3 text-right text-sm text-gray-600">{table.index_size}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                            No table data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Database Statistics */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <BarChart size={16} className="text-purple-600" /> Database Statistics
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Transaction Success Rate</span>
                      <span className="font-mono font-medium text-gray-900">
                        {data?.database_storage?.statistics?.transactions?.success_rate || 0}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${data?.database_storage?.statistics?.transactions?.success_rate || 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Committed: {data?.database_storage?.statistics?.transactions?.committed?.toLocaleString() || 0}</span>
                      <span>Rolled Back: {data?.database_storage?.statistics?.transactions?.rolled_back?.toLocaleString() || 0}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-400">Total Size (Bytes)</p>
                      <p className="text-sm font-mono font-medium text-gray-900">
                        {formatBytes(data?.database_storage?.database?.total_size_bytes || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Size in MB</p>
                      <p className="text-sm font-mono font-medium text-gray-900">
                        {data?.database_storage?.database?.total_size_mb?.toFixed(2) || 0} MB
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Size in GB</p>
                      <p className="text-sm font-mono font-medium text-gray-900">
                        {data?.database_storage?.database?.total_size_gb?.toFixed(2) || 0} GB
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total Tables</p>
                      <p className="text-sm font-mono font-medium text-gray-900">
                        {data?.database_storage?.database?.table_count || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Raw Data Section (for debugging) */}
            {process.env.NODE_ENV === 'development' && data?.database_storage && (
              <div className="bg-gray-900 rounded-xl p-5 text-white font-mono text-xs overflow-auto">
                <h4 className="text-purple-400 mb-2">Database Storage Raw Data:</h4>
                <pre className="text-gray-300">
                  {JSON.stringify(data.database_storage, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ label, value, status, trend, icon: Icon }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500">{label}</p>
        {Icon && <Icon size={16} className="text-gray-400" />}
      </div>
      <div className="flex items-center justify-between">
        <h2 className={`text-xl font-semibold ${
          status === 'offline' ? 'text-rose-600' : 'text-gray-900'
        }`}>
          {value}
        </h2>
        {status && (
          <div className={`w-2 h-2 rounded-full ${
            status === 'online' 
              ? 'bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse' 
              : status === 'offline'
                ? 'bg-rose-500'
                : 'bg-gray-300'
          }`} />
        )}
      </div>
      {trend && <p className="text-xs text-gray-400 mt-2">{trend}</p>}
    </div>
  );
}

// Spec Item Component
function SpecItem({ label, value, icon: Icon }: any) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
        <Icon size={14} />
      </div>
      <span className="text-xs text-gray-500 w-20">{label}</span>
      <span className="text-sm font-mono text-gray-900 flex-1 text-right truncate">{value}</span>
    </div>
  );
}

// Resource Bar Component
function ResourceBar({ label, value, icon: Icon, percentage }: any) {
  const getBarColor = (percent: number) => {
    if (percent >= 90) return 'bg-rose-500';
    if (percent >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-gray-400" />
          <span className="text-xs text-gray-300">{label}</span>
        </div>
        <span className="text-xs font-mono text-gray-300">{value}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getBarColor(percentage)} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
