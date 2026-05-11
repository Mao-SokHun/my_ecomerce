'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

/**
 * Route change: previous view unmounts immediately (no exit wait).
 * Enter is a very short opacity nudge so navigation feels instant.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0.985 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.08, ease: 'linear' }}
      className="min-h-[100dvh]"
    >
      {children}
    </motion.div>
  );
}
