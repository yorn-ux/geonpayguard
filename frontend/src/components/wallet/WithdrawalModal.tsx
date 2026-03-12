'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Smartphone, Bitcoin, Loader2, 
  CheckCircle, Shield, ArrowLeft, AlertCircle,
  CreditCard, Clock
} from 'lucide-react';  // Removed ExternalLink from imports
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

  // Auth helper
  const getAuthToken = () => {
    return localStorage.getItem('auth_token') || 
           document.cookie.split('; ').find(row => row.startsWith('geon_token='))?.split('=')[1];
  };

  // Format phone number for Intasend API
  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Convert to 254 format
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

  // Check withdrawal status with Intasend
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
    const maxAttempts = 20; // 60 seconds max (3s * 20)
    
    const interval = setInterval(async () => {
      attempts++;
      
      try {
        const status = await checkWithdrawalStatus(payoutId);
        
        if (status) {
          // Check Intasend payout status
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
        
        // Timeout after max attempts
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setPollingInterval(null);
          // Don't show as failed, just let user know it's processing
          showToast('Withdrawal is still processing. Check back later.', 'info');
        }
        
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000); // Poll every 3 seconds

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
    
    // Intasend M-PESA payout fee (typically higher than deposits)
    if (method === 'mpesa') feePercentage += 0.25; // Additional 0.25% for M-PESA payouts
    
    const fee = (inputAmount * feePercentage) / 100;
    return Math.max(fee, method === 'mpesa' ? 45 : 5); // Minimum fee: M-PESA = KES 45, Crypto = $5
  };
  
  const fee = calculateFee();
  const youReceive = inputAmount - fee;
  const feePercentage = inputAmount > 0 ? ((fee / inputAmount) * 100).toFixed(2) : "0.00";
  const minAmount = method === 'mpesa' ? 50 : 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
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
        // Validate phone format
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

      // Generate a unique reference
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

      // Add destination based on method
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

      // Store withdrawal identifiers
      setWithdrawalId(data.withdrawal_id || data.payout_id || data.id);
      setTrackingId(data.tracking_id || '');

      // Start polling for M-PESA withdrawals
      if (method === 'mpesa' && (data.payout_id || data.id)) {
        startPolling(data.payout_id || data.id);
      } else {
        // For crypto or if no polling, just show success
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
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            {(step === 'failed' || step === 'processing') && (
              <button 
                onClick={() => setStep('form')} 
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={step === 'processing'}
              >
                <ArrowLeft size={18} className="text-gray-600" />
              </button>
            )}
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {step === 'form' ? 'Withdraw Funds' : 
                 step === 'processing' ? 'Processing' : 
                 step === 'success' ? 'Withdrawal Initiated' : 'Failed'}
              </h2>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield size={10} className="text-emerald-600" />
                <span className="text-[10px] text-gray-400">Secured by IntaSend</span>
              </div>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={step === 'processing'}
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="p-5">
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ASSET SELECTOR */}
              <div className="space-y-2">
                <label className="text-xs text-gray-500">Withdrawal Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button" 
                    onClick={() => setMethod('mpesa')}
                    className={`flex items-center gap-2 px-3 py-3 rounded-lg border transition-all ${
                      method === 'mpesa' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Smartphone size={18} />
                    <span className="text-sm font-medium">M-PESA</span>
                  </button>
                  
                  <button 
                    type="button" 
                    onClick={() => setMethod('crypto')}
                    className={`flex items-center gap-2 px-3 py-3 rounded-lg border transition-all ${
                      method === 'crypto' 
                        ? 'bg-blue-50 border-blue-200 text-blue-700' 
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Bitcoin size={18} />
                    <span className="text-sm font-medium">Crypto</span>
                  </button>
                </div>
              </div>

              {/* BALANCE STATUS */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Available Balance</p>
                <p className="text-xl font-semibold text-gray-900">
                  {method === 'mpesa' ? balances.kes : balances.usdt} 
                  <span className="text-sm text-gray-400 ml-1">{method === 'mpesa' ? 'KES' : 'USDT'}</span>
                </p>
              </div>

              {/* INPUT FIELDS */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Amount</label>
                  <div className="relative">
                    <input
                      type="number" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                      placeholder="0.00" 
                      required
                      min={minAmount}
                      step="0.01"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      {method === 'mpesa' ? 'KES' : 'USDT'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    {method === 'mpesa' ? 'M-PESA Phone Number' : 'Wallet Address'}
                  </label>
                  {method === 'mpesa' ? (
                    <input
                      type="tel" 
                      value={destination} 
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                      placeholder="0712 345 678" 
                      required
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs font-mono text-gray-600 break-all">
                        {walletAddress || 'Connect wallet to continue'}
                      </p>
                    </div>
                  )}
                  {method === 'mpesa' && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      Enter the M-PESA registered phone number
                    </p>
                  )}
                </div>
              </div>

              {/* CARD METHOD - Coming Soon */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                    <CreditCard size={16} className="text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">Bank Card Withdrawal</p>
                    <p className="text-xs text-gray-400">Visa, Mastercard, Amex</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium flex items-center gap-1">
                    <Clock size={12} /> Coming Soon
                  </span>
                </div>
              </div>

              {/* TRANSACTION PREVIEW */}
              {inputAmount > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Fee ({feePercentage}%)</span>
                    <span className="font-medium text-gray-900">
                      {method === 'mpesa' ? 'KES' : '$'}{fee.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="text-gray-700">You receive</span>
                    <span className="font-semibold text-emerald-600">
                      {method === 'mpesa' ? 'KES' : '$'}{youReceive.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-sm">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || inputAmount <= 0}
                className="w-full py-3 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-all disabled:opacity-50 shadow-sm"
              >
                {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Withdraw Funds'}
              </button>

              <p className="text-[10px] text-center text-gray-400">
                Withdrawals are processed via IntaSend and may take a few minutes
              </p>
            </form>
          )}

          {step === 'processing' && (
            <div className="py-8 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <Loader2 size={64} className="animate-spin text-rose-500 opacity-20" />
                <Shield size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-rose-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Processing Withdrawal</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {method === 'mpesa' 
                    ? 'Please wait while we process your M-PESA withdrawal' 
                    : 'Please wait while we process your crypto withdrawal'}
                </p>
              </div>
              {trackingId && (
                <div className="bg-gray-50 p-2 rounded-lg">
                  <p className="text-[10px] text-gray-400">Tracking ID: {trackingId}</p>
                </div>
              )}
              <div className="flex items-center justify-center gap-1">
                <div className="w-1 h-1 bg-rose-400 rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-rose-400 rounded-full animate-pulse delay-75"></div>
                <div className="w-1 h-1 bg-rose-400 rounded-full animate-pulse delay-150"></div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={28} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Withdrawal Initiated</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {method === 'mpesa' 
                    ? 'Funds will be sent to your M-PESA shortly' 
                    : 'Funds will be sent to your wallet shortly'}
                </p>
              </div>
              
              {(withdrawalId || trackingId) && (
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  {withdrawalId && (
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1">Transaction ID</p>
                      <p className="text-xs font-mono text-gray-700 break-all">{withdrawalId}</p>
                    </div>
                  )}
                  {trackingId && trackingId !== withdrawalId && (
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1">Tracking ID</p>
                      <p className="text-xs font-mono text-gray-700 break-all">{trackingId}</p>
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={handleClose} 
                className="w-full py-3 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-all"
              >
                Close
              </button>
            </div>
          )}

          {step === 'failed' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={28} className="text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Withdrawal Failed</h3>
                <p className="text-xs text-gray-400 mt-1">{error || 'Please try again or contact support'}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setStep('form')} 
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all"
                >
                  Try Again
                </button>
                <button 
                  onClick={handleClose} 
                  className="flex-1 py-3 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
