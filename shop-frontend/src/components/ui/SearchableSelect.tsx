'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  emptyMessage?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  required = false,
  emptyMessage = 'No options',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label || '';

  const filtered = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch('');
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && value && listRef.current) {
      const active = listRef.current.querySelector('[data-active="true"]');
      if (active) active.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, value]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    close();
  };

  return (
    <div ref={containerRef} className="relative">
      {required && <input type="text" required value={value} onChange={() => {}} className="sr-only" tabIndex={-1} aria-hidden />}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm rounded-xl border transition-all duration-200 ${
          disabled
            ? 'bg-gray-50 dark:bg-surface-800/50 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed'
            : isOpen
              ? 'border-primary-500 ring-2 ring-primary-500/20 bg-white dark:bg-surface-900 text-gray-900 dark:text-white'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-900 text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <span className={`truncate ${!value ? 'text-gray-400' : ''}`}>
          {value ? selectedLabel : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white dark:bg-surface-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl shadow-gray-200/50 dark:shadow-black/40 overflow-hidden"
          >
            {/* Search input */}
            {options.length > 5 && (
              <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ស្វែងរក..."
                    className="w-full pl-8 pr-8 py-2 text-sm bg-gray-50 dark:bg-surface-800 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Options list */}
            <div ref={listRef} className="max-h-52 overflow-y-auto overscroll-contain py-1">
              {filtered.length === 0 ? (
                <p className="px-3.5 py-4 text-sm text-gray-400 text-center">{emptyMessage}</p>
              ) : (
                filtered.map((option) => {
                  const isActive = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      data-active={isActive}
                      onClick={() => handleSelect(option.value)}
                      className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-left transition-colors duration-100 ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-surface-800'
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                      {isActive && <Check className="w-4 h-4 shrink-0 text-primary-600" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
