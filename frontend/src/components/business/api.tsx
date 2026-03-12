'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Terminal, Key, Plus, Copy,  
  Trash2, Loader2, ShieldAlert,
  AlertCircle, X
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  last_used?: string;
  created_at: string;
  usage_count: number;
}

export default function ApiRegistry() {
  const router = useRouter();
  
  // State Management
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{name: string, secret: string} | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Get auth token from cookies (same as other pages)
  const getAuthToken = useCallback(() => {
    if (typeof document === 'undefined') return null;
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
    };
    return getCookie('geon_token') || localStorage.getItem('auth_token');
  }, []);

  // Check authentication on mount
  useEffect(() => {
    setMounted(true);
    const token = getAuthToken();
    if (!token) {
      router.push('/auth/login');
    }
  }, [router, getAuthToken]);

  // 1. Fetch Keys
  const fetchKeys = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`${API_URL}/api/v1/business/api-keys`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.status === 401) {
        router.push('/auth/login');
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch keys: ${res.status}`);
      }

      const data = await res.json();
      setKeys(data || []);
    } catch (err) {
      console.error("Failed to sync keys:", err);
      setError("Unable to connect to API key service. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [API_URL, router, getAuthToken]);

  useEffect(() => { 
    if (mounted) {
      fetchKeys(); 
    }
  }, [mounted, fetchKeys]);

  // 2. Create Key
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('keyName') as string;

    const token = getAuthToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }

    setIsCreating(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_URL}/api/v1/business/api-keys`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ name })
      });

      if (res.status === 401) {
        router.push('/auth/login');
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to generate key');
      }

      const data = await res.json();
      setNewKeyData({ name, secret: data.secret });
      fetchKeys();
      
      // Clear the form
      (e.target as HTMLFormElement).reset();
      
    } catch (err) {
      console.error("Generation failed:", err);
      setError("Failed to generate API key. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // 3. Revoke Key
  const handleRevoke = async (id: string) => {
    const token = getAuthToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/business/api-keys/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.status === 401) {
        router.push('/auth/login');
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to revoke key');
      }

      setRevokeTarget(null);
      fetchKeys();
      
    } catch (err) {
      console.error("Revocation failed:", err);
      setError("Failed to revoke API key. Please try again.");
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  if (!mounted) return null;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg text-white">
                <Terminal size={20} />
            </div>
            Developer Access
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage infrastructure secrets and protocol integrations.</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
          <AlertCircle className="text-rose-600 shrink-0" size={20} />
          <p className="text-sm text-rose-700 font-medium">{error}</p>
        </div>
      )}

      {/* Security Warning */}
      <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
        <ShieldAlert className="text-amber-600 shrink-0" size={20} />
        <p className="text-sm text-amber-800 font-medium leading-relaxed">
          Keys provide full administrative access to your business node. Never share secrets in client-side code or public repositories.
        </p>
      </div>

      {/* Creation Form */}
      <form onSubmit={handleCreateKey} className="bg-white p-2 border border-slate-100 rounded-2xl shadow-sm flex items-center gap-2">
        <input 
          name="keyName"
          required
          placeholder="New Key Identity (e.g. Production Mobile App)"
          className="flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-slate-300"
          disabled={isCreating}
        />
        <button 
          type="submit"
          disabled={isCreating}
          className="bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isCreating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          Generate
        </button>
      </form>

      {/* Secret Reveal Modal */}
      {newKeyData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">API Key Generated</h2>
              <button onClick={() => setNewKeyData(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            
            <p className="text-sm text-slate-600">Copy this key now. It will never be shown again.</p>
            
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <code className="text-sm font-mono break-all">{newKeyData.secret}</code>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => copyToClipboard(newKeyData.secret)}
                className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 flex items-center justify-center gap-2"
              >
                <Copy size={16} /> Copy
              </button>
              <button 
                onClick={() => setNewKeyData(null)}
                className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keys Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Key Preview</th>
              <th className="px-6 py-4">Usage</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="animate-spin" size={18} />
                    <span className="text-sm">Loading keys...</span>
                  </div>
                </td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">
                  No API keys found. Create one to get started.
                </td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr key={key.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{key.name}</p>
                    <p className="text-xs text-slate-400">
                      Created {new Date(key.created_at).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 bg-slate-100 w-fit px-3 py-1.5 rounded-lg">
                      <Key size={12} className="text-slate-400" />
                      <code className="text-xs font-mono text-slate-600">{key.prefix}</code>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {key.usage_count.toLocaleString()} requests
                  </td>
                  <td className="px-6 py-4 text-right">
                    {revokeTarget === key.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setRevokeTarget(null)} 
                          className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleRevoke(key.id)} 
                          className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-600"
                        >
                          Confirm
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setRevokeTarget(key.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Revoke key"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}