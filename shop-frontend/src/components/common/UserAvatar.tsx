'use client';

import type { CSSProperties } from 'react';
import Image from 'next/image';
import { cn, getInitials } from '@/lib/utils';

const SIZE_STYLES = {
  xs: { box: 'w-7 h-7 min-w-7 min-h-7', text: 'text-[10px] font-bold', imageSizes: '28px' },
  sm: { box: 'w-8 h-8 min-w-8 min-h-8', text: 'text-[11px] font-bold', imageSizes: '32px' },
  md: { box: 'w-16 h-16 min-w-16 min-h-16', text: 'text-lg font-semibold tracking-tight', imageSizes: '64px' },
  lg: { box: 'w-20 h-20 min-w-20 min-h-20', text: 'text-2xl font-semibold tracking-tight', imageSizes: '80px' },
} as const;

function gradientForName(name: string): CSSProperties {
  const s = name.trim() || '?';
  let h = 210;
  for (let i = 0; i < s.length; i++) {
    h = (h + s.charCodeAt(i) * (i * 7 + 13)) % 360;
  }
  const h2 = (h + 38 + (s.length % 20)) % 360;
  return {
    background: `linear-gradient(145deg, hsl(${h} 58% 46%) 0%, hsl(${h2} 52% 36%) 100%)`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
  };
}

export type UserAvatarSize = keyof typeof SIZE_STYLES;

type UserAvatarProps = {
  name: string;
  src?: string | null;
  size?: UserAvatarSize;
  className?: string;
  priority?: boolean;
  /** Empty string when the parent control already has an accessible name (e.g. nav menu button). */
  photoAlt?: string;
};

/**
 * Profile / menu avatar: photo or a deterministic gradient + initials (no flat solid circle).
 */
export function UserAvatar({ name, src, size = 'md', className, priority, photoAlt }: UserAvatarProps) {
  const displayName = name.trim() || '?';
  const initials = getInitials(displayName) || displayName.slice(0, 2).toUpperCase() || '?';
  const s = SIZE_STYLES[size];

  return (
    <div
      className={cn(
        'relative shrink-0 rounded-full overflow-hidden flex items-center justify-center text-white',
        'ring-2 ring-white/95 dark:ring-gray-600/90 shadow-premium',
        'motion-safe:transition-transform motion-safe:duration-200',
        s.box,
        src ? 'bg-gray-100 dark:bg-gray-800' : '',
        className,
      )}
      style={!src ? gradientForName(displayName) : undefined}
    >
      {src ? (
        <Image
          src={src}
          alt={photoAlt !== undefined ? photoAlt : displayName}
          fill
          className="object-cover"
          sizes={s.imageSizes}
          priority={priority}
        />
      ) : (
        <span className={cn('tabular-nums drop-shadow-sm', s.text)}>{initials}</span>
      )}
    </div>
  );
}
