import React from 'react';
import { Calendar, Clock, Edit3, X } from 'lucide-react';
import { DayCalculationResult, LeaveRecord, WorkInterval } from '../types';
import {
  formatMinutesToPersianHM,
  PERSIAN_WEEKDAYS,
  toPersianDigits
} from '../utils/jalali';

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayResult: DayCalculationResult | null;
  intervals: WorkInterval[];
  leaves: LeaveRecord[];
  onGoToRecordDate: (dateStr: string) => void;
}

export const DayDetailsModal: React.FC<DayDetailsModalProps> = ({
  isOpen,
  onClose,
  dayResult,
  intervals,
  leaves,
  onGoToRecordDate
}) => {
  if (!isOpen || !dayResult) return null;

  const weekdayName = PERSIAN_WEEKDAYS[dayResult.dayOfWeekIndex];
  const dayIntervals = intervals.filter((i) => i.date === dayResult.date);
  const dayLeaves = leaves.filter((l) => l.date === dayResult.date);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <span className="text-xs text-neutral-500 font-medium">جزئیات روز</span>
            <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-50">
              {weekdayName}، {toPersianDigits(dayResult.date)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Day Status */}
        <div className="py-3">
          <div className="text-xs font-semibold text-neutral-500 mb-1">وضعیت تقویمی</div>
          <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-800 dark:text-neutral-200">
            {dayResult.isOfficialHoliday
              ? `تعطیل رسمی: ${dayResult.holidayTitle || 'رسمی'}`
              : dayResult.isWeeklyHoliday
              ? 'تعطیل هفتگی'
              : 'روز کاری عادی'}
          </div>
        </div>

        {/* Metric Summary */}
        <div className="grid grid-cols-3 gap-2 py-2">
          <div className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-center">
            <span className="text-[10px] text-neutral-500 block mb-0.5">کارکرد</span>
            <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
              {formatMinutesToPersianHM(dayResult.workMinutes)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-center">
            <span className="text-[10px] text-neutral-500 block mb-0.5">مرخصی</span>
            <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
              {formatMinutesToPersianHM(dayResult.leaveMinutes)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-center">
            <span className="text-[10px] text-neutral-500 block mb-0.5">اضافه‌کار</span>
            <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
              {formatMinutesToPersianHM(dayResult.overtimeMinutes)}
            </span>
          </div>
        </div>

        {/* Work Intervals List */}
        <div className="py-2">
          <span className="text-xs font-semibold text-neutral-500 block mb-1.5">
            بازه‌های ثبت شده ({toPersianDigits(dayIntervals.length)})
          </span>
          {dayIntervals.length === 0 ? (
            <div className="text-xs text-neutral-400 py-2">هیچ بازه کاری ثبت نشده است.</div>
          ) : (
            <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar">
              {dayIntervals.map((interval) => (
                <div
                  key={interval.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-mono"
                >
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-neutral-500" />
                    <span>
                      {toPersianDigits(interval.startTime)} تا{' '}
                      {interval.endTime ? toPersianDigits(interval.endTime) : 'در حال کار'}
                    </span>
                  </div>
                  {interval.note && (
                    <span className="text-[10px] text-neutral-500 font-sans truncate max-w-[100px]">
                      {interval.note}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leaves List */}
        {dayLeaves.length > 0 && (
          <div className="py-2">
            <span className="text-xs font-semibold text-neutral-500 block mb-1.5">
              مرخصی ({toPersianDigits(dayLeaves.length)})
            </span>
            <div className="space-y-1.5">
              {dayLeaves.map((l) => (
                <div
                  key={l.id}
                  className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs flex justify-between"
                >
                  <span>
                    {l.type === 'full_day'
                      ? 'مرخصی تمام‌روز'
                      : `مرخصی ساعتی (${toPersianDigits(l.startTime || '')} تا ${toPersianDigits(l.endTime || '')})`}
                  </span>
                  <span className="font-bold">{formatMinutesToPersianHM(l.durationMinutes)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 mt-2">
          <button
            onClick={() => {
              onGoToRecordDate(dayResult.date);
              onClose();
            }}
            className="w-full h-11 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-transform"
          >
            <Edit3 className="w-4 h-4 stroke-[2.5]" />
            مشاهده و ویرایش در تب ثبت
          </button>
        </div>
      </div>
    </div>
  );
};
