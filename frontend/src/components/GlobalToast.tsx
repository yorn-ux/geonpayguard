'use client';

import { useNotificationStore } from '@/store/useNotificationStore';
import { X, Info, CheckCircle2, AlertCircle, AlertTriangle, Zap,  } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function GlobalToast() {
  const store = useNotificationStore();
  
  const activeToast = store?.activeToast || null;
  const dismissToast = store?.dismissToast || (() => {});
  
  const [isVisible, setIsVisible] = useState(false);
  const [currentToast, setCurrentToast] = useState(activeToast);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (activeToast && activeToast !== currentToast) {
      setCurrentToast(activeToast);
      setIsVisible(true);
      setProgress(100);
      
      const startTime = Date.now();
      const duration = 4000;
      
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);
      }, 50);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        clearInterval(progressInterval);
        setTimeout(() => {
          setCurrentToast(null);
        }, 200);
      }, duration);

      return () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
      };
    } else if (!activeToast && currentToast) {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentToast(null);
      }, 200);
    }
  }, [activeToast, currentToast]);

  if (!currentToast || !currentToast.message || !currentToast.type) {
    return null;
  }

  const styles = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      text: 'text-blue-800',
      progress: 'bg-blue-500',
      gradient: 'from-blue-500 to-blue-600',
      glow: 'shadow-blue-200'
    },
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: 'text-emerald-600',
      text: 'text-emerald-800',
      progress: 'bg-emerald-500',
      gradient: 'from-emerald-500 to-emerald-600',
      glow: 'shadow-emerald-200'
    },
    error: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      icon: 'text-rose-600',
      text: 'text-rose-800',
      progress: 'bg-rose-500',
      gradient: 'from-rose-500 to-rose-600',
      glow: 'shadow-rose-200'
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'text-amber-600',
      text: 'text-amber-800',
      progress: 'bg-amber-500',
      gradient: 'from-amber-500 to-amber-600',
      glow: 'shadow-amber-200'
    }
  };

  const Icons = {
    info: <Info size={18} className="text-blue-600" strokeWidth={1.5} />,
    success: <CheckCircle2 size={18} className="text-emerald-600" strokeWidth={1.5} />,
    error: <AlertCircle size={18} className="text-rose-600" strokeWidth={1.5} />,
    warning: <AlertTriangle size={18} className="text-amber-600" strokeWidth={1.5} />
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      dismissToast();
      setCurrentToast(null);
    }, 200);
  };

  const toastType = currentToast.type as keyof typeof styles;
  const style = styles[toastType];

  if (!style) {
    console.error('Invalid toast type:', currentToast.type);
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Toast Container */}
      <div 
        className={`relative overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 transform ${
          isVisible 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}
      >
        {/* Top Gradient Bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${style.gradient}`} />
        
        {/* Main Toast Content */}
        <div className={`${style.bg} border ${style.border} backdrop-blur-sm`}>
          <div className="flex items-start gap-4 p-4">
            {/* Icon Container */}
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center border ${style.border}`}>
                {Icons[toastType]}
              </div>
            </div>
            
            {/* Message Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${style.text} leading-relaxed`}>
                {currentToast.message}
              </p>
              <p className={`text-xs ${style.text} opacity-70 mt-0.5`}>
                {currentToast.type === 'success' && 'Operation completed successfully'}
                {currentToast.type === 'error' && 'Please try again or contact support'}
                {currentToast.type === 'warning' && 'Action may be required'}
                {currentToast.type === 'info' && 'For your information'}
              </p>
            </div>
            
            {/* Close Button */}
            <button 
              onClick={handleClose} 
              className={`flex-shrink-0 w-6 h-6 rounded-full bg-white/80 border ${style.border} flex items-center justify-center hover:bg-white transition-all ${style.text} opacity-70 hover:opacity-100 shadow-sm`}
              aria-label="Dismiss notification"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="relative h-1 w-full bg-white/50 overflow-hidden">
            <div 
              className={`absolute top-0 left-0 h-full ${style.progress} transition-all duration-100 ease-linear`}
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Footer Timestamp */}
          <div className={`px-4 py-1.5 border-t ${style.border} bg-white/30 flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <Zap size={10} className={style.icon} />
              <span className={`text-[8px] font-medium uppercase tracking-wider ${style.text} opacity-60`}>
                GeonPayGuard
              </span>
            </div>
            <span className={`text-[8px] ${style.text} opacity-40`}>
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        
        {/* Glow Effect */}
        <div className={`absolute -inset-1 -z-10 rounded-3xl blur-xl opacity-30 ${style.glow} transition-opacity`} />
      </div>
    </div>
  );
}