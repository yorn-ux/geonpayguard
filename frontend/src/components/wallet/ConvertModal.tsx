'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  X, RefreshCcw, Loader2, 
  CheckCircle, Zap, 
  AlertCircle, ArrowLeft, TrendingUp,
  Clock, Shield
} from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';

interface ConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances: { kes: string; usdt: string };
  onSuccess?: () => void;
}

type ConversionStep = 'form' | 'processing' | 'success' | 'failed';

interface ConversionRate {
  buy: number;   // USDT -> KES (you sell USDT)
  sell: number;  // KES -> USDT (you buy USDT)
  timestamp: string;
}

interface FeeBreakdown {
  networkFee: number;
  conversionFee: number;
  loyaltyDiscount: number;
  volumeDiscount: number;
  finalFee: number;
  feeCurrency: 'KES' | 'USDT';
}

export default function ConvertModal({ isOpen, onClose, balances, onSuccess }: ConvertModalProps) {
  const { showToast } = useNotificationStore();
  const [fromCurrency, setFromCurrency] = useState<'KES' | 'USDT'>('USDT');
  const [toCurrency, setToCurrency] = useState<'KES' | 'USDT'>('KES');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<ConversionStep>('form');
  const [error, setError] = useState('');
  const [conversionId, setConversionId] = useState('');
  const [rate, setRate] = useState<ConversionRate>({
    buy: 129.50,   // Default: 1 USDT = 129.50 KES when buying KES
    sell: 128.50,  // Default: 1 USDT = 128.50 KES when selling KES
    timestamp: new Date().toISOString()
  });
  
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown>({
    networkFee: 0,
    conversionFee: 0,
    loyaltyDiscount: 0,
    volumeDiscount: 0,
    finalFee: 0,
    feeCurrency: 'USDT'
  });
  
  const [userMetrics, setUserMetrics] = useState({
    conversionCount: 0,
    monthlyVolume: 0,
    loyaltyTier: 'bronze' as 'bronze' | 'silver' | 'gold' | 'platinum'
  });

  // Auth helper
  const getAuthToken = () => {
    return localStorage.getItem('auth_token') || 
           document.cookie.split('; ').find(row => row.startsWith('geon_token='))?.split('=')[1];
  };

  const parseBalance = (val: string) => parseFloat(val.replace(/,/g, '')) || 0;

  const fetchConversionRate = useCallback(async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/conversion/rate?pair=USDT/KES`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (res.ok) {
        const data = await res.json();
        setRate({
          buy: data.buy_rate || data.rate * 0.995,
          sell: data.sell_rate || data.rate * 1.005,
          timestamp: data.timestamp || new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Rate fetch failed, using fallback');
    }
  }, []);

  const fetchUserMetrics = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/conversion/metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setUserMetrics({
          conversionCount: data.count || 0,
          monthlyVolume: data.monthly_volume || 0,
          loyaltyTier: data.tier || 'bronze'
        });
      }
    } catch (err) {
      console.error('Metrics fetch failed');
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setFromAmount('');
      setToAmount('');
      setError('');
      setConversionId('');
      fetchConversionRate();
      fetchUserMetrics();
    }
  }, [isOpen, fetchConversionRate, fetchUserMetrics]);

  const calculateFees = useCallback((amount: number, fromCurr: 'KES' | 'USDT'): FeeBreakdown => {
    if (amount <= 0) {
      return {
        networkFee: 0,
        conversionFee: 0,
        loyaltyDiscount: 0,
        volumeDiscount: 0,
        finalFee: 0,
        feeCurrency: fromCurr === 'USDT' ? 'USDT' : 'KES'
      };
    }

    // Base fee percentage (0.5% = 0.005)
    let baseFeePercent = 0.005;
    
    // Volume-based tier reduction
    if (amount > 10000) baseFeePercent = 0.0035; // 0.35% for > $10k
    else if (amount > 5000) baseFeePercent = 0.004; // 0.4% for > $5k
    else if (amount > 1000) baseFeePercent = 0.0045; // 0.45% for > $1k

    // Loyalty discount based on conversion count
    let loyaltyDiscount = 0;
    if (userMetrics.conversionCount > 100) loyaltyDiscount = 0.0015;
    else if (userMetrics.conversionCount > 50) loyaltyDiscount = 0.001;
    else if (userMetrics.conversionCount > 10) loyaltyDiscount = 0.0005;

    // Volume discount based on monthly volume
    let volumeDiscount = 0;
    if (userMetrics.monthlyVolume > 50000) volumeDiscount = 0.001;
    else if (userMetrics.monthlyVolume > 10000) volumeDiscount = 0.0005;

    // Network fee (fixed for on-chain operations)
    const networkFee = fromCurr === 'USDT' ? 1.0 : 0;

    // Calculate fees
    const conversionFee = amount * baseFeePercent;
    const loyaltyDiscountValue = amount * loyaltyDiscount;
    const volumeDiscountValue = amount * volumeDiscount;
    
    // Final fee calculation
    const finalFee = Math.max(
      0.5,
      (conversionFee - loyaltyDiscountValue - volumeDiscountValue) + networkFee
    );

    return {
      networkFee,
      conversionFee,
      loyaltyDiscount: loyaltyDiscountValue,
      volumeDiscount: volumeDiscountValue,
      finalFee,
      feeCurrency: fromCurr === 'USDT' ? 'USDT' : 'KES'
    };
  }, [userMetrics]);

  useEffect(() => {
    const val = parseFloat(fromAmount) || 0;
    
    if (val === 0) {
      setToAmount('');
      setFeeBreakdown(calculateFees(0, fromCurrency));
      return;
    }

    if (fromCurrency === 'USDT') {
      // USDT -> KES (selling USDT)
      const fees = calculateFees(val, 'USDT');
      setFeeBreakdown(fees);
      
      const netAmount = val - fees.finalFee;
      const converted = netAmount * rate.buy;
      setToAmount(converted.toFixed(2));
      
    } else {
      // KES -> USDT (buying USDT)
      const usdtAmount = val / rate.sell;
      const fees = calculateFees(usdtAmount, 'USDT');
      setFeeBreakdown(fees);
      
      const netAmount = usdtAmount - fees.finalFee;
      setToAmount(netAmount.toFixed(4));
    }
  }, [fromAmount, fromCurrency, rate, calculateFees]);

  const handleSwapDirection = () => {
    setFromCurrency(prev => prev === 'USDT' ? 'KES' : 'USDT');
    setToCurrency(prev => prev === 'KES' ? 'USDT' : 'KES');
    setFromAmount('');
    setToAmount('');
    setError('');
  };

  const handleConvert = async () => {
    const amount = parseFloat(fromAmount);
    if (!amount || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    const balance = fromCurrency === 'KES' 
      ? parseBalance(balances.kes) 
      : parseBalance(balances.usdt);
    
    if (amount > balance) {
      setError(`Insufficient ${fromCurrency} balance`);
      return;
    }

    setLoading(true);
    setStep('processing');
    setError('');

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Generate a unique reference
      const reference = `CONV_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const response = await fetch(`${API_URL}/api/v1/wallet/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          from_currency: fromCurrency,
          to_currency: toCurrency,
          amount: amount,
          estimated_amount: parseFloat(toAmount),
          rate: fromCurrency === 'USDT' ? rate.buy : rate.sell,
          fee: feeBreakdown.finalFee,
          fee_currency: feeBreakdown.feeCurrency,
          reference: reference,
          metadata: {
            conversion_count: userMetrics.conversionCount,
            loyalty_tier: userMetrics.loyaltyTier
          }
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Conversion failed');
      }

      // Store conversion ID
      setConversionId(data.conversion_id || data.id || reference);
      
      // Success!
      setStep('success');
      showToast('Funds converted successfully', 'success');
      
      // Notify parent component
      if (onSuccess) {
        onSuccess();
      }

    } catch (err: any) {
      console.error('Conversion error:', err);
      setError(err.message || 'Conversion failed. Please try again.');
      setStep('failed');
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = () => {
    switch(userMetrics.loyaltyTier) {
      case 'platinum': return 'text-purple-600 bg-purple-50';
      case 'gold': return 'text-amber-600 bg-amber-50';
      case 'silver': return 'text-gray-600 bg-gray-50';
      default: return 'text-orange-600 bg-orange-50';
    }
  };

  const getRateAge = () => {
    const age = new Date().getTime() - new Date(rate.timestamp).getTime();
    const minutes = Math.floor(age / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    return `${minutes} mins ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-[440px] rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {step !== 'form' && step !== 'processing' && (
              <button 
                onClick={() => setStep('form')} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <ArrowLeft size={20} className="text-slate-600" />
              </button>
            )}
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {step === 'form' ? 'Convert' : 
                 step === 'processing' ? 'Processing' :
                 step === 'success' ? 'Complete' : 'Failed'}
              </h2>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield size={10} className="text-emerald-600" />
                <span className="text-[10px] text-gray-400">Secured by PesaPal</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
            disabled={step === 'processing'}
          >
            <X size={24} />
          </button>
        </div>

        {/* Rate Banner */}
        {step === 'form' && (
          <div className="px-8 mb-2">
            <div className="flex items-center justify-between bg-slate-50 px-4 py-2 rounded-full text-xs">
              <div className="flex items-center gap-1 text-slate-500">
                <TrendingUp size={12} />
                <span>1 USDT = {rate.buy.toFixed(2)} KES</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <Clock size={10} />
                <span>{getRateAge()}</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-8">
          {step === 'form' && (
            <div className="space-y-6">
              {/* Tier Badge */}
              {userMetrics.conversionCount > 0 && (
                <div className={`text-center py-1 px-3 rounded-full text-xs font-bold inline-block mx-auto ${getTierColor()}`}>
                  {userMetrics.loyaltyTier.charAt(0).toUpperCase() + userMetrics.loyaltyTier.slice(1)} Tier • {userMetrics.conversionCount} conversions
                </div>
              )}

              <div className="relative space-y-2">
                {/* From Input */}
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 focus-within:border-blue-500 transition-all">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    <span>Pay</span>
                    <span>Bal: {fromCurrency === 'KES' ? balances.kes : balances.usdt}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number"
                      value={fromAmount}
                      onChange={(e) => setFromAmount(e.target.value)}
                      placeholder="0.00"
                      className="bg-transparent text-3xl font-black outline-none w-full text-slate-900 placeholder:text-slate-200"
                      min="0"
                      step={fromCurrency === 'USDT' ? "0.01" : "1"}
                    />
                    <div className="bg-white px-3 py-1 rounded-xl shadow-sm border border-slate-100 font-bold text-slate-900">
                      {fromCurrency}
                    </div>
                  </div>
                </div>

                {/* Swap Trigger */}
                <button 
                  onClick={handleSwapDirection}
                  className="absolute left-1/2 -translate-x-1/2 top-[42%] z-10 p-3 bg-white rounded-2xl border border-slate-200 shadow-xl hover:scale-110 transition-transform text-blue-600"
                >
                  <RefreshCcw size={20} strokeWidth={3} />
                </button>

                {/* To Input */}
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Receive (Est)</div>
                  <div className="flex items-center gap-3">
                    <input 
                      readOnly
                      value={toAmount}
                      placeholder="0.00"
                      className="bg-transparent text-3xl font-black outline-none w-full text-slate-400"
                    />
                    <div className="bg-white px-3 py-1 rounded-xl shadow-sm border border-slate-100 font-bold text-slate-900">
                      {toCurrency}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fee Breakdown */}
              {parseFloat(fromAmount) > 0 && (
                <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Exchange Rate</span>
                    <span className="text-slate-900 font-medium">
                      1 USDT = {fromCurrency === 'USDT' ? rate.buy.toFixed(2) : rate.sell.toFixed(2)} KES
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Network Fee</span>
                    <span className="text-slate-900 font-medium">
                      ${feeBreakdown.networkFee.toFixed(2)}
                    </span>
                  </div>
                  {feeBreakdown.loyaltyDiscount > 0 && (
                    <div className="flex justify-between items-center text-xs text-emerald-600">
                      <span>Loyalty Discount</span>
                      <span>-${feeBreakdown.loyaltyDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {feeBreakdown.volumeDiscount > 0 && (
                    <div className="flex justify-between items-center text-xs text-emerald-600">
                      <span>Volume Discount</span>
                      <span>-${feeBreakdown.volumeDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-slate-200">
                    <span className="text-slate-700">Total Fee</span>
                    <span className="text-blue-600">
                      {feeBreakdown.feeCurrency === 'USDT' ? '$' : 'KES'}{feeBreakdown.finalFee.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-2 border border-red-100">
                  <AlertCircle size={16}/> {error}
                </div>
              )}

              <button
                disabled={!fromAmount || parseFloat(fromAmount) <= 0 || loading}
                onClick={handleConvert}
                className="w-full py-5 bg-slate-900 hover:bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-30 transition-all shadow-xl"
              >
                {loading ? <Loader2 className="animate-spin" /> : <><Zap size={18} fill="currentColor" /> Convert Now</>}
              </button>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-20 text-center space-y-6">
              <div className="relative flex items-center justify-center">
                <Loader2 size={64} className="animate-spin text-blue-500" strokeWidth={1} />
                <Zap size={24} className="absolute text-slate-900" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Processing Conversion</h3>
                <p className="text-sm font-medium text-slate-400 mt-1">
                  Converting {fromAmount} {fromCurrency} to {toCurrency}
                </p>
              </div>
              <div className="flex items-center justify-center gap-1">
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-75"></div>
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-150"></div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-10 text-center space-y-8">
              <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto">
                <CheckCircle size={48} className="text-emerald-500" strokeWidth={3} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">Conversion Complete</h3>
                <p className="text-slate-400 text-sm font-medium mt-2 px-4">
                  Successfully converted {fromAmount} {fromCurrency} to {toAmount} {toCurrency}
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl font-mono text-[10px] font-bold text-slate-400 border border-slate-100 break-all">
                REF: {conversionId}
              </div>
              <button 
                onClick={onClose} 
                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-colors"
              >
                Return to Wallet
              </button>
            </div>
          )}

          {step === 'failed' && (
            <div className="py-10 text-center space-y-8">
              <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center mx-auto">
                <AlertCircle size={48} className="text-red-500" strokeWidth={3} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">Conversion Failed</h3>
                <p className="text-slate-400 text-sm font-medium mt-2 px-4">
                  {error || 'An error occurred during conversion'}
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setStep('form')} 
                  className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-[2rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                >
                  Try Again
                </button>
                <button 
                  onClick={onClose} 
                  className="flex-1 py-4 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors"
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
