'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0.96 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0.98 }}
        transition={{ duration: 0.12, ease: 'linear' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
