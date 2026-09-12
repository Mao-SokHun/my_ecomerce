'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  dotColor?: string;
  badgeClass?: string;
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  size?: 'xs' | 'sm' | 'md';
  disabled?: boolean;
  align?: 'left' | 'right';
  icon?: React.ReactNode;
}

export function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  size = 'sm',
  disabled = false,
  align = 'left',
  icon,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Size styling classes with generous left padding for rounded corners & dots
  const sizeClasses = {
    xs: 'h-8 text-[11px] sm:text-xs pl-3.5 pr-2.5 rounded-lg gap-2 font-medium',
    sm: 'h-9 text-xs sm:text-sm pl-4 pr-3 rounded-xl gap-2 font-medium',
    md: 'h-10 text-sm pl-4 pr-3.5 rounded-xl gap-2.5 font-medium',
  }[size];

  const dotSize = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-2.5 h-2.5',
  }[size];

  const menuMinW = {
    xs: 'min-w-[150px]',
    sm: 'min-w-[170px]',
    md: 'min-w-[190px]',
  }[size];

  const itemPadding = {
    xs: 'px-3 py-1.5 text-xs rounded-lg gap-2',
    sm: 'px-3.5 py-2 text-xs sm:text-sm rounded-lg gap-2.5',
    md: 'px-4 py-2 text-sm rounded-xl gap-2.5',
  }[size];

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between transition-all duration-200 select-none border cursor-pointer ${sizeClasses} ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            : isOpen
            ? 'bg-white dark:bg-slate-900 border-primary-500 ring-2 ring-primary-500/20 text-slate-900 dark:text-white shadow-sm'
            : 'bg-white dark:bg-slate-900/90 border-slate-200/90 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 shadow-2xs'
        } ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0">
          {selectedOption?.icon ? (
            <span className="shrink-0">{selectedOption.icon}</span>
          ) : icon ? (
            <span className="shrink-0 text-slate-400 dark:text-slate-500">{icon}</span>
          ) : selectedOption?.dotColor ? (
            <span
              className={`${dotSize} rounded-full shrink-0 shadow-xs ring-2 ring-black/5 dark:ring-white/10`}
              style={{ backgroundColor: selectedOption.dotColor }}
            />
          ) : null}
          <span className="truncate leading-normal font-semibold text-slate-800 dark:text-slate-100">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200 ml-2 ${
            isOpen ? 'rotate-180 text-primary-600 dark:text-primary-400' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute z-50 mt-1 ${menuMinW} max-h-64 overflow-y-auto bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-750 rounded-xl shadow-lg shadow-slate-900/10 dark:shadow-black/60 p-1 ring-1 ring-black/5 focus:outline-none ${
              align === 'right' ? 'right-0' : 'left-0'
            } ${menuClassName}`}
            role="listbox"
          >
            <div className="space-y-0.5">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between ${itemPadding} font-medium transition-all duration-150 text-left ${
                      isSelected
                        ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-bold shadow-2xs'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0">
                      {option.icon ? (
                        <span className="shrink-0">{option.icon}</span>
                      ) : option.dotColor ? (
                        <span
                          className={`${dotSize} rounded-full shrink-0 shadow-xs ring-2 ring-black/5 dark:ring-white/10`}
                          style={{ backgroundColor: option.dotColor }}
                        />
                      ) : null}
                      <span className="truncate leading-normal">{option.label}</span>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 shrink-0 ml-1.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
