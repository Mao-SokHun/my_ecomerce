'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguageStore } from '@/store/languageStore';

interface CopyableOrderCodeProps {
  code: string;
  onClick?: () => void;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'ghost' | 'link' | 'plain';
  showCopyAlways?: boolean;
  truncate?: boolean;
}

export function CopyableOrderCode({
  code,
  onClick,
  className = '',
  size = 'sm',
  variant = 'badge',
  showCopyAlways = true,
  truncate = false,
}: CopyableOrderCodeProps) {
  const [copied, setCopied] = useState(false);
  const { language } = useLanguageStore();
  const isKhmer = language === 'km';

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      setCopied(true);
      toast.success(
        isKhmer ? `📋 បានចម្លងលេខកូដ: ${code}` : `📋 Copied Order Code: ${code}`,
        { id: `copy-${code}`, duration: 2500 }
      );
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(isKhmer ? 'មិនអាចចម្លងបានទេ' : 'Failed to copy');
    }
  };

  const sizeClasses = {
    xs: 'text-[11px] py-0.5 px-2 gap-1.5',
    sm: 'text-xs py-1 px-2.5 gap-1.5',
    md: 'text-sm py-1.5 px-3 gap-2',
    lg: 'text-base py-2 px-3.5 gap-2.5',
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4.5 h-4.5',
  };

  const variantClasses = {
    badge:
      'bg-indigo-50/80 hover:bg-indigo-100/90 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50 rounded-lg shadow-2xs transition-all duration-200',
    ghost:
      'hover:bg-slate-100 dark:hover:bg-surface-800 text-slate-700 dark:text-slate-200 rounded-lg transition-all duration-200',
    link:
      'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-bold',
    plain:
      'text-slate-900 dark:text-white',
  };

  return (
    <div
      className={`inline-flex items-center group relative font-mono font-bold tracking-tight select-all ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {/* Code Text (clickable if onClick passed) */}
      {onClick ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className={`text-left hover:underline cursor-pointer focus:outline-none ${truncate ? 'truncate max-w-[140px] sm:max-w-[200px]' : ''}`}
          title={isKhmer ? 'ចុចដើម្បីមើលលម្អិត' : 'Click to view details'}
        >
          {code}
        </button>
      ) : (
        <span className={`${truncate ? 'truncate max-w-[140px] sm:max-w-[200px]' : ''}`}>
          {code}
        </span>
      )}

      {/* Copy Button */}
      <button
        type="button"
        onClick={handleCopy}
        className={`p-1 rounded-md transition-all duration-200 flex items-center justify-center cursor-pointer shrink-0 ${
          copied
            ? 'bg-emerald-500 text-white shadow-xs'
            : showCopyAlways
              ? 'text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200/50 dark:hover:bg-indigo-900/80'
              : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60 dark:hover:bg-surface-700'
        }`}
        title={isKhmer ? (copied ? 'បានចម្លងរួចរាល់' : 'ចុចដើម្បីចម្លងលេខកូដ') : copied ? 'Copied!' : 'Click to copy order code'}
      >
        {copied ? (
          <Check className={`${iconSizes[size]} animate-in zoom-in-75 duration-150 stroke-[2.5]`} />
        ) : (
          <Copy className={`${iconSizes[size]} stroke-[2]`} />
        )}
      </button>
    </div>
  );
}
