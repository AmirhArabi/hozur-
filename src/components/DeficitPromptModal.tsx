import React from 'react';
import { AlertCircle, Check, Clock, X } from 'lucide-react';
import {
  formatMinutesToPersianHM,
  minutesToTimeString,
  timeStringToMinutes,
  toPersianDigits
} from '../utils/jalali';

interface DeficitPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  workMinutesToday: number;
  dailyQuotaMinutes: number;
  deficitMinutes: number;
  endTimeString: string;
  onConfirmWithLeave: (leaveStart: string, leaveEnd: string, durationMinutes: number) => void;
  onConfirmWithoutLeave: () => void;
}

export const DeficitPromptModal: React.FC<DeficitPromptModalProps> = ({
  isOpen,
  onClose,
  workMinutesToday,
  dailyQuotaMinutes,
  deficitMinutes,
  endTimeString,
  onConfirmWithLeave,
  onConfirmWithoutLeave
}) => {
  if (!isOpen) return null;

  const endM = timeStringToMinutes(endTimeString);
  const proposedLeaveEndM = endM + deficitMinutes;
  const proposedLeaveEndTimeString = minutesToTimeString(proposedLeaveEndM);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">
              <AlertCircle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-50">
              کسری کارکرد نسبت به موظفی
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Metrics */}
        <div className="py-4 space-y-3">
          <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
            کارکرد شما تا این لحظه کمتر از ساعت موظفی روزانه است و بیش از ۱۵ دقیقه کسری دارید:
          </p>

          <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 space-y-2 border border-neutral-200 dark:border-neutral-700/60">
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-500 dark:text-neutral-400">کارکرد امروز:</span>
              <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                {formatMinutesToPersianHM(workMinutesToday)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-500 dark:text-neutral-400">ساعت موظفی روزانه:</span>
              <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                {formatMinutesToPersianHM(dailyQuotaMinutes)}
              </span>
            </div>
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-between items-center text-xs">
              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                مقدار اختلاف (کسری کار):
              </span>
              <span className="font-mono font-bold text-sm text-neutral-950 dark:text-white underline decoration-2">
                {formatMinutesToPersianHM(deficitMinutes)}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 text-xs text-neutral-700 dark:text-neutral-300">
            <div className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              پیشنهاد ثبت مرخصی ساعتی:
            </div>
            <div>
              ثبت مرخصی از ساعت <span className="font-mono font-bold">{toPersianDigits(endTimeString)}</span> تا{' '}
              <span className="font-mono font-bold">{toPersianDigits(proposedLeaveEndTimeString)}</span> به مدت{' '}
              <span className="font-bold">{formatMinutesToPersianHM(deficitMinutes)}</span> جهت پر کردن سقف موظفی روزانه.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() =>
              onConfirmWithLeave(endTimeString, proposedLeaveEndTimeString, deficitMinutes)
            }
            className="w-full h-12 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-transform shadow-xs"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            ثبت پایان کار + ثبت مرخصی ساعتی
          </button>

          <button
            onClick={onConfirmWithoutLeave}
            className="w-full h-11 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold text-xs flex items-center justify-center active:scale-98 transition-transform"
          >
            ثبت پایان کار بدون مرخصی
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-center text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 font-medium"
          >
            انصراف (ادامه کارکرد)
          </button>
        </div>
      </div>
    </div>
  );
};
