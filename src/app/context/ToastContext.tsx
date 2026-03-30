import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = Math.random().toString(36).slice(2);
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    const icons = {
        success: <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />,
        error: <XCircle size={18} className="text-red-500 flex-shrink-0" />,
        info: <AlertCircle size={18} className="text-indigo-500 flex-shrink-0" />,
    };

    const borders = {
        success: 'border-l-emerald-400',
        error: 'border-l-red-400',
        info: 'border-l-indigo-400',
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`flex items-start gap-3 bg-white rounded-xl shadow-xl border border-slate-100 border-l-4 ${borders[toast.type]} px-4 py-3.5 pointer-events-auto`}
                        style={{
                            animation: 'slideInRight 0.3s ease-out',
                        }}
                    >
                        {icons[toast.type]}
                        <p className="text-sm text-slate-700 font-medium flex-1 leading-relaxed">{toast.message}</p>
                        <button
                            onClick={() => dismiss(toast.id)}
                            className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0 mt-0.5"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
            <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
