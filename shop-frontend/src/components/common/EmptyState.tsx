'use client';

import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  secondaryActionText?: string;
  secondaryActionOnClick?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  actionHref,
  secondaryActionText,
  secondaryActionOnClick,
}: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-surface-800 flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-gray-300 dark:text-gray-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-xs mb-8">
        {description}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3">
        {actionText && actionHref && (
          <Link href={actionHref} className="btn-primary px-8">
            {actionText}
          </Link>
        )}
        {secondaryActionText && secondaryActionOnClick && (
          <button 
            onClick={secondaryActionOnClick}
            className="btn-secondary px-8"
          >
            {secondaryActionText}
          </button>
        )}
      </div>
    </motion.div>
  );
}
