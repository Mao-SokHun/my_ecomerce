import { Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col overflow-x-clip relative bg-slate-50/60 dark:bg-[#0a0c16] text-gray-900 dark:text-gray-100">
      {/* Futuristic Ambient Liquid Glass Glow Mesh Layer */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden>
        <div className="absolute top-[-12%] left-[-10%] w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-primary-500/20 via-indigo-500/15 to-transparent blur-[120px] dark:from-primary-600/20 dark:via-indigo-600/15" />
        <div className="absolute top-[35%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-rose-400/15 via-purple-500/12 to-transparent blur-[130px] dark:from-purple-600/18 dark:via-rose-600/10" />
        <div className="absolute bottom-[-10%] left-[25%] w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-sky-400/15 via-primary-400/10 to-transparent blur-[140px] dark:from-sky-600/15 dark:via-primary-600/12" />
      </div>

      <Suspense fallback={<header className="fixed top-0 left-0 right-0 z-50 h-[7.25rem] md:h-16 liquid-glass" aria-hidden />}>
        <Navbar />
      </Suspense>
      <main className="flex-1 pt-[7.25rem] md:pt-16 relative z-0">{children}</main>
      <Footer />
    </div>
  );
}
