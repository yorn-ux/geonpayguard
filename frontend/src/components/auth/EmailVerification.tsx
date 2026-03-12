'use client';

import  { useState, useEffect, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { Mail, Loader2, RefreshCw, ArrowLeft, ShieldCheck, Timer, Edit3 } from 'lucide-react';

interface EmailVerificationProps {
  email: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
  isVerifying: boolean;
}

export function EmailVerification({ 
  email, 
  onVerify, 
  onResend, 
  onBack, 
  isVerifying 
}: EmailVerificationProps) {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [timer, setTimer] = useState<number>(300); // 5 minutes
  const [isResending, setIsResending] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // 1. Countdown Timer Logic
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // 2. Auto-Submit Logic
  const lastSubmitted = useRef<string>('');

  useEffect(() => {
    const fullCode = code.join('');
    if (fullCode.length === 6 && !isVerifying && fullCode !== lastSubmitted.current) {
      lastSubmitted.current = fullCode;
      onVerify(fullCode);
    }
  }, [code, isVerifying, onVerify]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    if (pastedData.length > 0) {
      const newCode = [...code];
      pastedData.forEach((char, i) => {
        newCode[i] = char;
      });
      setCode(newCode);
      const nextIndex = pastedData.length < 6 ? pastedData.length : 5;
      inputs.current[nextIndex]?.focus();
    }
  };

  const handleResendClick = async () => {
    setIsResending(true);
    await onResend();
    setTimer(300);
    setIsResending(false);
  };

  return (
    <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[40px] shadow-2xl shadow-slate-200/50 border border-white max-w-md w-full animate-in fade-in zoom-in duration-500 relative">
      
      {/* Top Header Controls */}
      <div className="flex justify-between items-center absolute left-8 right-8 top-8">
        <button 
          onClick={onBack}
          className="text-slate-400 hover:text-[#1A1C21] transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
        >
          <ArrowLeft size={14} /> Back
        </button>
        
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
           <div className={`w-1.5 h-1.5 rounded-full ${timer > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Secure Link</span>
        </div>
      </div>

      <div className="text-center mb-10 mt-6">
        <div className="inline-flex w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl items-center justify-center mb-6 relative group transition-transform hover:scale-105">
          <Mail size={32} />
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#1A1C21] rounded-full flex items-center justify-center border-2 border-white shadow-lg">
            <ShieldCheck size={12} className="text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-[#1A1C21] tracking-tight">Identity Check</h2>
        
        <div className="mt-3 px-4">
          <p className="text-slate-400 text-sm font-medium">
            Enter the security PIN dispatched to:
          </p>
          <div className="flex flex-col items-center gap-1 mt-1">
            <span className="text-[#1A1C21] font-bold break-all">
              {email}
            </span>
            <button 
              onClick={onBack}
              className="flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 uppercase tracking-widest transition-opacity hover:opacity-80"
            >
              <Edit3 size={10} /> Wrong email?
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex justify-between gap-2 sm:gap-3">
          {code.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onPaste={handlePaste}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-full h-14 sm:h-16 text-center text-2xl font-black bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-500/5 outline-none transition-all text-[#1A1C21] disabled:opacity-50"
              disabled={isVerifying}
              autoFocus={i === 0}
            />
          ))}
        </div>

        <button
          onClick={() => onVerify(code.join(''))}
          disabled={code.some(d => d === '') || isVerifying}
          className="w-full py-5 bg-[#1A1C21] text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] hover:bg-rose-600 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-3 shadow-xl"
        >
          {isVerifying ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>Verifying Protocol...</span>
            </>
          ) : (
            "Authorize Identity"
          )}
        </button>

        <div className="text-center pt-2">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">
              <Timer size={12} />
              <span>Expires in {formatTime(timer)}</span>
            </div>
            
            <button
              type="button"
              onClick={handleResendClick}
              disabled={timer > 240 || isResending}
              className="group text-[11px] font-black text-rose-600 hover:text-[#1A1C21] disabled:text-slate-300 transition-colors flex items-center gap-2 uppercase tracking-widest"
            >
              {isResending ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} className={timer <= 240 ? "animate-pulse" : ""} />}
              Request New PIN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}