'use client';

import { ChevronRight } from 'lucide-react';

type SettingsSection = 'core' | 'header' | 'homepage' | 'footer' | 'invoice';

interface SettingsSidebarProps {
  tx: Record<string, string>;
  isKhmer: boolean;
  activeSection: SettingsSection;
  onChangeSection: (section: SettingsSection) => void;
}

const sections: Array<{ id: SettingsSection; key: string }> = [
  { id: 'core', key: 'core' },
  { id: 'header', key: 'header' },
  { id: 'homepage', key: 'homepage' },
  { id: 'footer', key: 'footer' },
  { id: 'invoice', key: 'invoice' },
];

export default function SettingsSidebar({
  tx,
  isKhmer,
  activeSection,
  onChangeSection,
}: SettingsSidebarProps) {
  return (
    <aside className="lg:sticky lg:top-24 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-surface-900 p-4">
      <p className="px-2 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">{tx.settingsSections}</p>
      <p className="px-2 pb-3 text-[11px] text-gray-400">{tx.sectionTip}</p>

      <div className="space-y-1.5">
        {sections.map((section) => {
          const active = activeSection === section.id;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onChangeSection(section.id)}
              className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-sm transition ${
                active
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-surface-800'
              }`}
            >
              <span className={isKhmer ? 'font-medium' : 'font-medium tracking-tight'}>{tx[section.key]}</span>
              <ChevronRight className={`w-4 h-4 transition ${active ? 'opacity-100' : 'opacity-40'}`} />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
