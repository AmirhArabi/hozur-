import React from 'react';
import { Calendar, Moon, Sun } from 'lucide-react';

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
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between gap-2">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          <img
            src="./icon.png"
            alt="hozur"
            className="w-7 h-7 rounded-xl object-contain shadow-xs border border-neutral-200 dark:border-neutral-700"
          />
          <span className="font-bold text-base tracking-tight text-neutral-950 dark:text-neutral-50 font-mono hidden xs:inline">
            hozur
          </span>
        </div>

        {/* Zone 2: Date metadata - بزرگ‌تر، پررنگ‌تر و تو چشم‌تر */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-950 dark:text-white shadow-2xs">
          <Calendar className="w-4 h-4 text-neutral-600 dark:text-neutral-300 shrink-0" />
          <span className="font-bold text-xs sm:text-sm tracking-tight select-none">
            {todayPersianDateString}
          </span>
        </div>

        {/* Zone 3: Theme toggle action */}
        <button
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'حالت روشن' : 'حالت تیره'}
          className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all shrink-0"
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
