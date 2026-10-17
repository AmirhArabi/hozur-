import React from 'react';
import { BarChart3, Clock, Settings } from 'lucide-react';
import { TabType } from '../types';
import { SoundService } from '../services/sound';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  soundEnabled?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab, soundEnabled = true }) => {
  const tabs: Array<{ id: TabType; label: string; icon: typeof Clock; color: string }> = [
    { id: 'record', label: 'ثبت تردد', icon: Clock, color: 'text-emerald-600 dark:text-emerald-400' },
    { id: 'stats', label: 'آمار و گزارش', icon: BarChart3, color: 'text-violet-600 dark:text-violet-400' },
    { id: 'settings', label: 'تنظیمات', icon: Settings, color: 'text-blue-600 dark:text-blue-400' }
  ];

  const handleTabClick = (tabId: TabType) => {
    if (tabId !== activeTab) {
      SoundService.playTap(soundEnabled);
      onChangeTab(tabId);
    }
  };

  return (
    <nav
      role="navigation"
      aria-label="ناوبری اصلی"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-lg border-t border-neutral-200/80 dark:border-neutral-800 pb-safe transition-colors"
    >
      <div className="max-w-md mx-auto h-16 grid grid-cols-3 items-center px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center py-1 rounded-2xl transition-all duration-200 min-h-[48px] relative ${
                isActive
                  ? 'text-neutral-950 dark:text-white font-bold'
                  : 'text-neutral-400 dark:text-neutral-500 font-medium hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              <div
                className={`px-4 py-1 rounded-2xl transition-all duration-200 flex items-center justify-center ${
                  isActive
                    ? 'bg-neutral-100 dark:bg-neutral-800 scale-105 shadow-2xs'
                    : 'bg-transparent'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? `scale-110 stroke-[2.4] ${tab.color}` : 'stroke-[1.8]'
                  }`}
                />
              </div>
              <span className={`text-[11px] mt-0.5 tracking-tight transition-colors ${isActive ? 'font-bold' : 'font-normal'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
