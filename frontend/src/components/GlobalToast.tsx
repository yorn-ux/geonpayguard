'use client';

import { useNotificationStore } from '@/store/useNotificationStore';
import { X, Info, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function GlobalToast() {
  const store = useNotificationStore();
  
  const activeToast = store?.activeToast || null;
  const dismissToast = store?.dismissToast || (() => {});
  
  const [isVisible, setIsVisible] = useState(false);
  const [currentToast, setCurrentToast] = useState(activeToast);

  useEffect(() => {
    if (activeToast && activeToast !== currentToast) {
      setCurrentToast(activeToast);
      setIsVisible(true);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          setCurrentToast(null);
        }, 200);
      }, 4000);

      return () => clearTimeout(timer);
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
      text: 'text-blue-800'
    },
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: 'text-emerald-600',
      text: 'text-emerald-800'
    },
    error: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      icon: 'text-rose-600',
      text: 'text-rose-800'
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'text-amber-600',
      text: 'text-amber-800'
    }
  };

  const Icons = {
    info: <Info size={18} className="text-blue-600" />,
    success: <CheckCircle2 size={18} className="text-emerald-600" />,
    error: <AlertCircle size={18} className="text-rose-600" />,
    warning: <AlertTriangle size={18} className="text-amber-600" />
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
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
      isVisible 
        ? 'opacity-100 translate-y-0' 
        : 'opacity-0 translate-y-2 pointer-events-none'
    }`}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${style.bg} ${style.border}`}>
        {Icons[toastType]}
        <p className={`text-sm font-medium ${style.text} max-w-xs`}>
          {currentToast.message}
        </p>
        <button 
          onClick={handleClose} 
          className={`ml-2 p-1 rounded-full hover:bg-white/50 transition-colors ${style.text} opacity-70 hover:opacity-100`}
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}