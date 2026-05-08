'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the error visible in console for debugging.
    console.error(error);
  }, [error]);

  return (
    <div className="page-container py-20 text-center">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h2>
      <p className="text-gray-500 mb-6">Please try again. If it continues, refresh the page.</p>
      <div className="flex items-center justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary text-sm">
          Try Again
        </button>
        <Link href="/" className="btn-secondary text-sm">
          Go Home
        </Link>
      </div>
    </div>
  );
}
