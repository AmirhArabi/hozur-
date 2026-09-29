import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  formatJalaliDate,
  getCurrentJalaliDate,
  getJalaliDayOfWeek,
  getJalaliMonthDays,
  parseJalaliDate,
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEKDAYS_SHORT,
  toPersianDigits
} from '../utils/jalali';

interface JalaliDatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY/MM/DD
  onSelectDate: (dateStr: string) => void;
}

export const JalaliDatePickerModal: React.FC<JalaliDatePickerModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate
}) => {
  const parsed = parseJalaliDate(selectedDate);
  const [viewYear, setViewYear] = useState<number>(parsed.year);
  const [viewMonth, setViewMonth] = useState<number>(parsed.month);

  if (!isOpen) return null;

  const today = getCurrentJalaliDate();
  const todayStr = formatJalaliDate(today.year, today.month, today.day);

  const daysInMonth = getJalaliMonthDays(viewYear, viewMonth);
  const firstDayOfWeek = getJalaliDayOfWeek(viewYear, viewMonth, 1); // 0=Sat, 6=Fri

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear(viewYear - 1);
      setViewMonth(12);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear(viewYear + 1);
      setViewMonth(1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleGoToday = () => {
    setViewYear(today.year);
    setViewMonth(today.month);
    onSelectDate(todayStr);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-neutral-900 dark:text-neutral-50">
              انتخاب تاریخ شمسی
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Month & Year Navigation */}
        <div className="flex items-center justify-between py-3">
          <button
            onClick={handleNextMonth}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95"
            title="ماه بعد"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="font-bold text-base text-neutral-900 dark:text-neutral-100 tracking-tight">
            {PERSIAN_MONTH_NAMES[viewMonth - 1]} {toPersianDigits(viewYear)}
          </div>

          <button
            onClick={handlePrevMonth}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95"
            title="ماه قبل"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Day of Week Headers (Saturday to Friday) */}
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-neutral-400 dark:text-neutral-500 mb-1">
          {PERSIAN_WEEKDAYS_SHORT.map((w, idx) => (
            <div key={idx} className="py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells before day 1 */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const currentCellDate = formatJalaliDate(viewYear, viewMonth, dayNum);
            const isSelected = currentCellDate === selectedDate;
            const isToday = currentCellDate === todayStr;

            return (
              <button
                key={dayNum}
                onClick={() => {
                  onSelectDate(currentCellDate);
                  onClose();
                }}
                className={`h-10 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-bold scale-105'
                    : isToday
                    ? 'border-2 border-neutral-900 dark:border-white text-neutral-900 dark:text-neutral-100 font-bold'
                    : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {toPersianDigits(dayNum)}
              </button>
            );
          })}
        </div>

        {/* Footer: Quick Today button */}
        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
          <button
            onClick={handleGoToday}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
          >
            برو به امروز
          </button>
          <span className="text-xs text-neutral-500">
            امروز: {toPersianDigits(today.day)} {PERSIAN_MONTH_NAMES[today.month - 1]}
          </span>
        </div>
      </div>
    </div>
  );
};
