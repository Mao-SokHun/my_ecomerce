import { Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col overflow-x-clip">
      <Suspense fallback={<header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/90 dark:bg-surface-950 border-b border-gray-100 dark:border-gray-800" aria-hidden />}>
        <Navbar />
      </Suspense>
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  );
}
