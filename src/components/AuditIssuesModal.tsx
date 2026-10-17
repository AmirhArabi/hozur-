import React from 'react';
import { AlertCircle, CheckCircle, Clock, Trash2, X } from 'lucide-react';
import { IncompleteRecordIssue, WorkInterval } from '../types';
import { toPersianDigits } from '../utils/jalali';

interface AuditIssuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: IncompleteRecordIssue[];
  intervals: WorkInterval[];
  onAutoFixCloseInterval: (intervalId: string, defaultCloseTime: string) => void;
  onDeleteInterval: (intervalId: string) => void;
  standardExitTime?: string;
}

export const AuditIssuesModal: React.FC<AuditIssuesModalProps> = ({
  isOpen,
  onClose,
  issues,
  onAutoFixCloseInterval,
  onDeleteInterval,
  standardExitTime = '15:30',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-950 dark:text-white">
                بررسی و ممیزی هوشمند ترددها
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {issues.length > 0
                  ? `${toPersianDigits(issues.length)} مورد نیازمند توجه شناسایی شد`
                  : 'تمامی ترددها مرتب و بدون اشکال هستند'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 no-scrollbar">
          {issues.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="font-bold text-sm text-neutral-900 dark:text-white">
                هیچ مغایرت یا تردد ناقصی یافت نشد!
              </p>
              <p className="text-xs text-neutral-500 max-w-xs">
                همه بازه‌های کاری، زمان‌های ورود و خروج به درستی و بدون هم‌پوشانی ثبت شده‌اند.
              </p>
            </div>
          ) : (
            issues.map((issue) => (
              <div
                key={issue.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  issue.severity === 'error'
                    ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40'
                    : 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 ${
                        issue.severity === 'error'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                      }`}
                    >
                      {issue.title}
                    </span>
                    <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                      تاریخ: {toPersianDigits(issue.date)}
                    </h4>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                      {issue.description}
                    </p>
                  </div>
                </div>

                {/* Quick actions for this issue */}
                {issue.intervalId && (
                  <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-800 flex items-center gap-2 justify-end">
                    {issue.type === 'open_past_interval' && (
                      <button
                        onClick={() => {
                          onAutoFixCloseInterval(issue.intervalId!, standardExitTime);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold active:scale-95 transition-all shadow-xs"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>بستن روی ساعت {toPersianDigits(standardExitTime)}</span>
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteInterval(issue.intervalId!)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-950/40 text-xs font-semibold active:scale-95 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف تردد</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-900/50 border-t border-neutral-100 dark:border-neutral-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-xs active:scale-98 transition-all"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
