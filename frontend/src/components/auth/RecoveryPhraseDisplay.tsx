'use client';

import  { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Copy, CheckCircle2, 
  ShieldCheck, Eye, EyeOff, Download,
  AlertTriangle, ArrowLeft, Loader2, Key, Printer
} from 'lucide-react';

interface RecoveryProps {
  phrase: string;
  operatorId: string;
  onComplete: () => void;
}

export function RecoveryPhraseDisplay({ phrase, operatorId, onComplete }: RecoveryProps) {
  const [copied, setCopied] = useState(false);
  const [, setDownloaded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [step, setStep] = useState<'view' | 'verify'>('view');
  const [verificationWords, setVerificationWords] = useState<number[]>([]);
  const [verificationStep, setVerificationStep] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [error, setError] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  // 1. SAFE WORD SPLITTING & INITIALIZATION
  const words = useMemo(() => (phrase ? phrase.trim().split(/\s+/) : []), [phrase]);

  useEffect(() => {
    // Artificial delay to feel "cryptographic" but ensure we have data
    const timer = setTimeout(() => {
      if (words.length >= 12) {
        setIsInitializing(false);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [words]);

  // 2. SHUFFLE LOGIC (Triggered when entering verify mode)
  useEffect(() => {
    if (step === 'verify' && words.length >= 12) {
      const indices: number[] = [];
      const pool = Array.from({ length: words.length }, (_, i) => i);
      
      while (indices.length < 3) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        indices.push(pool.splice(randomIndex, 1)[0]);
      }
      setVerificationWords(indices.sort((a, b) => a - b));
    }
  }, [step, words.length]);

  const handleCopy = useCallback(() => {
    if (!phrase) return;
    navigator.clipboard.writeText(phrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [phrase]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!phrase) return;
    const element = document.createElement('a');
    const content = `AETHEL PROTOCOL - RECOVERY MASTER KEY\nOPERATOR ID: ${operatorId}\nDATE: ${new Date().toLocaleDateString()}\n\nRECOVERY PHRASE:\n${phrase}\n\nWARNING: Store this file offline. Delete after printing.`;
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `geon-keys-${operatorId.slice(0, 6)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setDownloaded(true);
  };

  const handleVerify = () => {
    const targetIndex = verificationWords[verificationStep];
    const correctWord = words[targetIndex];
    
    if (userInput.trim().toLowerCase() === correctWord.toLowerCase()) {
      setError('');
      if (verificationStep === 2) {
        onComplete();
      } else {
        setVerificationStep(prev => prev + 1);
        setUserInput('');
      }
    } else {
      setError(`Verification failed for word #${targetIndex + 1}`);
      setUserInput('');
    }
  };

  // --- LOADING STATE / ERROR HANDLER ---
  if (isInitializing || !phrase || words.length < 12) {
    return (
      <div className="bg-white p-12 rounded-[40px] shadow-2xl border border-slate-100 max-w-xl w-full flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <Loader2 size={48} className="text-rose-500 animate-spin" />
          <Key size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-rose-500" />
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Identity Layer</p>
          <h2 className="text-xl font-black text-[#1A1C21]">
            {!phrase ? "Awaiting Handshake..." : "Hardening Vault Keys"}
          </h2>
          {!phrase && <p className="text-xs text-slate-400 mt-2">Checking secure buffer for phrase data...</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-2xl border border-slate-100 max-w-xl w-full animate-in fade-in zoom-in-95 duration-500 print:shadow-none print:border-none">
      
      {/* Header - Hidden on Print */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#1A1C21] rounded-2xl flex items-center justify-center shadow-xl shadow-slate-200">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#1A1C21] tracking-tight">
              {step === 'view' ? 'Secure Backup' : 'Confirm Access'}
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Operator: {operatorId.slice(0, 8)}...
            </p>
          </div>
        </div>
        {step === 'verify' && (
          <button 
            onClick={() => { setStep('view'); setVerificationStep(0); setUserInput(''); }}
            className="p-3 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        )}
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block text-center border-b pb-8 mb-8">
        <h1 className="text-2xl font-bold uppercase tracking-widest">Aethel Protocol Recovery Key</h1>
        <p className="text-sm font-mono mt-2">ID: {operatorId}</p>
      </div>

      {step === 'view' ? (
        <div className="space-y-8">
          <div className="bg-amber-50 border-2 border-amber-100 rounded-3xl p-5 flex gap-4 print:bg-white print:border-slate-200">
            <AlertTriangle size={24} className="text-amber-500 shrink-0 print:text-black" />
            <p className="text-[13px] text-amber-900 leading-relaxed font-medium print:text-black">
              This phrase is the <span className="font-bold underline">only way</span> to recover your vault. If lost, your data cannot be recovered.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 print:grid-cols-3">
            {words.map((word, i) => (
              <div key={i} className="group relative bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl print:bg-white print:border-slate-300">
                <span className="absolute top-2 left-3 text-[9px] font-black text-slate-300 print:text-black">{i + 1}</span>
                <p className={`text-sm font-mono font-black text-center mt-2 ${revealed ? 'text-[#1A1C21] blur-0' : 'text-slate-200 blur-sm select-none print:blur-0 print:text-black'}`}>
                  {word}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-4 print:hidden">
            <button
              onClick={() => setRevealed(!revealed)}
              className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-black text-slate-500 hover:text-rose-600 transition-all uppercase tracking-widest"
            >
              {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
              {revealed ? 'Mask Keys' : 'Reveal Keys'}
            </button>

            <div className="grid grid-cols-3 gap-3">
              <button onClick={handleCopy} className="flex flex-col items-center gap-2 py-4 bg-slate-50 rounded-2xl text-[9px] font-black uppercase tracking-tighter">
                {copied ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} />}
                Copy
              </button>
              <button onClick={handleDownload} className="flex flex-col items-center gap-2 py-4 bg-slate-50 rounded-2xl text-[9px] font-black uppercase tracking-tighter">
                <Download size={18} />
                Save
              </button>
              <button onClick={handlePrint} className="flex flex-col items-center gap-2 py-4 bg-slate-50 rounded-2xl text-[9px] font-black uppercase tracking-tighter">
                <Printer size={18} />
                Print
              </button>
            </div>

            <button
              onClick={() => setStep('verify')}
              className="w-full py-6 bg-[#1A1C21] text-white rounded-[28px] font-black text-[13px] uppercase tracking-[0.2em] hover:bg-rose-600 shadow-xl transition-all"
            >
              I have saved these words →
            </button>
          </div>
        </div>
      ) : (
        /* Verification Flow */
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
          <div className="text-center space-y-3">
            <div className="inline-flex px-4 py-1.5 bg-rose-50 rounded-full text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">
              Verification {verificationStep + 1}/3
            </div>
            <h3 className="text-xl font-black text-[#1A1C21]">Security Check</h3>
            <p className="text-sm text-slate-500">
              Enter word <span className="text-rose-600 font-black">#{verificationWords[verificationStep] + 1}</span> from your backup.
            </p>
          </div>

          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className={`w-full p-6 bg-slate-50 border-2 rounded-3xl text-center font-mono font-black text-xl outline-none transition-all ${error ? 'border-rose-500 bg-rose-50 animate-shake' : 'border-slate-100 focus:border-[#1A1C21]'}`}
            placeholder="Enter word..."
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && userInput && handleVerify()}
          />

          {error && <p className="text-center text-rose-600 text-[10px] font-black uppercase tracking-widest">{error}</p>}

          <button
            onClick={handleVerify}
            disabled={!userInput}
            className="w-full py-6 bg-[#1A1C21] text-white rounded-[28px] font-black text-[13px] uppercase tracking-[0.2em] hover:bg-rose-600 disabled:opacity-20 transition-all"
          >
            {verificationStep === 2 ? 'Complete Setup' : 'Verify Word'}
          </button>
        </div>
      )}
    </div>
  );
}