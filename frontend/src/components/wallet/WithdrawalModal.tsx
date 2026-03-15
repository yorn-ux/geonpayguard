'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Smartphone, Bitcoin, Loader2, 
  CheckCircle, Shield, ArrowLeft, AlertCircle,
  CreditCard, Clock, Lock,  Gem,
  BadgeCheck, Wallet, Sparkles
} from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances: { kes: string; usdt: string };
  isConnected: boolean;
  walletAddress: string | null;
}

type WithdrawalStep = 'form' | 'processing' | 'success' | 'failed';

export default function WithdrawalModal({ isOpen, onClose, balances, walletAddress }: WithdrawalModalProps) {
  const { showToast } = useNotificationStore();
  const [method, setMethod] = useState<'mpesa' | 'crypto'>('mpesa');
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<WithdrawalStep>('form');
  const [error, setError] = useState('');
  const [withdrawalId, setWithdrawalId] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Stats for dynamic fee calculation
  const [stats, setStats] = useState({ count: 0, total_withdrawn: 0 });

  // Professional Logo Component
  const GeonLogo = () => (
    <div className="relative flex items-center justify-center">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl rotate-6 shadow-lg" />
        <div className="absolute inset-[2px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg rotate-6" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Gem size={12} className="text-amber-400" strokeWidth={1.5} />
        </div>
        <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse" />
      </div>
    </div>
  );

  // Auth helper
  const getAuthToken = () => {
    return localStorage.getItem('auth_token') || 
           document.cookie.split('; ').find(row => row.startsWith('geon_token='))?.split('=')[1];
  };

  // Format phone number for API
  const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7')) {
      cleaned = '254' + cleaned;
    } else if (cleaned.startsWith('254') && cleaned.length === 12) {
      // Already in correct format
    } else {
      throw new Error('Invalid phone number format. Use 07XX or 2547XX');
    }
    
    return cleaned;
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { 
      if (pollingInterval) {
        clearInterval(pollingInterval); 
      }
    };
  }, [pollingInterval]);

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setAmount('');
      setError('');
      setWithdrawalId('');
      setTrackingId('');
      setDestination(method === 'crypto' && walletAddress ? walletAddress : '');
      fetchWithdrawalHistory();
      
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [isOpen, method, walletAddress]);

  const fetchWithdrawalHistory = async () => {
    try {
      const token = getAuthToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/v1/wallet/withdrawals/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats({
          count: data.count || 0,
          total_withdrawn: data.total_withdrawn || 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch withdrawal history');
    }
  };

  // Check withdrawal status with payment gateway
  const checkWithdrawalStatus = async (payoutId: string) => {
    try {
      const token = getAuthToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const res = await fetch(`${API_URL}/api/v1/wallet/withdrawal/status/${payoutId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      return null;
    } catch (err) {
      console.error('Status check error:', err);
      return null;
    }
  };

  // Polling for withdrawal status
  const startPolling = (payoutId: string) => {
    let attempts = 0;
    const maxAttempts = 20;
    
    const interval = setInterval(async () => {
      attempts++;
      
      try {
        const status = await checkWithdrawalStatus(payoutId);
        
        if (status) {
          if (status.transaction_state === 'COMPLETED' || status.status === 'completed') {
            clearInterval(interval);
            setStep('success');
            setPollingInterval(null);
            showToast('Withdrawal completed successfully', 'success');
            
          } else if (status.transaction_state === 'FAILED' || status.status === 'failed') {
            clearInterval(interval);
            setError(status.failure_reason || 'Withdrawal failed');
            setStep('failed');
            setPollingInterval(null);
            showToast('Withdrawal failed', 'error');
          }
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setPollingInterval(null);
          showToast('Withdrawal is still processing. Check back later.', 'info');
        }
        
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);

    setPollingInterval(interval);
  };

  const getNumericBalance = (val: string) => parseFloat(val.replace(/,/g, '')) || 0;
  const currentBalance = method === 'mpesa' ? getNumericBalance(balances.kes) : getNumericBalance(balances.usdt);
  const inputAmount = parseFloat(amount) || 0;
  
  // Fee Logic
  const calculateFee = () => {
    if (inputAmount <= 0) return 0;
    
    let feePercentage = 1.15;
    if (inputAmount >= 1000000) feePercentage = 0.25;
    else if (inputAmount >= 100000) feePercentage = 0.55;
    else if (inputAmount >= 10000) feePercentage = 0.85;

    const loyaltyDiscount = Math.min(stats.count * 0.01, 0.15);
    const volumeDiscount = Math.min(stats.total_withdrawn / 10000000, 0.1);
    
    feePercentage = Math.max(0.25, feePercentage - loyaltyDiscount - volumeDiscount);
    
    // Additional fee for M-PESA payouts
    if (method === 'mpesa') feePercentage += 0.25;
    
    const fee = (inputAmount * feePercentage) / 100;
    return Math.max(fee, method === 'mpesa' ? 45 : 5);
  };
  
  const fee = calculateFee();
  const youReceive = inputAmount - fee;
  const feePercentage = inputAmount > 0 ? ((fee / inputAmount) * 100).toFixed(2) : "0.00";
  const minAmount = method === 'mpesa' ? 50 : 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputAmount < minAmount) {
      setError(`Minimum withdrawal is ${method === 'mpesa' ? 'KES 50' : '$10'}`);
      return;
    }
    if (inputAmount > currentBalance) {
      setError('Insufficient balance');
      return;
    }
    
    if (method === 'mpesa') {
      try {
        formatPhoneNumber(destination);
      } catch (err: any) {
        setError(err.message);
        return;
      }
    } else if (method === 'crypto' && !walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setStep('processing');
    setError('');

    try {
      const token = getAuthToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      if (!token) {
        throw new Error('Authentication required');
      }

      const reference = `WDR_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      const endpoint = method === 'mpesa' 
        ? `${API_URL}/api/v1/wallet/withdraw/mpesa`
        : `${API_URL}/api/v1/wallet/withdraw/crypto`;

      const requestBody: any = {
        amount: inputAmount,
        currency: method === 'mpesa' ? 'KES' : 'USDT',
        reference: reference,
        fee: fee,
        fee_percentage: parseFloat(feePercentage)
      };

      if (method === 'mpesa') {
        requestBody.phone = formatPhoneNumber(destination);
        requestBody.provider = 'MPESA';
      } else {
        requestBody.wallet_address = destination;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || data.message || 'Withdrawal request failed');
      }

      setWithdrawalId(data.withdrawal_id || data.payout_id || data.id);
      setTrackingId(data.tracking_id || '');

      if (method === 'mpesa' && (data.payout_id || data.id)) {
        startPolling(data.payout_id || data.id);
      } else {
        setStep('success');
        showToast('Withdrawal initiated successfully', 'success');
      }

    } catch (err: any) {
      setError(err.message || 'Withdrawal failed. Please try again.');
      setStep('failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Top Gradient Bar */}
        <div className="h-2 bg-gradient-to-r from-amber-500 to-amber-400" />

        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            {(step === 'failed' || step === 'processing') && (
              <button 
                onClick={() => setStep('form')} 
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                disabled={step === 'processing'}
              >
                <ArrowLeft size={18} className="text-slate-600" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <GeonLogo />
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {step === 'form' ? 'Withdraw Funds' : 
                   step === 'processing' ? 'Processing Withdrawal' : 
                   step === 'success' ? 'Withdrawal Complete' : 'Transaction Failed'}
                </h2>
                <div className="flex items-center gap-1 mt-0.5">
                  <Lock size={10} className="text-emerald-600" />
                  <span className="text-[9px] font-mono text-slate-400">Secured Payment Gateway</span>
                  <BadgeCheck size={10} className="text-emerald-500" />
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            disabled={step === 'processing'}
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6">
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ASSET SELECTOR */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Wallet size={12} className="text-amber-500" />
                  Withdrawal Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button" 
                    onClick={() => setMethod('mpesa')}
                    className={`flex items-center gap-2 px-3 py-4 rounded-xl border-2 transition-all ${
                      method === 'mpesa' 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/30'
                    }`}
                  >
                    <Smartphone size={20} />
                    <span className="text-sm font-black">M-PESA</span>
                  </button>
                  
                  <button 
                    type="button" 
                    onClick={() => setMethod('crypto')}
                    className={`flex items-center gap-2 px-3 py-4 rounded-xl border-2 transition-all ${
                      method === 'crypto' 
                        ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50/30'
                    }`}
                  >
                    <Bitcoin size={20} />
                    <span className="text-sm font-black">Crypto</span>
                  </button>
                </div>
              </div>

              {/* BALANCE STATUS */}
              <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border-2 border-slate-200">
                <p className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                  <Wallet size={12} className="text-amber-500" />
                  Available Balance
                </p>
                <p className="text-2xl font-black text-slate-900">
                  {method === 'mpesa' ? balances.kes : balances.usdt} 
                  <span className="text-sm font-bold text-slate-400 ml-2">{method === 'mpesa' ? 'KES' : 'USDT'}</span>
                </p>
              </div>

              {/* INPUT FIELDS */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Amount</label>
                  <div className="relative">
                    <input
                      type="number" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-bold"
                      placeholder="0.00" 
                      required
                      min={minAmount}
                      step="0.01"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      {method === 'mpesa' ? 'KES' : 'USDT'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    {method === 'mpesa' ? 'M-PESA Phone Number' : 'Wallet Address'}
                  </label>
                  {method === 'mpesa' ? (
                    <input
                      type="tel" 
                      value={destination} 
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                      placeholder="0712 345 678" 
                      required
                    />
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
                      <p className="text-xs font-mono text-slate-600 break-all">
                        {walletAddress || 'Connect wallet to continue'}
                      </p>
                    </div>
                  )}
                  {method === 'mpesa' && (
                    <p className="text-[10px] font-mono text-slate-400 mt-1">
                      Enter the M-PESA registered phone number
                    </p>
                  )}
                </div>
              </div>

              {/* CARD METHOD - Coming Soon */}
              <div className="bg-slate-50 p-5 rounded-xl border-2 border-slate-200 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center">
                    <CreditCard size={18} className="text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-500">Card Withdrawal</p>
                    <p className="text-xs text-slate-400">Visa, Mastercard, Amex</p>
                  </div>
                  <span className="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full font-bold flex items-center gap-1 border border-amber-200">
                    <Clock size={12} /> Coming Soon
                  </span>
                </div>
              </div>

              {/* TRANSACTION PREVIEW */}
              {inputAmount > 0 && (
                <div className="bg-slate-50 p-5 rounded-xl border-2 border-slate-200 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-bold">Fee ({feePercentage}%)</span>
                    <span className="font-black text-slate-900">
                      {method === 'mpesa' ? 'KES' : '$'}{fee.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-3 border-t-2 border-slate-200">
                    <span className="text-slate-700 font-black">You receive</span>
                    <span className="font-black text-emerald-600">
                      {method === 'mpesa' ? 'KES' : '$'}{youReceive.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 p-4 bg-rose-50 border-2 border-rose-200 rounded-xl text-rose-600 text-sm">
                  <AlertCircle size={18} className="shrink-0" />
                  <span className="font-bold">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || inputAmount <= 0}
                className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Withdraw Funds'}
              </button>

              <p className="text-[9px] text-center text-slate-400 font-mono">
                Withdrawals are processed via secure gateway and may take a few minutes
              </p>
            </form>
          )}

          {step === 'processing' && (
            <div className="py-10 text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping opacity-50" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-amber-50 to-amber-100 rounded-full border-2 border-amber-200 flex items-center justify-center">
                  <Loader2 size={40} className="animate-spin text-amber-600" />
                </div>
                <Shield size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Processing Withdrawal</h3>
                <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">
                  {method === 'mpesa' 
                    ? 'Please wait while we process your M-PESA withdrawal through our secure gateway' 
                    : 'Please wait while we process your crypto withdrawal'}
                </p>
              </div>
              {trackingId && (
                <div className="bg-slate-50 p-3 rounded-xl border-2 border-slate-200">
                  <p className="text-[10px] font-mono text-slate-400">Tracking ID: {trackingId}</p>
                </div>
              )}
              <div className="flex items-center justify-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-10 text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-50" />
                <div className="relative w-20 h-20 bg-emerald-50 rounded-full border-2 border-emerald-200 flex items-center justify-center">
                  <CheckCircle size={40} className="text-emerald-600" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Withdrawal Complete</h3>
                <p className="text-xs text-slate-500 mt-2">
                  {method === 'mpesa' 
                    ? 'Funds have been sent to your M-PESA' 
                    : 'Funds have been sent to your wallet'}
                </p>
              </div>
              
              {(withdrawalId || trackingId) && (
                <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200 space-y-2">
                  {withdrawalId && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 mb-1">Transaction ID</p>
                      <p className="text-xs font-mono font-bold text-slate-700 break-all bg-white p-2 rounded-lg border border-slate-200">{withdrawalId}</p>
                    </div>
                  )}
                  {trackingId && trackingId !== withdrawalId && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 mb-1">Tracking ID</p>
                      <p className="text-xs font-mono font-bold text-slate-700 break-all bg-white p-2 rounded-lg border border-slate-200">{trackingId}</p>
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={handleClose} 
                className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-xl text-sm font-bold hover:from-amber-700 hover:to-amber-600 transition-all shadow-lg"
              >
                Close
              </button>

              <div className="flex items-center justify-center gap-1 text-[9px] text-slate-300">
                <BadgeCheck size={10} className="text-emerald-500" />
                <span>Verified by secure gateway</span>
              </div>
            </div>
          )}

          {step === 'failed' && (
            <div className="py-10 text-center space-y-4">
              <div className="w-20 h-20 bg-rose-50 rounded-full border-2 border-rose-200 flex items-center justify-center mx-auto">
                <AlertCircle size={40} className="text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Transaction Failed</h3>
                <p className="text-xs text-slate-500 mt-2">{error || 'Please try again or contact support'}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setStep('form')} 
                  className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                >
                  Try Again
                </button>
                <button 
                  onClick={handleClose} 
                  className="flex-1 py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-xl text-sm font-bold hover:from-amber-700 hover:to-amber-600 transition-all shadow-lg"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[9px] text-slate-400">
            <Shield size={10} />
            <span>256-bit SSL</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-slate-400">
            <Clock size={10} />
            <span>Instant processing</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-slate-400">
            <Sparkles size={10} className="text-amber-500" />
            <span>No hidden fees</span>
          </div>
        </div>
      </div>
    </div>
  );
}