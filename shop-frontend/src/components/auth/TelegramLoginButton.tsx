'use client';

import { useState } from 'react';
import { useLanguageStore } from '@/store/languageStore';
import { Send } from 'lucide-react';
import { TelegramLoginModal } from './TelegramLoginModal';

type Props = {
  redirectTo: string;
  variant?: 'full' | 'compact' | 'icon';
};

export function TelegramLoginButton({ redirectTo, variant = 'full' }: Props) {
  const { language } = useLanguageStore();
  const [modalOpen, setModalOpen] = useState(false);

  if (variant === 'icon') {
    return (
      <>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          title="Telegram"
          aria-label="Telegram Login"
          className="w-full h-12 flex items-center justify-center rounded-xl border border-gray-200/80 bg-white
                     dark:bg-surface-800 dark:border-surface-700 text-[#229ED9]
                     hover:bg-[#229ED9]/10 hover:border-[#229ED9] hover:shadow-md hover:scale-[1.03]
                     active:scale-95 transition-all duration-200"
        >
          <div className="w-7 h-7 rounded-full bg-[#229ED9] text-white flex items-center justify-center shadow-sm">
            <Send className="w-3.5 h-3.5 ml-[-1px] mt-[1px]" />
          </div>
        </button>

        <TelegramLoginModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          redirectTo={redirectTo}
        />
      </>
    );
  }

  const label =
    language === 'km'
      ? 'បន្តជាមួយ Telegram'
      : language === 'zh'
      ? '使用 Telegram 继续'
      : 'Continue with Telegram';

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-[#229ED9]/40
                   bg-white text-gray-700 font-medium text-sm
                   hover:bg-[#229ED9] hover:text-white hover:border-[#229ED9]
                   active:bg-[#1E88C7]
                   dark:bg-surface-800 dark:border-surface-700 dark:text-gray-200
                   dark:hover:bg-[#229ED9] dark:hover:border-[#229ED9] dark:hover:text-white
                   transition-all duration-200 group shadow-sm"
      >
        <div className="w-5 h-5 rounded-full bg-[#229ED9] text-white flex items-center justify-center group-hover:bg-white group-hover:text-[#229ED9] transition-colors shrink-0">
          <Send className="w-3 h-3 ml-[-1px] mt-[1px]" />
        </div>
        <span>{label}</span>
      </button>

      <TelegramLoginModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        redirectTo={redirectTo}
      />
    </>
  );
}

