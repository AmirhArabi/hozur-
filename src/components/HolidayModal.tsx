import React, { useState } from 'react';
import { Calendar, Check, X } from 'lucide-react';
import { OfficialHoliday } from '../types';
import { getCurrentJalaliDate, PERSIAN_MONTH_NAMES, toPersianDigits } from '../utils/jalali';

interface HolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddHoliday: (holiday: Omit<OfficialHoliday, 'id'>) => void;
}

export const HolidayModal: React.FC<HolidayModalProps> = ({
  isOpen,
  onClose,
  onAddHoliday
}) => {
  const today = getCurrentJalaliDate();
  const [title, setTitle] = useState('');
  const [month, setMonth] = useState(today.month);
  const [day, setDay] = useState(today.day);
  const [isRecurring, setIsRecurring] = useState(true);
  const [specificYear, setSpecificYear] = useState(today.year);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('عنوان تعطیلی را وارد کنید.');
      return;
    }

    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = isRecurring ? `${mm}/${dd}` : `${specificYear}/${mm}/${dd}`;

    onAddHoliday({
      date: dateStr,
      title: title.trim(),
      isRecurring
    });

    setTitle('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-4 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-50 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            افزودن روز تعطیل رسمی
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              عنوان تعطیلی
            </label>
            <input
              type="text"
              required
              placeholder="مثلاً: عید فطر، تاسوعا..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                ماه
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs font-semibold"
              >
                {PERSIAN_MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {toPersianDigits(idx + 1)} - {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                روز
              </label>
              <select
                value={day}
                onChange={(e) => setDay(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs font-semibold"
              >
                {Array.from({ length: 31 }).map((_, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {toPersianDigits(idx + 1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-neutral-800 dark:text-neutral-200">
              <input
                type="radio"
                name="recurring"
                checked={isRecurring}
                onChange={() => setIsRecurring(true)}
                className="text-neutral-900"
              />
              <span>تکرار هر سال در همین روز شمسی</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-neutral-800 dark:text-neutral-200">
              <input
                type="radio"
                name="recurring"
                checked={!isRecurring}
                onChange={() => setIsRecurring(false)}
                className="text-neutral-900"
              />
              <span>فقط مخصوص سال جاری ({toPersianDigits(specificYear)})</span>
            </label>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl border border-neutral-400 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-bold text-sm flex items-center justify-center gap-1.5 active:scale-98 transition-transform"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              ثبت تعطیلی
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
