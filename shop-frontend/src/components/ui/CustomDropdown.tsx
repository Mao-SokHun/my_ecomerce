'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  placement?: 'auto' | 'top' | 'bottom';
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
  placement = 'auto',
  icon,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; isUpward: boolean }>({
    top: 0,
    left: 0,
    width: 0,
    isUpward: false,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
        : spaceBelow < 220 && spaceAbove > spaceBelow;

    const minW = size === 'xs' ? 130 : size === 'sm' ? 150 : 170;
    const targetWidth = Math.max(rect.width, minW);

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
  }, [align, placement, size]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updateCoords();
    }
    setIsOpen((prev) => !prev);
  };

  // Close on click outside & update position on scroll/resize
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

    const handleScrollOrResize = () => {
      updateCoords();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updateCoords]);

  // Size styling classes - luxury, modern & refined
  const sizeClasses = {
    xs: 'h-7 text-[11px] pl-2.5 pr-2 rounded-lg gap-1.5 font-medium tracking-tight',
    sm: 'h-8.5 text-xs pl-3 pr-2.5 rounded-xl gap-2 font-medium',
    md: 'h-10 text-xs sm:text-sm pl-3.5 pr-3 rounded-xl gap-2.5 font-medium',
  }[size];

  const dotSize = {
    xs: 'w-2 h-2',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  }[size];

  const chevronSize = {
    xs: 'w-3 h-3 ml-1',
    sm: 'w-3.5 h-3.5 ml-1',
    md: 'w-4 h-4 ml-1.5',
  }[size];

  const itemPadding = {
    xs: 'px-2.5 py-1.5 text-[11px] rounded-lg gap-1.5',
    sm: 'px-3 py-2 text-xs rounded-xl gap-2',
    md: 'px-3.5 py-2.5 text-xs sm:text-sm rounded-xl gap-2.5',
  }[size];

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between transition-all duration-200 select-none border cursor-pointer backdrop-blur-sm ${sizeClasses} ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400'
            : isOpen
            ? 'bg-white dark:bg-[#161c28] border-primary-500/80 ring-2 ring-primary-500/25 text-slate-900 dark:text-white shadow-md shadow-primary-500/10'
            : 'bg-white/90 dark:bg-[#131822]/90 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#18202d] shadow-2xs hover:shadow-sm'
        } ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5 truncate min-w-0">
          {selectedOption?.icon ? (
            <span className="shrink-0">{selectedOption.icon}</span>
          ) : icon ? (
            <span className="shrink-0 text-slate-400 dark:text-slate-500">{icon}</span>
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
            isOpen ? 'rotate-180 text-primary-600 dark:text-primary-400' : ''
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
                className={`max-h-64 overflow-y-auto bg-white/98 dark:bg-[#121722]/98 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-2xl shadow-black/60 p-1.5 ring-1 ring-black/5 dark:ring-white/5 focus:outline-none custom-scrollbar ${menuClassName}`}
                role="listbox"
              >
                <div className="space-y-1">
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
                            ? 'bg-primary-500/10 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400 font-bold shadow-2xs border border-primary-500/20'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/90 dark:hover:bg-[#1c2433] hover:text-slate-900 dark:hover:text-white border border-transparent'
                        }`}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          {option.icon ? (
                            <span className="shrink-0">{option.icon}</span>
                          ) : option.dotColor ? (
                            <span className="relative flex items-center justify-center shrink-0">
                              <span
                                className={`${dotSize} rounded-full shrink-0 shadow-xs ring-2 ring-black/5 dark:ring-white/10`}
                                style={{ backgroundColor: option.dotColor }}
                              />
                            </span>
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
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
