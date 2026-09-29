import React from 'react';
import { Moon, Sun } from 'lucide-react';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  todayPersianDateString: string;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  todayPersianDateString
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 transition-colors pt-safe">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2">
          <img src="./icon.png" alt="hozur" className="w-6 h-6 rounded-lg object-contain shadow-xs" />
          <span className="font-bold text-base tracking-tight text-neutral-900 dark:text-neutral-50 font-mono">
            hozur
          </span>
        </div>

        {/* Zone 2: Date metadata */}
        <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          {todayPersianDateString}
        </div>

        {/* Zone 3: Theme toggle action */}
        <button
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'حالت روشن' : 'حالت تیره'}
          className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 stroke-[2]" />
          ) : (
            <Moon className="w-5 h-5 stroke-[2]" />
          )}
        </button>
      </div>
    </header>
  );
};
