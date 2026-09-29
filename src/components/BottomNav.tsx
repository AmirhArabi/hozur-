import React from 'react';
import { BarChart3, Clock, Settings } from 'lucide-react';
import { TabType } from '../types';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const tabs: Array<{ id: TabType; label: string; icon: typeof Clock }> = [
    { id: 'record', label: 'ثبت', icon: Clock },
    { id: 'stats', label: 'آمار', icon: BarChart3 },
    { id: 'settings', label: 'تنظیمات', icon: Settings }
  ];

  return (
    <nav
      role="navigation"
      aria-label="ناوبری اصلی"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 pb-safe transition-colors"
    >
      <div className="max-w-md mx-auto h-16 grid grid-cols-3 items-center px-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all min-h-[48px] ${
                isActive
                  ? 'text-neutral-950 dark:text-neutral-50 font-bold'
                  : 'text-neutral-400 dark:text-neutral-500 font-medium hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-all ${
                  isActive
                    ? 'bg-neutral-200/70 dark:bg-neutral-800'
                    : 'bg-transparent'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.75]'
                  }`}
                />
              </div>
              <span className={`text-[11px] mt-0.5 tracking-tight ${isActive ? 'font-bold' : 'font-normal'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
