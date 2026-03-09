'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'info', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const borderColor = {
    success: 'border-l-node-user',
    error: 'border-l-red-500',
    info: 'border-l-ink-3',
  }[type];

  return (
    <div className={`animate-slide-up fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-white border border-surface-2 border-l-2 ${borderColor} px-4 py-2.5 shadow-sm`}>
      <p className="text-xs text-ink-1 whitespace-nowrap">{message}</p>
    </div>
  );
}
