import React, { useState } from 'react';
import { Check, Clock, Trash2, X } from 'lucide-react';
import { LeaveRecord, LeaveType, WorkInterval } from '../types';
import {
  getCurrentTimeString,
  timeStringToMinutes,
  toPersianDigits
} from '../utils/jalali';
import { validateInterval } from '../utils/calculator';

interface IntervalModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  initialInterval?: WorkInterval | null;
  initialLeave?: LeaveRecord | null;
  existingIntervals: WorkInterval[];
  existingLeaves: LeaveRecord[];
  onSaveInterval: (interval: Omit<WorkInterval, 'id' | 'createdAt'>, id?: string) => void;
  onDeleteInterval?: (id: string) => void;
  onSaveLeave: (leave: Omit<LeaveRecord, 'id' | 'createdAt'>, id?: string) => void;
  onDeleteLeave?: (id: string) => void;
  dailyQuotaMinutes: number;
  defaultIsPrimary?: boolean;
}

export const IntervalModal: React.FC<IntervalModalProps> = ({
  isOpen,
  onClose,
  dateStr,
  initialInterval,
  initialLeave,
  existingIntervals,
  existingLeaves,
  onSaveInterval,
  onDeleteInterval,
  onSaveLeave,
  onDeleteLeave,
  dailyQuotaMinutes,
  defaultIsPrimary = false
}) => {
  const isEditing = Boolean(initialInterval || initialLeave);
  const initialMode = initialLeave ? 'leave' : 'work';

  const [mode, setMode] = useState<'work' | 'leave'>(initialMode);
  const [leaveType, setLeaveType] = useState<LeaveType>(initialLeave?.type || 'hourly');

  const [startTime, setStartTime] = useState<string>(
    initialInterval?.startTime || initialLeave?.startTime || '08:00'
  );
  const [endTime, setEndTime] = useState<string>(
    initialInterval?.endTime || initialLeave?.endTime || '16:30'
  );
  const [isOpenInterval, setIsOpenInterval] = useState<boolean>(
    initialInterval ? initialInterval.endTime === null : false
  );
  const [note, setNote] = useState<string>(
    initialInterval?.note || initialLeave?.note || ''
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSetCurrentTime = (target: 'start' | 'end') => {
    const curTime = getCurrentTimeString();
    if (target === 'start') {
      setStartTime(curTime);
    } else {
      setEndTime(curTime);
      setIsOpenInterval(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'work') {
      const finalEnd = isOpenInterval ? null : endTime;

      // Validate overlap against existing work intervals on this date
      const otherIntervals = existingIntervals.filter(
        (i) => i.date === dateStr && (!initialInterval || i.id !== initialInterval.id)
      );

      const validation = validateInterval(
        startTime,
        finalEnd,
        otherIntervals.map((i) => ({ id: i.id, startTime: i.startTime, endTime: i.endTime }))
      );

      if (!validation.isValid) {
        setError(validation.errorMessage || 'خطا در اعتبارسنجی بازه.');
        return;
      }

      onSaveInterval(
        {
          date: dateStr,
          startTime,
          endTime: finalEnd,
          note: note.trim() || undefined,
          isPrimary: initialInterval?.isPrimary ?? defaultIsPrimary
        },
        initialInterval?.id
      );
      onClose();
    } else {
      // Leave submission
      if (leaveType === 'full_day') {
        onSaveLeave(
          {
            date: dateStr,
            type: 'full_day',
            durationMinutes: dailyQuotaMinutes,
            note: note.trim() || undefined
          },
          initialLeave?.id
        );
        onClose();
      } else {
        // Hourly leave
        const sM = timeStringToMinutes(startTime);
        const eM = timeStringToMinutes(endTime);
        if (eM <= sM) {
          setError('ساعت پایان مرخصی باید بعد از ساعت شروع باشد.');
          return;
        }

        onSaveLeave(
          {
            date: dateStr,
            type: 'hourly',
            startTime,
            endTime,
            durationMinutes: eM - sM,
            note: note.trim() || undefined
          },
          initialLeave?.id
        );
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-50">
            {isEditing ? 'ویرایش ثبت' : 'ثبت جدید'}
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type Selector (if not editing an existing one) */}
        {!isEditing && (
          <div className="p-4 pb-0">
            <div className="grid grid-cols-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setMode('work')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'work'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                بازه کاری
              </button>
              <button
                type="button"
                onClick={() => setMode('leave')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'leave'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                مرخصی
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {mode === 'leave' && (
            <div className="grid grid-cols-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setLeaveType('hourly')}
                className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                  leaveType === 'hourly'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                مرخصی ساعتی
              </button>
              <button
                type="button"
                onClick={() => setLeaveType('full_day')}
                className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                  leaveType === 'full_day'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                مرخصی تمام‌روز
              </button>
            </div>
          )}

          {/* Time inputs for Work or Hourly Leave */}
          {(mode === 'work' || leaveType === 'hourly') && (
            <div className="space-y-3">
              {/* Start Time */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  ساعت شروع
                </label>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="flex-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleSetCurrentTime('start')}
                    className="px-3 py-2 rounded-xl text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 flex items-center gap-1 shrink-0 active:scale-95 transition-all"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    همین لحظه
                  </button>
                </div>
              </div>

              {/* End Time */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    ساعت پایان
                  </label>
                  {mode === 'work' && (
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer text-neutral-600 dark:text-neutral-400">
                      <input
                        type="checkbox"
                        checked={isOpenInterval}
                        onChange={(e) => setIsOpenInterval(e.target.checked)}
                        className="rounded-sm border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-0"
                      />
                      <span>در حال کار (بدون پایان)</span>
                    </label>
                  )}
                </div>

                {!isOpenInterval && (
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required={!isOpenInterval}
                      className="flex-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleSetCurrentTime('end')}
                      className="px-3 py-2 rounded-xl text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 flex items-center gap-1 shrink-0 active:scale-95 transition-all"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      همین لحظه
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === 'leave' && leaveType === 'full_day' && (
            <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              مرخصی تمام‌روز به اندازه کل ساعات موظفی روز ({toPersianDigits(Math.floor(dailyQuotaMinutes / 60))} ساعت و {toPersianDigits(dailyQuotaMinutes % 60)} دقیقه) ثبت می‌شود.
            </div>
          )}

          {/* Note Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              یادداشت (اختیاری)
            </label>
            <input
              type="text"
              placeholder="توضیحات یا عنوان پروژه..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-xl border border-neutral-400 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-neutral-100 font-medium">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 h-12 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-bold text-sm flex items-center justify-center gap-1.5 active:scale-98 transition-transform shadow-xs"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              ذخیره
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  if (initialInterval && onDeleteInterval) {
                    onDeleteInterval(initialInterval.id);
                  } else if (initialLeave && onDeleteLeave) {
                    onDeleteLeave(initialLeave.id);
                  }
                  onClose();
                }}
                className="w-12 h-12 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center hover:bg-neutral-300 dark:hover:bg-neutral-700 active:scale-95 transition-all"
                title="حذف"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
