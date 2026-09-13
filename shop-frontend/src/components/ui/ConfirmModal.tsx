'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, HelpCircle, Info, CheckCircle2, X } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  icon?: 'trash' | 'alert' | 'info' | 'check' | 'help';
  hideCancel?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  alert: (message: string, title?: string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof opts === 'string') {
        setOptions({
          title: 'បញ្ជាក់សកម្មភាព',
          message: opts,
          variant: 'danger',
          confirmText: 'យល់ព្រម',
          cancelText: 'បោះបង់',
        });
      } else {
        setOptions({
          title: opts.title || (opts.variant === 'danger' ? 'បញ្ជាក់ការលុប' : 'បញ្ជាក់សកម្មភាព'),
          message: opts.message,
          variant: opts.variant || 'danger',
          confirmText: opts.confirmText || (opts.variant === 'danger' ? 'លុបចេញ' : 'យល់ព្រម'),
          cancelText: opts.cancelText || 'បោះបង់',
          icon: opts.icon,
          hideCancel: opts.hideCancel || false,
        });
      }
      setResolver(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const alert = useCallback((message: string, title?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions({
        title: title || 'ដំណឹងជូនដំណឹង',
        message,
        variant: 'info',
        confirmText: 'យល់ព្រម',
        hideCancel: true,
      });
      setResolver(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolver) resolver(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolver) resolver(false);
  };

  // Keyboard navigation (Escape = Cancel, Enter = Confirm)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, resolver]);

  const variant = options.variant || 'danger';

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleCancel}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 14 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-surface-800 overflow-hidden z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Accent Stripe */}
              <div
                className={`h-1.5 w-full ${
                  variant === 'danger'
                    ? 'bg-gradient-to-r from-rose-500 via-red-500 to-amber-500'
                    : variant === 'warning'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : variant === 'success'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : 'bg-gradient-to-r from-primary-500 via-indigo-500 to-violet-500'
                }`}
              />

              <div className="p-6 sm:p-7">
                {/* Header with Icon and Close */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                        variant === 'danger'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 ring-4 ring-rose-500/5'
                          : variant === 'warning'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 ring-4 ring-amber-500/5'
                          : variant === 'success'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 ring-4 ring-emerald-500/5'
                          : 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 ring-4 ring-primary-500/5'
                      }`}
                    >
                      {options.icon === 'trash' || variant === 'danger' ? (
                        <Trash2 className="w-6 h-6" />
                      ) : options.icon === 'alert' || variant === 'warning' ? (
                        <AlertTriangle className="w-6 h-6" />
                      ) : options.icon === 'check' || variant === 'success' ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : options.icon === 'help' ? (
                        <HelpCircle className="w-6 h-6" />
                      ) : (
                        <Info className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                        {options.title}
                      </h3>
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {variant === 'danger' ? 'សកម្មភាពមិនអាចត្រឡប់ក្រោយបាន' : 'ការផ្ទៀងផ្ទាត់សុវត្ថិភាព'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancel}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-800 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Message Body */}
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-surface-850/80 border border-slate-200/60 dark:border-surface-800/80 mb-6">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed break-words whitespace-pre-line">
                    {options.message}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3">
                  {!options.hideCancel && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-700 border border-slate-200/80 dark:border-surface-700 transition active:scale-97 cursor-pointer"
                    >
                      {options.cancelText || 'បោះបង់'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleConfirm}
                    autoFocus
                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg transition active:scale-97 cursor-pointer flex items-center justify-center gap-1.5 ${
                      variant === 'danger'
                        ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:to-red-700 shadow-rose-500/25'
                        : variant === 'warning'
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/25'
                        : variant === 'success'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/25'
                        : 'bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 hover:from-primary-700 hover:to-violet-700 shadow-primary-500/25'
                    }`}
                  >
                    {variant === 'danger' && <Trash2 className="w-4 h-4" />}
                    <span>{options.confirmText || 'យល់ព្រម'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
