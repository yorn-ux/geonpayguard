'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, CreditCard, Smartphone, Loader2, 
  CheckCircle, AlertCircle, ArrowLeft, Lock
} from 'lucide-react';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentStep = 'select' | 'form' | 'processing' | 'success' | 'failed';

export default function AddFundsModal({ isOpen, onClose, onSuccess }: AddFundsModalProps) {
  const [step, setStep] = useState<PaymentStep>('select');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invoiceId, setInvoiceId] = useState(''); // Using only invoiceId, removed transactionId
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Fee logic
  const [isFirstDeposit] = useState(true);
  const STANDARD_FEE = 25;
  const currentFee = isFirstDeposit ? 0 : STANDARD_FEE;
  const totalCharge = Number(amount) > 0 ? Number(amount) + currentFee : 0;

  const [mpesaDetails, setMpesaDetails] = useState({ phone: '' });

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { 
      if (pollingInterval) {
        clearInterval(pollingInterval); 
      }
    };
  }, [pollingInterval]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setError('');
      setLoading(false);
      setInvoiceId('');
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [isOpen]);

  const handleBack = () => {
    if (step === 'form') {
      setStep('select');
      setError('');
    } else {
      onClose();
    }
  };

  const handleClose = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setStep('select');
    setError('');
    setAmount('');
    setMpesaDetails({ phone: '' });
    setInvoiceId('');
    onClose();
  };

  // Auth helper
  const getAuthToken = () => {
    return localStorage.getItem('auth_token') || 
           document.cookie.split('; ').find(row => row.startsWith('geon_token='))?.split('=')[1];
  };

  // Format phone number for API
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
      throw new Error('Invalid phone number format');
    }
    
    return cleaned;
  };

  // Check transaction status with Intasend
  const checkTransactionStatus = async (invoiceId: string) => {
    try {
      const token = getAuthToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const res = await fetch(`${API_URL}/api/v1/wallet/transaction/status/${invoiceId}`, {
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

  // Polling for transaction status
  const startPolling = (invoiceId: string) => {
    let attempts = 0;
    const maxAttempts = 30; // 90 seconds max (3s * 30)
    
    const interval = setInterval(async () => {
      attempts++;
      
      try {
        const status = await checkTransactionStatus(invoiceId);
        
        if (status) {
          // Check Intasend payment status
          if (status.payment_status === 'COMPLETE' || status.status === 'completed' || status.complete === true) {
            clearInterval(interval);
            setStep('success');
            setPollingInterval(null);
            
            // Notify parent after success
            setTimeout(() => {
              onSuccess();
              handleClose();
            }, 2000);
            
          } else if (status.payment_status === 'FAILED' || status.status === 'failed') {
            clearInterval(interval);
            setError(status.failure_reason || 'Transaction failed');
            setStep('failed');
            setPollingInterval(null);
          }
        }
        
        // Timeout after max attempts
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setError('Transaction timeout. Please check your wallet balance.');
          setStep('failed');
          setPollingInterval(null);
        }
        
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000); // Poll every 3 seconds

    setPollingInterval(interval);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = Number(amount);
    
    if (!amount || cleanAmount < 10) {
      setError('Minimum deposit is KES 10');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = getAuthToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      if (!token) {
        throw new Error('Authentication required');
      }

      // Format phone number
      const formattedPhone = formatPhoneNumber(mpesaDetails.phone);

      // Generate a unique reference
      const reference = `DEP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // Call Intasend STK Push endpoint
      const endpoint = `${API_URL}/api/v1/wallet/deposit/mpesa`;

      const bodyData = { 
        amount: cleanAmount,
        phone: formattedPhone,
        reference: reference
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });

      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.detail || result.message || "Payment initiation failed");
      }

      // Store transaction identifier - using only invoiceId
      if (result.invoice_id) {
        setInvoiceId(result.invoice_id);
      } else if (result.tracking_id) {
        setInvoiceId(result.tracking_id);
      } else if (result.tx_id) {
        setInvoiceId(result.tx_id);
      }

      // Move to processing step
      setStep('processing');

      // Start polling for status (if we have an ID)
      if (result.invoice_id || result.tracking_id || result.tx_id) {
        startPolling(result.invoice_id || result.tracking_id || result.tx_id);
      } else {
        // If no ID, just show processing and let user check manually
        setTimeout(() => {
          setStep('success');
          setTimeout(() => {
            onSuccess();
            handleClose();
          }, 2000);
        }, 5000);
      }

    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
      setStep('failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setStep('form');
    setError('');
    setInvoiceId('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            {step !== 'select' && step !== 'success' && (
              <button 
                onClick={handleBack} 
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={step === 'processing'}
              >
                <ArrowLeft size={18} className="text-gray-600" />
              </button>
            )}
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {step === 'select' && 'Add Funds'}
                {step === 'form' && 'M-PESA Deposit'}
                {step === 'processing' && 'Processing Payment'}
                {step === 'success' && 'Payment Successful'}
                {step === 'failed' && 'Payment Failed'}
              </h2>
              <div className="flex items-center gap-1 mt-0.5">
                <Lock size={10} className="text-emerald-600" />
                <span className="text-[10px] text-gray-400">Secured by PesaPal</span>
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
          {step === 'select' && (
            <div className="space-y-3">
              {/* M-PESA - Active */}
              <button 
                onClick={() => setStep('form')} 
                className="w-full p-4 border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/30 flex items-center gap-3 transition-all group"
              >
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Smartphone className="text-emerald-600" size={20} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">M-PESA</p>
                  <p className="text-xs text-gray-400">Instant STK Push via PesaPal</p>
                </div>
                <span className="text-[10px] px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">Active</span>
              </button>

              {/* Card - Temporarily Unavailable */}
              <div className="w-full p-4 border border-gray-200 rounded-xl bg-gray-50 flex items-center gap-3 opacity-60 cursor-not-allowed">
                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                  <CreditCard className="text-gray-400" size={20} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-500">Card Payments</p>
                  <p className="text-xs text-gray-400">Visa, Mastercard, Amex</p>
                </div>
                <span className="text-[10px] px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">Coming Soon</span>
              </div>

              {/* Info Notice */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-xs text-blue-800 flex items-center gap-2">
                  <Smartphone size={14} className="text-blue-600" />
                  You'll receive an STK push on your phone to complete the payment.
                </p>
              </div>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 ml-1">Amount (KES)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">KES</span>
                  <input
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00" 
                    autoFocus 
                    required
                    min="10"
                    step="10"
                    className="w-full pl-14 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 ml-1">M-PESA Phone Number</label>
                <input
                  type="tel" 
                  placeholder="0712 345 678" 
                  value={mpesaDetails.phone}
                  onChange={(e) => setMpesaDetails({ phone: e.target.value })}
                  className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">Enter the M-PESA registered phone number</p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Processing Fee</span>
                  <span className="text-gray-900 font-medium">
                    {isFirstDeposit ? 'Free' : `KES ${STANDARD_FEE}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-medium pt-2 mt-2 border-t border-gray-200">
                  <span className="text-gray-700">Total Charge</span>
                  <span className="text-emerald-600">KES {totalCharge.toLocaleString()}</span>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2 text-rose-600 text-xs">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  'Pay with M-PESA'
                )}
              </button>

              <p className="text-[10px] text-center text-gray-400">
                By continuing, you agree to our Terms of Service
              </p>
            </form>
          )}

          {step === 'processing' && (
            <div className="py-8 text-center">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <Loader2 size={64} className="animate-spin text-emerald-600 opacity-20" />
                <Smartphone size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">Awaiting M-PESA Confirmation</p>
              <p className="text-xs text-gray-400 px-4 mb-3">
                Please check your phone and enter your M-PESA PIN to complete the transaction.
              </p>
              {invoiceId && (
                <p className="text-[10px] text-gray-300">
                  Reference: {invoiceId.substring(0, 8)}...
                </p>
              )}
              <div className="mt-4 flex items-center justify-center gap-1">
                <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse delay-75"></div>
                <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse delay-150"></div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">Payment Successful!</p>
              <p className="text-xs text-gray-400 mb-2">KES {Number(amount).toLocaleString()} added to your wallet</p>
              {invoiceId && (
                <p className="text-[10px] text-gray-300">Transaction ID: {invoiceId}</p>
              )}
            </div>
          )}

          {step === 'failed' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={28} className="text-rose-600" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">Transaction Failed</p>
              <p className="text-xs text-gray-400 mb-4">{error || 'Please try again'}</p>
              <div className="flex gap-2 justify-center">
                <button 
                  onClick={handleRetry} 
                  className="text-xs px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Try Again
                </button>
                <button 
                  onClick={handleClose} 
                  className="text-xs px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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
