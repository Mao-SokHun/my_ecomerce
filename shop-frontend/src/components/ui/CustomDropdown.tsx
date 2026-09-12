'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  dotColor?: string;
  badgeClass?: string;
  description?: string;
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  align?: 'left' | 'right';
  placement?: 'auto' | 'top' | 'bottom';
  icon?: React.ReactNode;
  minMenuWidth?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  variant?: 'default' | 'luxury';
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
  placement = 'auto',
  icon,
  minMenuWidth,
  searchable = false,
  searchPlaceholder = 'Search...',
  variant = 'luxury',
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; isUpward: boolean }>({
    top: 0,
    left: 0,
    width: 0,
    isUpward: false,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update floating portal position
  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const isUpward =
      placement === 'top'
        ? true
        : placement === 'bottom'
        ? false
        : spaceBelow < 240 && spaceAbove > spaceBelow;

    const defaultMinW = size === 'xs' ? 140 : size === 'sm' ? 180 : 220;
    const targetWidth = Math.max(rect.width, minMenuWidth || defaultMinW);

    let left = align === 'right' ? rect.right - targetWidth : rect.left;
    // Keep inside viewport horizontal bounds
    if (left + targetWidth > window.innerWidth - 8) {
      left = window.innerWidth - targetWidth - 8;
    }
    if (left < 8) left = 8;

    const top = isUpward ? rect.top - 6 : rect.bottom + 6;

    setCoords({
      top,
      left,
      width: targetWidth,
      isUpward,
    });
  }, [align, placement, size, minMenuWidth]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      setSearchQuery('');
      updateCoords();
    }
    setIsOpen((prev) => !prev);
  };

  // Close on click outside, Esc key & update position on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleScrollOrResize = () => {
      updateCoords();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updateCoords]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && (searchable || options.length >= 8)) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 60);
    }
  }, [isOpen, searchable, options.length]);

  // Filter options if search query exists
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    return options.filter((o) =>
      o.label.toLowerCase().includes(query) || (o.description && o.description.toLowerCase().includes(query))
    );
  }, [options, searchQuery]);

  // Size styling classes - luxury, modern & refined
  const sizeClasses = {
    xs: 'h-7 text-[11px] pl-2.5 pr-2 rounded-lg gap-1.5 font-medium tracking-tight',
    sm: 'h-8.5 text-xs pl-3 pr-2.5 rounded-xl gap-2 font-medium',
    md: 'h-10 text-xs sm:text-sm pl-3.5 pr-3 rounded-xl gap-2.5 font-medium',
    lg: 'h-11 text-sm pl-4 pr-3.5 rounded-2xl gap-3 font-semibold',
  }[size];

  const dotSize = {
    xs: 'w-2 h-2',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  }[size];

  const chevronSize = {
    xs: 'w-3 h-3 ml-1',
    sm: 'w-3.5 h-3.5 ml-1',
    md: 'w-4 h-4 ml-1.5',
    lg: 'w-4 h-4 ml-2',
  }[size];

  const itemPadding = {
    xs: 'px-2.5 py-1.5 text-[11px] rounded-lg gap-1.5',
    sm: 'px-3 py-2 text-xs rounded-xl gap-2',
    md: 'px-3.5 py-2.5 text-xs sm:text-sm rounded-xl gap-2.5',
    lg: 'px-4 py-3 text-sm rounded-xl gap-3',
  }[size];

  const isLuxury = variant === 'luxury';

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between transition-all duration-200 select-none border cursor-pointer backdrop-blur-md ${sizeClasses} ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400'
            : isOpen
            ? isLuxury
              ? 'bg-gradient-to-b from-white via-amber-50/20 to-white dark:from-[#18202d] dark:via-[#151c27] dark:to-[#121722] border-amber-500/90 dark:border-amber-400/90 ring-2 ring-amber-500/20 dark:ring-amber-400/20 text-slate-900 dark:text-white shadow-lg shadow-amber-500/10'
              : 'bg-white dark:bg-[#161c28] border-primary-500/80 ring-2 ring-primary-500/25 text-slate-900 dark:text-white shadow-md shadow-primary-500/10'
            : isLuxury
            ? 'bg-gradient-to-b from-white/95 via-slate-50/90 to-slate-100/70 dark:from-[#151c28]/95 dark:via-[#131823]/95 dark:to-[#0f141d]/95 border-slate-200/90 dark:border-slate-700/70 hover:border-amber-500/50 dark:hover:border-amber-400/50 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-[#18202d] shadow-2xs hover:shadow-sm'
            : 'bg-white/90 dark:bg-[#131822]/90 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#18202d] shadow-2xs hover:shadow-sm'
        } ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {selectedOption?.icon ? (
            <span className="shrink-0 flex items-center">{selectedOption.icon}</span>
          ) : icon ? (
            <span className="shrink-0 text-slate-400 dark:text-slate-500 flex items-center">{icon}</span>
          ) : selectedOption?.dotColor ? (
            <span className="relative flex items-center justify-center shrink-0">
              <span
                className={`${dotSize} rounded-full shrink-0 shadow-xs ring-2 ring-black/5 dark:ring-white/10`}
                style={{ backgroundColor: selectedOption.dotColor }}
              />
            </span>
          ) : null}
          <span className="truncate leading-normal font-semibold text-slate-800 dark:text-slate-100">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`${chevronSize} text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200 ${
            isOpen
              ? isLuxury
                ? 'rotate-180 text-amber-600 dark:text-amber-400'
                : 'rotate-180 text-primary-600 dark:text-primary-400'
              : ''
          }`}
        />
      </button>

      {/* Render menu through React Portal directly into body to completely escape table overflow-hidden/scroll containers */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={menuRef}
                initial={{
                  opacity: 0,
                  y: coords.isUpward ? 6 : -6,
                  scale: 0.96,
                }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{
                  opacity: 0,
                  y: coords.isUpward ? 6 : -6,
                  scale: 0.96,
                }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'fixed',
                  left: `${coords.left}px`,
                  ...(coords.isUpward
                    ? { bottom: `${window.innerHeight - coords.top}px` }
                    : { top: `${coords.top}px` }),
                  width: `${coords.width}px`,
                  zIndex: 99999,
                }}
                className={`max-h-80 overflow-y-auto bg-white/98 dark:bg-[#0c1018]/98 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7)] p-1.5 ring-1 ring-black/5 dark:ring-white/10 focus:outline-none custom-scrollbar ${menuClassName}`}
                role="listbox"
              >
                {/* Search Header inside dropdown if enabled or list is long */}
                {(searchable || options.length >= 8) && (
                  <div className="p-1 pb-2 mb-1 border-b border-slate-100 dark:border-slate-800/80 sticky top-0 bg-white/95 dark:bg-[#0c1018]/95 backdrop-blur-md z-10">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full h-8 pl-8 pr-7 text-xs rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 focus:border-amber-500/50 dark:focus:border-amber-400/50 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  {filteredOptions.length === 0 ? (
                    <div className="py-5 px-3 text-center text-xs text-slate-400">
                      No matching options
                    </div>
                  ) : (
                    filteredOptions.map((option) => {
                      const isSelected = option.value === value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            onChange(option.value);
                            setIsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between ${itemPadding} transition-all duration-150 text-left rounded-xl ${
                            isSelected
                              ? isLuxury
                                ? 'bg-gradient-to-r from-amber-500/12 via-amber-500/6 to-transparent dark:from-amber-400/18 dark:via-amber-400/8 dark:to-transparent text-amber-950 dark:text-amber-100 font-bold shadow-2xs border border-amber-500/25 dark:border-amber-400/30'
                                : 'bg-primary-500/10 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400 font-bold shadow-2xs border border-primary-500/20'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/90 dark:hover:bg-[#18202d] hover:text-slate-900 dark:hover:text-white border border-transparent'
                          }`}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="flex items-center gap-2.5 truncate min-w-0">
                            {option.icon ? (
                              <span className="shrink-0 flex items-center">{option.icon}</span>
                            ) : option.dotColor ? (
                              <span className="relative flex items-center justify-center shrink-0">
                                <span
                                  className={`${dotSize} rounded-full shrink-0 shadow-xs ring-2 ring-black/5 dark:ring-white/10`}
                                  style={{ backgroundColor: option.dotColor }}
                                />
                              </span>
                            ) : null}

                            <div className="truncate min-w-0">
                              <div className="truncate leading-normal">{option.label}</div>
                              {option.description && (
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-tight mt-0.5 truncate">
                                  {option.description}
                                </div>
                              )}
                            </div>
                          </div>

                          {isSelected && (
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ml-2 shadow-2xs ${
                                isLuxury
                                  ? 'bg-amber-500/15 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300'
                                  : 'bg-primary-100 dark:bg-primary-900/60 text-primary-600 dark:text-primary-400'
                              }`}
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
